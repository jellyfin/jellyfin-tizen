#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# build-wgt.sh — Build Jellyfin.wgt
#
# Usage:
#   docker run --rm \
#     -v "$(pwd)/certs/author.p12:/certs/author.p12:ro" \
#     -v "$(pwd)/certs/distributor.p12:/certs/distributor.p12:ro" \
#     -v "$(pwd)/build:/build" \
#     -v "$(pwd)/output:/output" \
#     jellyfin-tizen /build-wgt.sh
#
# build/ layout (persisted across runs):
#   build/repos/   ← git repos + node_modules (auto-managed, speeds up rebuilds)
#
# Optional env vars:
#   JELLYFIN_VERSION — e.g. 10.11.6  (default: 10.11.6)
#   WEB_BRANCH       — override jellyfin-web branch/tag explicitly
#   TIZEN_BRANCH     — jellyfin-tizen branch/tag (default: master)
#   CERT_PASS        — .p12 password (default: tizen)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BUILD_ROOT="${BUILD_ROOT:-/build}"
REPOS_DIR="$BUILD_ROOT/repos"

JELLYFIN_VERSION="${JELLYFIN_VERSION:-10.11.6}"
_VER_MM=$(echo "$JELLYFIN_VERSION" | cut -d. -f1,2)
WEB_BRANCH="${WEB_BRANCH:-release-${_VER_MM}.z}"
TIZEN_BRANCH="${TIZEN_BRANCH:-master}"
OUTPUT_DIR="${OUTPUT_DIR:-/output}"

# Cert paths
AUTHOR_CERT="${AUTHOR_CERT:-/certs/author.p12}"
DIST_CERT="${DIST_CERT:-/certs/distributor.p12}"
CERT_PASS="${CERT_PASS:-tizen}"
DIST_CERT_PASS="${DIST_CERT_PASS:-$CERT_PASS}"

# Validate CERT_PASS — must be non-empty and contain no whitespace/newlines
[ -z "$CERT_PASS" ] && die "CERT_PASS is empty. Pass it with: read -rsp 'Password: ' CERT_PASS && export CERT_PASS"
case "$CERT_PASS" in
    *' '*|*$'\t'*|*$'\n'*|*$'\r'*)
        die "CERT_PASS contains whitespace or newlines — check how you set it (use read -rsp, not echo)" ;;
esac

export NODE_OPTIONS="--max-old-space-size=4096"

log() { echo ""; echo "==> $*"; }
die() { echo ""; echo "ERROR: $*" >&2; exit 1; }

# ── Ensure repos cache dir exists ────────────────────────────────────────
mkdir -p "$REPOS_DIR"

clone_or_update() {
    local repo="$1" branch="$2" dir="$3"
    if [ -d "$dir/.git" ]; then
        local current
        current=$(git -C "$dir" rev-parse HEAD 2>/dev/null || true)
        log "Updating $dir to $branch …"
        git -C "$dir" fetch --depth 1 origin "$branch"
        git -C "$dir" checkout FETCH_HEAD
        local updated
        updated=$(git -C "$dir" rev-parse HEAD 2>/dev/null || true)
        if [ "$current" = "$updated" ]; then
            echo "    (no changes — using cached build)"
        fi
    else
        log "Cloning $repo (branch: $branch) …"
        git clone --depth 1 -b "$branch" "$repo" "$dir"
    fi
}

npm_install() {
    local extra_env="${1:-}"
    if [ -d node_modules ] && [ -f package-lock.json ] && [ package-lock.json -ot node_modules ]; then
        echo "==> node_modules up to date — skipping install"
    else
        log "Installing npm dependencies…"
        env $extra_env npm ci --no-audit --prefer-offline 2>/dev/null \
            || env $extra_env npm ci --no-audit
    fi
}

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Jellyfin Tizen — Step 2: Build WGT"
echo "════════════════════════════════════════════════════════════"
echo "  jellyfin version : $JELLYFIN_VERSION"
echo "  jellyfin-web     : $WEB_BRANCH"
echo "  jellyfin-tizen   : $TIZEN_BRANCH"
echo "  build cache      : $BUILD_ROOT"
echo "  Output           : $OUTPUT_DIR/Jellyfin.wgt"
echo "════════════════════════════════════════════════════════════"

# ── Certificate profile ────────────────────────────────────────────────────
[ -f "$AUTHOR_CERT" ] || die "Author cert not found at $AUTHOR_CERT"
[ -f "$DIST_CERT"   ] || die "Distributor cert not found at $DIST_CERT"

# Tizen's signing library (LinuxCrypt.java) stores passwords via the bundled
# secret-tool binary using the .p12 file path as keyfile key. The certs must
# be in a writable directory so Tizen can write the profiles.xml path entry;
# passwords are then stored explicitly via secret-tool store (see below).
CERT_DIR=$(mktemp -d /tmp/certs_XXXXXX)
trap 'rm -rf "$CERT_DIR"' EXIT

AUTHOR_TMP="$CERT_DIR/author.p12"
DIST_TMP="$CERT_DIR/distributor.p12"
cp "$AUTHOR_CERT" "$AUTHOR_TMP"
cp "$DIST_CERT"   "$DIST_TMP"
echo "==> Certs copied to writable dir: $CERT_DIR"

CERT_PROFILE="SamsungProfile"
log "Registering certificate profile…"
ADD_OUTPUT=$(tizen security-profiles add \
    -n "$CERT_PROFILE" \
    -a "$AUTHOR_TMP" -p "$CERT_PASS" \
    -d "$DIST_TMP"   -dp "${DIST_CERT_PASS:-$CERT_PASS}" 2>&1) || true
echo "$ADD_OUTPUT"
echo "$ADD_OUTPUT" | grep -qi "succeed\|Loaded in" \
    || die "tizen security-profiles add failed — see output above"

_xml_hint=$(echo "$ADD_OUTPUT" | grep -oP '(?<=profiles\.path=)[^\s"]+' | head -1)
PROFILES_XML="${_xml_hint:-${TIZEN_SDK_DATA:-/home/builder/tizen-studio-data}/profile/profiles.xml}"

echo "==> profiles.xml as written by Tizen:"
cat "$PROFILES_XML"

# LinuxCrypt.java (the signing library) stores/retrieves .p12 passwords via the
# bundled secret-tool binary. Its encrypt() method runs in a background Thread
# that races with JVM exit — so 'security-profiles add' may return before the
# password is actually persisted. We call secret-tool store directly here after
# parsing the keyfile paths from profiles.xml, guaranteeing the passwords are
# available when 'tizen package' later calls secret-tool lookup.
ST="${TIZEN_SDK:-/home/builder/tizen-studio}/tools/certificate-encryptor/secret-tool"

AUTHOR_PWD=$(grep 'distributor="0"' "$PROFILES_XML" | grep -oP 'password="\K[^"]+')
DIST_PWD=$(grep   'distributor="1"' "$PROFILES_XML" | grep -oP 'password="\K[^"]+')
[ -n "$AUTHOR_PWD" ] || die "Could not find author password path in profiles.xml"
[ -n "$DIST_PWD"   ] || die "Could not find distributor password path in profiles.xml"

"$ST" store --label="tizen-studio" --password "$CERT_PASS"                    keyfile "$AUTHOR_PWD" tool certificate-manager
"$ST" store --label="tizen-studio" --password "${DIST_CERT_PASS:-$CERT_PASS}" keyfile "$DIST_PWD"   tool certificate-manager
echo "==> Passwords stored: $AUTHOR_PWD  $DIST_PWD"

tizen cli-config "profiles.path=$PROFILES_XML"
echo "==> CLI profiles path set to: $PROFILES_XML"

# ── Clone / update source repos ───────────────────────────────────────────
cd "$REPOS_DIR"

clone_or_update \
    "https://github.com/jellyfin/jellyfin-web.git" \
    "$WEB_BRANCH" \
    "jellyfin-web"

clone_or_update \
    "https://github.com/jellyfin/jellyfin-tizen.git" \
    "$TIZEN_BRANCH" \
    "jellyfin-tizen"

# ── Build jellyfin-web ─────────────────────────────────────────────────────
log "Building jellyfin-web…"
cd jellyfin-web
npm_install
USE_SYSTEM_FONTS=1 npm run build:production
cd ..

# ── Prepare jellyfin-tizen interface ──────────────────────────────────────
log "Preparing jellyfin-tizen interface…"
cd jellyfin-tizen
npm_install "JELLYFIN_WEB_DIR=../jellyfin-web/dist"

# ── Build WGT ─────────────────────────────────────────────────────────────
log "Running tizen build-web…"
tizen build-web \
    -e ".*" \
    -e gulpfile.babel.js \
    -e README.md \
    -e "node_modules/*" \
    -e "package*.json" \
    -e "yarn.lock"

log "Signing and packaging WGT…"
tizen package -t wgt -s "$CERT_PROFILE" -o . -- .buildResult || {
    echo ""
    echo "  ERROR: tizen package failed. CLI log:"
    echo "  ─────────────────────────────────────"
    cat /home/builder/tizen-studio-data/cli/logs/cli.log 2>/dev/null || echo "  (log not found)"
    exit 1
}

# ── Copy output ───────────────────────────────────────────────────────────
WGT="$(find . -maxdepth 1 -name "*.wgt" | head -1)"
[ -n "$WGT" ] || die "No .wgt file produced."

mkdir -p "$OUTPUT_DIR"
cp "$WGT" "$OUTPUT_DIR/Jellyfin.wgt"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  DONE — output/Jellyfin.wgt is ready"
echo "════════════════════════════════════════════════════════════"
echo ""

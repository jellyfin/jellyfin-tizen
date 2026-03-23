#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# create-certs.sh — Samsung Certificate Creator (browser-based GUI via noVNC)
#
# Usage:
#   mkdir -p certs cache data
#   docker run -it --rm \
#     -e TV_DUID="YOUR_TV_DUID" \
#     -p 6080:6080 \
#     -v ./certs:/certs \
#     -v ./cache:/cache \
#     -v ./data:/home/builder/tizen-studio-data \
#     jellyfin-tizen /create-certs.sh
#
# ./cache  — caches the 663 MB installer so the download is skipped next run.
# ./data   — persists keystore/profiles across runs.
# No ./sdk volume needed — the IDE installs fresh each run (fast after download).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

# TV_DUID may be a single ID or a comma-separated list for multiple TVs:
#   -e TV_DUID="DUID1"
#   -e TV_DUID="DUID1,DUID2,DUID3"
TV_DUID="${TV_DUID:?ERROR: set -e TV_DUID=YOUR_TV_DUID  (comma-separate multiple DUIDs)}"

NOVNC_PORT="${NOVNC_PORT:-6080}"
TIZEN_VERSION="${TIZEN_VERSION:-6.0}"
export DISPLAY=:1
SDK_ROOT=""  # populated after IDE install; used by find_in_sdk

# Write DUIDs to /certs/duids.txt immediately so it's available even if the
# run doesn't complete (e.g. user needs to reference them during the wizard).
mkdir -p /certs
{
    printf '# DUIDs for distributor cert — generated %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')"
    echo "$TV_DUID" | tr ',' '\n' | sed 's/^[[:space:]]*//' | grep -v '^$'
} > /certs/duids.txt
echo "==> DUIDs saved to ./certs/duids.txt"

find_bin() {
    local result
    result=$(find /home/builder -maxdepth 8 -name "$1" 2>/dev/null | head -1)
    echo "$result"
}

find_in_sdk() {
    # Search within the detected SDK root, fall back to all of /home/builder
    local result
    if [ -n "${SDK_ROOT:-}" ]; then
        result=$(find "$SDK_ROOT" -maxdepth 6 -name "$1" 2>/dev/null | head -1)
    fi
    if [ -z "$result" ]; then
        result=$(find /home/builder -maxdepth 8 -name "$1" 2>/dev/null | head -1)
    fi
    echo "$result"
}

# ── Step 1: Start virtual display + window manager ───────────────────────────
echo "==> Starting virtual display..."
Xvfb :1 -screen 0 1280x900x24 -nolisten tcp &
sleep 2
fluxbox &
sleep 1

# ── Step 2: Start VNC + noVNC early so user can connect ──────────────────────
x11vnc -display :1 -forever -nopw -quiet -bg
sleep 1
websockify --web=/usr/share/novnc "$NOVNC_PORT" localhost:5900 &
sleep 1

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Open this URL in your browser NOW:"
echo ""
echo "       http://localhost:$NOVNC_PORT/vnc.html"
echo ""
echo "  All GUI interaction happens in the browser."
echo "════════════════════════════════════════════════════════════"
echo ""

# ── Step 3: Obtain the installer binary (from cache or download) ─────────────
INSTALLER_URL="https://download.tizen.org/sdk/Installer/tizen-studio_${TIZEN_VERSION}/web-ide_Tizen_Studio_${TIZEN_VERSION}_ubuntu-64.bin"
CACHE_BIN="/cache/web-ide_Tizen_Studio_${TIZEN_VERSION}_ubuntu-64.bin"

if [ -f "$CACHE_BIN" ]; then
    echo "==> Using cached installer: $CACHE_BIN"
    cp "$CACHE_BIN" /tmp/tizen-ide.bin
else
    echo "==> Downloading Tizen Studio IDE (~663 MB)..."
    echo "    Will be saved to ./cache — next run skips this download."
    echo ""
    mkdir -p /cache
    wget -nv "$INSTALLER_URL" -O /tmp/tizen-ide.bin 2>&1
    cp /tmp/tizen-ide.bin "$CACHE_BIN" 2>/dev/null \
        && echo "==> Installer saved to cache." \
        || echo "    (cache save failed — ./cache may not be mounted, will re-download next run)"
fi
chmod +x /tmp/tizen-ide.bin

# ── Step 4: Run the installer ────────────────────────────────────────────────
echo ""
echo "  ┌───────────────────────────────────────────────────────────┐"
echo "  │  The Tizen Studio INSTALLER is open in your browser.     │"
echo "  │                                                           │"
echo "  │  1. Accept license → Next                                │"
echo "  │  2. Keep the default path: /home/builder/tizen-studio    │"
echo "  │     → click Install                                       │"
echo "  │  3. Wait for the progress bar to finish                  │"
echo "  │  4. UNCHECK 'Launch Package Manager' → click Finish      │"
echo "  │                                                           │"
echo "  │  After Finish the installer closes — wait a few seconds. │"
echo "  └───────────────────────────────────────────────────────────┘"
echo ""

/tmp/tizen-ide.bin &

# Poll for sdk.info in the IDE install dir. The web-CLI also creates sdk.info
# at /home/builder/tizen-studio/sdk.info, so we exclude it by checking that
# the result is NOT /home/builder/tizen-studio (the pre-existing web-cli path).
# The IDE installer writes a NEW sdk.info in whichever path the user chose.
echo "==> Waiting for IDE installation to complete..."
INSTALL_START=$(date +%s)
LAST_LOG=0
while true; do
    elapsed=$(( $(date +%s) - INSTALL_START ))
    # Find sdk.info files, skip the one already there from web-cli (tizen-studio)
    FOUND=$(find /home/builder -maxdepth 3 -name "sdk.info" 2>/dev/null \
        | grep -v "^/home/builder/tizen-studio/sdk.info$" \
        | grep -v "tools/sdk.info" | head -1)
    if [ -n "$FOUND" ]; then
        SDK_ROOT=$(dirname "$FOUND")
        echo "    ✓ IDE installed after ${elapsed}s  (SDK at $SDK_ROOT)"
        break
    fi
    # Also detect if user installed to the default path (tizen-studio) by
    # checking for ide/ subdir (only web-IDE creates it there)
    if [ -d "/home/builder/tizen-studio/ide" ]; then
        SDK_ROOT="/home/builder/tizen-studio"
        echo "    ✓ IDE installed to default path after ${elapsed}s"
        break
    fi
    if [ $elapsed -ge 900 ]; then
        echo "    ✗ TIMEOUT after ${elapsed}s"
        echo "  Contents of /home/builder/:"
        ls /home/builder/ 2>/dev/null
        echo "  VNC is still running. Press Ctrl+C to abort."
        sleep infinity
    fi
    if [ $(( elapsed - LAST_LOG )) -ge 15 ]; then
        echo "    ... still installing (${elapsed}s elapsed)"
        LAST_LOG=$elapsed
    fi
    sleep 3
done
rm -f /tmp/tizen-ide.bin

# Find the IDE binary relative to the detected SDK root
IDE_BIN=$(find_in_sdk "TizenStudio")
[ -z "$IDE_BIN" ] && IDE_BIN=$(find_in_sdk "TizenStudio.sh")
[ -z "$IDE_BIN" ] && IDE_BIN=$(find "$SDK_ROOT/ide" -maxdepth 3 -name "eclipse" 2>/dev/null | head -1 || true)
echo "==> SDK_ROOT: $SDK_ROOT"
echo "==> IDE_BIN:  ${IDE_BIN:-(not found)}"

# ── Step 5: Install cert-add-on + TV-6.0 (first run only) ───────────────────
CERT_JAR=$(find /home/builder -name "org.tizen.common.cert_*.jar" 2>/dev/null | head -1 || true)
if [ -z "$CERT_JAR" ]; then
    PKG_MGR=$(find_in_sdk "package-manager-cli.bin")
    if [ -n "$PKG_MGR" ]; then
        echo "==> Installing cert-add-on + TV-6.0 extensions..."
        "$PKG_MGR" install --accept-license cert-add-on TV-6.0 2>&1 \
            || "$PKG_MGR" install --accept-license cert-add-on 2>&1 \
            || echo "WARNING: package install returned non-zero"
        CERT_JAR=$(find /home/builder -name "org.tizen.common.cert_*.jar" 2>/dev/null | head -1 || true)
        [ -n "$CERT_JAR" ] && echo "==> cert-add-on ready: $CERT_JAR" \
            || echo "WARNING: cert-add-on jar not found after install"
    else
        echo "WARNING: package-manager-cli.bin not found — cert-add-on skipped"
    fi
else
    echo "==> cert-add-on already installed: $CERT_JAR"
fi

# ── Step 6: Launch Certificate Manager or full IDE ───────────────────────────
# cert-add-on installs Certificate Manager as an Eclipse RCP app under
# tools/certificate-manager/. Find the first executable binary there.
CERT_MGR_DIR=$(find /home/builder -type d -name "certificate-manager" \
    -not -path "*/plugins/*" 2>/dev/null | head -1 || true)
CERT_MGR_BIN=""
if [ -n "$CERT_MGR_DIR" ]; then
    echo "==> Certificate Manager dir: $CERT_MGR_DIR"
    echo "    Contents: $(ls "$CERT_MGR_DIR" 2>/dev/null | tr '\n' ' ')"
    # Find first executable file or symlink directly in that dir (not in plugins/)
    CERT_MGR_BIN=$(find "$CERT_MGR_DIR" -maxdepth 1 \( -type f -o -type l \) -perm /111 2>/dev/null | head -1 || true)
fi

# Re-confirm IDE_BIN; search in SDK_ROOT/ide/ since that's where the launcher is
[ -z "${IDE_BIN:-}" ] && IDE_BIN=$(find "${SDK_ROOT}/ide" -maxdepth 2 -name "TizenStudio" 2>/dev/null | head -1 || true)
[ -z "${IDE_BIN:-}" ] && IDE_BIN=$(find "${SDK_ROOT}/ide" -maxdepth 2 -name "eclipse" 2>/dev/null | head -1 || true)
[ -z "${IDE_BIN:-}" ] && IDE_BIN=$(find /home/builder -maxdepth 8 -name "TizenStudio" 2>/dev/null | head -1 || true)

echo "==> SDK_ROOT:     $SDK_ROOT"
echo "==> IDE_BIN:      ${IDE_BIN:-(not found)}"
echo "==> CERT_MGR_BIN: ${CERT_MGR_BIN:-(not found)}"

if [ -n "$CERT_MGR_BIN" ]; then
    echo "==> Launching Certificate Manager: $CERT_MGR_BIN"
    LAUNCH_BIN="$CERT_MGR_BIN"
elif [ -n "$IDE_BIN" ]; then
    echo "==> Launching full Tizen Studio IDE: $IDE_BIN"
    echo "    In the IDE: Tools → Certificate Manager"
    LAUNCH_BIN="$IDE_BIN"
else
    echo ""
    echo "  ERROR: Neither Certificate Manager nor TizenStudio binary found."
    echo "  Contents of /home/builder/:"
    ls /home/builder/ 2>/dev/null
    echo "  Contents of SDK_ROOT=${SDK_ROOT:-unknown}/tools/ (if exists):"
    ls "${SDK_ROOT:-/home/builder/tizen-studio}/tools/" 2>/dev/null || true
    echo "  VNC is still running — inspect in your browser. Press Ctrl+C to abort."
    sleep infinity
fi

"$LAUNCH_BIN" &
LAUNCH_PID=$!

echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  Certificate Manager is opening in your browser.       │"
echo "  │                                                         │"
echo "  │  Click  +  → Samsung → TV  and follow the wizard:      │"
echo "  │    1. Create author cert → sign in with Samsung account │"
echo "  │    2. Create distributor cert → enter the DUID(s) below │"
echo "  │                                                         │"
echo "  │  When finished, certs are copied automatically.        │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
echo "  TV DUID(s) — enter each in the distributor cert wizard:"
echo "$TV_DUID" | tr ',' '\n' | sed 's/^[[:space:]]*//' | grep -v '^$' | \
    while IFS= read -r duid; do echo "    • $duid"; done
echo ""

# ── Step 7: Watch for .p12 files ─────────────────────────────────────────────
chmod 777 /certs 2>/dev/null || true
mkdir -p /certs

# Helper: find any .p12 matching *author* or *Author* under /home/builder
find_p12() {
    local pattern="$1"
    find /home/builder /certs -iname "${pattern}.p12" 2>/dev/null \
        | grep -v "^/certs/" | head -1 || true
}

echo "==> Watching for certificates (polling every 3s, no timeout)..."
echo "    Searching under /home/builder for any *.p12 files..."
WATCH_START=$(date +%s)
LAST_WATCH_LOG=0
WARNED=0
while true; do
    # Search directly by exact filename first (most reliable)
    AUTHOR=$(find /home/builder -name "author.p12"      2>/dev/null | head -1 || true)
    DIST=$(  find /home/builder -name "distributor.p12" 2>/dev/null | head -1 || true)

    # Fallback: any .p12 classified by path keyword
    if [ -z "$AUTHOR" ] || [ -z "$DIST" ]; then
        ALL_P12=$(find /home/builder -name "*.p12" 2>/dev/null || true)
        [ -z "$AUTHOR" ] && AUTHOR=$(echo "$ALL_P12" | grep -i "author"      | head -1 || true)
        [ -z "$DIST"   ] && DIST=$(  echo "$ALL_P12" | grep -i "distributor" | head -1 || true)
        # Last resort: take first two .p12 files found
        if [ -z "$AUTHOR" ] && [ -z "$DIST" ] && [ -n "$ALL_P12" ]; then
            AUTHOR=$(echo "$ALL_P12" | sed -n '1p')
            DIST=$(  echo "$ALL_P12" | sed -n '2p')
        fi
    fi

    if [ -n "$AUTHOR" ] && [ -n "$DIST" ]; then
        echo ""
        echo "==> Certificates found — copying to /certs..."
        echo "    author:      $AUTHOR"
        echo "    distributor: $DIST"
        cp "$AUTHOR" /certs/author.p12
        cp "$DIST"   /certs/distributor.p12
        # Save DUIDs used for this cert to certs/duids.txt
        printf '%s\n' "# DUIDs used to generate distributor cert on $(date -u '+%Y-%m-%d %H:%M UTC')" > /certs/duids.txt
        echo "$TV_DUID" | tr ',' '\n' | sed 's/^[[:space:]]*//' | grep -v '^$' >> /certs/duids.txt
        # Backup entire SamsungCertificate directory
        if [ -d "/home/builder/SamsungCertificate" ]; then
            echo "==> Backing up ~/SamsungCertificate to /certs/SamsungCertificate/..."
            cp -r /home/builder/SamsungCertificate /certs/SamsungCertificate
        fi
        # Backup tizen-studio-data keystore (profiles + keystores)
        if [ -d "/home/builder/tizen-studio-data/keystore" ]; then
            echo "==> Backing up tizen-studio-data/keystore to /certs/keystore/..."
            cp -r /home/builder/tizen-studio-data/keystore /certs/keystore
        fi
        if [ -d "/home/builder/tizen-studio-data/profile" ]; then
            echo "==> Backing up tizen-studio-data/profile to /certs/profile/..."
            cp -r /home/builder/tizen-studio-data/profile /certs/profile
        fi
        echo ""
        echo "════════════════════════════════════════════════════════════"
        echo "  DONE"
        echo "  certs/author.p12"
        echo "  certs/distributor.p12"
        echo "  certs/duids.txt            (DUIDs used)"
        echo "  certs/SamsungCertificate/  (full backup)"
        echo "  certs/keystore/            (tizen keystore backup)"
        echo ""
        echo "  Next: docker run ... jellyfin-tizen /build-wgt.sh"
        echo "════════════════════════════════════════════════════════════"
        echo ""
        kill $LAUNCH_PID 2>/dev/null || true
        break
    elif [ -n "$AUTHOR" ]; then
        echo "    ... author cert found, still waiting for distributor cert..."
    fi

    elapsed=$(( $(date +%s) - WATCH_START ))
    if [ $elapsed -ge 600 ] && [ $WARNED -eq 0 ]; then
        WARNED=1
        echo ""
        echo "  NOTE: 10 minutes elapsed — still watching."
        echo "  .p12 files currently found under /home/builder:"
        find /home/builder -name "*.p12" 2>/dev/null || echo "    (none yet)"
        echo "  Take your time — complete the wizard then click Finish."
        echo ""
    fi
    if [ $(( elapsed - LAST_WATCH_LOG )) -ge 30 ] && [ $elapsed -gt 5 ]; then
        echo "    ... waiting for Certificate Manager wizard to complete (${elapsed}s)"
        LAST_WATCH_LOG=$elapsed
    fi
    sleep 3
done


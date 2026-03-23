#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# install-wgt.sh — Connect to a Samsung TV in developer mode and install WGT
#
# Usage:
#   docker run --rm --network host \
#     -e TV_IP="192.168.1.100" \
#     -v "$(pwd)/output:/output" \
#     jellyfin-tizen /install-wgt.sh
#
# Required env vars:
#   TV_IP      — TV IP address (also accepted as TV_HOST)
#
# Optional env vars:
#   TV_PORT    — SDB port on the TV (default: 26101)
#   WGT_FILE   — path inside the container to the .wgt (default: /output/Jellyfin.wgt)
#   CONNECT_TIMEOUT — seconds to wait for sdb 'device' state (default: 15)
#
# TV prerequisites (Samsung):
#   Apps → 12345 on remote → Enable Developer Mode → enter this machine's IP → reboot TV
#   Developer mode must be re-enabled after every TV power cycle.
#
# Networking:
#   Requires --network host on a LINUX host to reach LAN devices.
#   macOS Docker Desktop runs containers inside a LinuxKit VM — VPNKit does not
#   proxy RFC1918 LAN traffic from the VM to the Mac's NIC, so the container
#   cannot reach a TV on the LAN regardless of --network host.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TV_IP="${TV_IP:-${TV_HOST:-}}"
TV_PORT="${TV_PORT:-26101}"
WGT_FILE="${WGT_FILE:-/output/Jellyfin.wgt}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-15}"

log()  { echo ""; echo "==> $*"; }
die()  { echo ""; echo "ERROR: $*" >&2; exit 1; }
warn() { echo "WARN: $*" >&2; }

[ -n "$TV_IP"    ] || die "TV_IP is not set. Pass it with: -e TV_IP=<your-tv-ip>"
[ -f "$WGT_FILE" ] || die "WGT file not found: $WGT_FILE (mount your output dir with -v)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Jellyfin Tizen — Step 3: Install on TV"
echo "════════════════════════════════════════════════════════════"
echo "  TV address  : ${TV_IP}:${TV_PORT}"
echo "  WGT file    : $WGT_FILE"
echo "  Timeout     : ${CONNECT_TIMEOUT}s"
echo "════════════════════════════════════════════════════════════"

# ── Connect via sdb ───────────────────────────────────────────────────────────
log "Connecting via sdb …"
sdb kill-server 2>/dev/null || true
sleep 1
CONNECT_OUT=$(sdb connect "${TV_IP}:${TV_PORT}" 2>&1)
echo "    $CONNECT_OUT"

if echo "$CONNECT_OUT" | grep -qi "error\|failed"; then
    echo ""
    echo "  ERROR: sdb connect failed: $CONNECT_OUT"
    echo ""
    echo "  On Linux hosts: ensure developer mode is active on the TV:"
    echo "    Apps → 12345 → Enable Developer Mode → enter host LAN IP → reboot TV"
    echo "  On macOS Docker Desktop: containers cannot reach LAN devices even with"
    echo "    --network host (VPNKit VM limitation). Run tizen install natively or"
    echo "    use a Linux host."
    exit 1
fi

# ── Wait for 'device' state ───────────────────────────────────────────────────
log "Waiting for TV to be ready (up to ${CONNECT_TIMEOUT}s) …"
WAITED=0
STATE=""
while [ "$WAITED" -lt "$CONNECT_TIMEOUT" ]; do
    STATE=$(sdb devices 2>/dev/null | awk -v ip="${TV_IP}:${TV_PORT}" '$0 ~ ip { print $2 }')
    case "$STATE" in
        device)   break ;;
        offline)  warn "Device shows 'offline' — still waiting …" ;;
        locked)   warn "Device shows 'locked' — still waiting …" ;;
    esac
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ "$STATE" != "device" ]; then
    echo ""
    echo "  ERROR: TV did not reach 'device' state after ${CONNECT_TIMEOUT}s (last state: '${STATE:-none}')."
    echo ""
    sdb devices 2>/dev/null || true
    echo ""
    echo "  If state is 'offline': the TV accepted the connection but sdb handshake failed."
    echo "    → Check the IP entered in Developer Mode matches this machine's LAN IP."
    echo "  If state is empty: sdb could not connect at all."
    echo "    → Verify TCP connectivity: port ${TV_PORT} must be reachable."
    exit 1
fi

log "Connected. Devices:"
sdb devices

# ── Determine serial ──────────────────────────────────────────────────────────
SERIAL=$(sdb devices 2>/dev/null | awk -v ip="${TV_IP}:${TV_PORT}" '$0 ~ ip { print $1 }' | head -1)
[ -n "$SERIAL" ] || die "Could not determine sdb serial for ${TV_IP}"
echo "    Serial: $SERIAL"

# ── Install ───────────────────────────────────────────────────────────────────
log "Installing $(basename "$WGT_FILE") …"
tizen install -n "$WGT_FILE" -s "$SERIAL" 2>&1

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  DONE — Jellyfin installed on ${TV_IP}"
echo "════════════════════════════════════════════════════════════"
echo ""

#!/bin/bash
# Tizen Studio secret-tool replacement — file-based storage, no D-Bus required.
#
# LinuxCrypt.java (org.tizen.common.sign) calls this binary to store and
# retrieve .p12 passwords keyed by the path written into profiles.xml.
# The real GNOME secret-tool requires dbus-launch + a running keyring daemon,
# which is unavailable in a headless Docker container. This script replaces
# the bundled binary with a simple file-based implementation.
#
# Storage location: /tmp/.tizen_secrets/<path-with-slashes-replaced-by-underscores>
#   Override with TIZEN_SECRET_STORE env var (useful for testing).
#
# Supported commands (matching the bundled tool's CLI):
#   store  --label LABEL -p PASSWORD keyfile PATH tool certificate-manager
#   lookup --label LABEL             keyfile PATH tool certificate-manager
#   clear                            keyfile PATH tool certificate-manager

STORE_DIR="${TIZEN_SECRET_STORE:-/tmp/.tizen_secrets}"
mkdir -p "$STORE_DIR"

_key_file() { printf '%s' "$1" | tr '/' '_'; }

case "${1:-}" in
    store)
        PASSWORD=""
        KEYFILE=""
        shift
        while [[ $# -gt 0 ]]; do
            case "$1" in
                -p|--password) PASSWORD="$2"; shift 2 ;;
                keyfile)       KEYFILE="$2";  shift 2 ;;
                *)             shift ;;
            esac
        done
        if [[ -n "$KEYFILE" && -n "$PASSWORD" ]]; then
            printf '%s' "$PASSWORD" > "$STORE_DIR/$(_key_file "$KEYFILE")"
        fi
        exit 0
        ;;
    lookup)
        KEYFILE=""
        shift
        while [[ $# -gt 0 ]]; do
            case "$1" in
                keyfile) KEYFILE="$2"; shift 2 ;;
                *)       shift ;;
            esac
        done
        if [[ -n "$KEYFILE" ]]; then
            F="$STORE_DIR/$(_key_file "$KEYFILE")"
            [[ -f "$F" ]] && cat "$F" && exit 0
        fi
        exit 1
        ;;
    clear)
        exit 0
        ;;
    *)
        echo "secret-tool: unknown command: ${1:-}" >&2
        exit 1
        ;;
esac

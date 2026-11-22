#!/bin/sh
# Prints the Tizen app version for a Jellyfin Web release tag.
# Tizen expects x.y.z (x, y: 0-255, z: 0-65535): v12.4 -> 12.4.0, v12.4.2 -> 12.4.2
set -eu
tag=${1#v}
case "$tag" in
  *.*.*.*) echo "Unsupported version: $1" >&2; exit 1 ;;
  *.*.*) version=$tag ;;
  *.*) version=$tag.0 ;;
  *) echo "Unsupported version: $1" >&2; exit 1 ;;
esac
echo "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "Unsupported version: $1" >&2; exit 1; }
IFS=. read -r major minor patch <<EOV
$version
EOV
if [ "$major" -gt 255 ] || [ "$minor" -gt 255 ] || [ "$patch" -gt 65535 ]; then
  echo "Version out of Tizen range: $version" >&2; exit 1
fi
echo "$version"

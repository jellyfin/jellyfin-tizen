#!/bin/bash
if [ $ACCEPT_TIZEN_STUDIO_LICENSE == 1 ]
then
    cd /home/builder
    echo "[jellyfin-tizen-builder] Installing Tizen Studio 5.5!"
    su builder -c "./web-cli_Tizen_Studio_5.5_ubuntu-64.bin --accept-license /home/builder/tizen-studio"
    mkdir /home/builder/tizen-studio-data/
    mkdir /home/builder/tizen-studio-data/profile/
    touch /home/builder/tizen-studio-data/profile/profiles.xml
    cd /home/builder/tizen-studio-data/profile/
    echo """<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>
<profiles active=\"Jellyfin\" version=\"3.1\">
<profile name=\"Jellyfin\">
<profileitem ca=\"/home/builder/Certificates/author.crt\" distributor=\"0\" key=\"/home/builder/Certificates/author.p12\" password=\"$CertPass\" rootca=\"\"/>
<profileitem ca=\"/home/builder/Certificates/distributor.crt\" distributor=\"1\" key=\"/home/builder/Certificates/distributor.p12\" password=\"$CertPass\" rootca=\"\"/>
</profile>
</profiles>""" >> profiles.xml
else
    echo "[jellyfin-tizen-builder] You need to accept the Tizen Studio license to continue. Please read the license first."
    echo ""
    cat TIZEN-LICENSE.txt
    echo ""
    echo "[jellyfin-tizen-builder] If you accept the Tizen Studio license, set this container's ACCEPT_TIZEN_STUDIO_LICENSE environment variable to 1."
    exit
fi

export PATH="${PATH}:/home/builder/tizen-studio/tools:/home/builder/tizen-studio/tools/ide/bin"

cd /home/builder/jellyfin-web
echo "Pulling jellyfin-web!"
git pull

cd /home/builder/jellyfin-tizen
echo "[jellyfin-tizen-builder] Pulling jellyfin-tizen!"
git pull

cd /home/builder/jellyfin-web
echo "[jellyfin-tizen-builder] Installing jellyfin-web dependencies!"
SKIP_PREPARE=1 npm ci --no-audit
echo "[jellyfin-tizen-builder] Building jellyfin-web:production! This will take long!"
USE_SYSTEM_FONTS=1 npm run build:production

cd /home/builder/jellyfin-tizen
echo "[jellyfin-tizen-builder] Installing and building jellyfin-tizen dependencies!"
JELLYFIN_WEB_DIR=../jellyfin-web/dist npm ci --no-audit

echo "[jellyfin-tizen-builder] Building Jellyfin wgt."
tizen build-web -e ".*" -e gulpfile.js -e README.md -e "node_modules/*" -e "package*.json" -e "yarn.lock"
tizen package -t wgt -o . -- .buildResult
mv Jellyfin.wgt /home/builder/Builds/Jellyfin-$(date +'%Y-%m-%d-%T').wgt

echo "[jellyfin-tizen-builder] Connecting to your TV. Please make sure that your TV has Developer Mode enabled and waiting connection from $(hostname -I | awk '{print $1}'). This IP address may be wrong. Verify by running 'ip a' on your host device."
sdb connect $TVIpAddress

echo "[jellyfin-tizen-builder] Installing certificate to the device $(sdb devices | awk 'FNR == 2 {print $3}')."
tizen install-permit -t $(sdb devices | awk 'FNR == 2 {print $3}')

echo "[jellyfin-tizen-builder] Installing $(ls /home/builder/Builds -t | head -n1) to $(sdb devices | awk 'FNR == 2 {print $3}')."
tizen install -n /home/builder/Builds/$(ls /home/builder/Builds -t | head -n1) -t $(sdb devices | awk 'FNR == 2 {print $3}')

echo "[jellyfin-tizen-builder] If you see 'Tizen application is successfully installed.' at the logs, congratulations! You now have your Jellyfin client installed on your TV. Go to Apps > Settings > Find Jellyfin > Add to Home Screen to have it appear on your home screen. Have fun!"

# Target device name
# sdb devices | awk 'FNR == 2 {print $3}'

# Last build
# ls /home/builder/Builds -t | head -n1
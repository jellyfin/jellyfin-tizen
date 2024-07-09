<h1 align="center">Jellyfin for Tizen</h1>
<h3 align="center">Part of the <a href="https://jellyfin.org">Jellyfin Project</a></h3>

---

<p align="center">
<img alt="Logo Banner" src="https://raw.githubusercontent.com/jellyfin/jellyfin-ux/master/branding/SVG/banner-logo-solid.svg?sanitize=true"/>
</p>

## Build With Docker

### Prerequisites

- docker
- docker-buildx
- Tizen Studio 4.6+ with IDE (For Samsung certificates, needed once until certificates' expiration)

### Preperations

1. Install prerequisites.
2. Install Certificate Manager using Tizen Studio Package Manager. See [Installing Required Extensions](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html#Installing-Required-Extensions).
3. Activate Developer Mode on TV and set Host PC IP to your computer's IP address. See [Enable Developer Mode on the TV](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html#Connecting-the-TV-and-SDK).
4. Setup Samsung certificates in Certificate Manager. See [Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html).
   > You need to create a Samsung certificate. NOT a Tizen certificate.
5. When asked if you want to have a backup for your certificates, save them to somewhere safe.
6. Clone or download [Jellyfin Tizen repository](https://github.com/jellyfin/jellyfin-tizen).

   ```sh
   git clone https://github.com/jellyfin/jellyfin-tizen.git
   cd jellyfin-tizen/Docker
   ```

7. Copy your author.crt, author.p12, distributor.crt and distributor.p12 files from certificates backup to `jellyfin-tizen/Docker/Certificates`.
   > Capitalization matters! Be exact.

### Build And Install

```sh
cd jellyfin-tizen/Docker

docker build . -t jellyfin-tizen-builder

docker run --rm \
--net=host \
--ulimit nofile=65536:65536 \
-v ./Certificates:/home/builder/Certificates \
-v ./Builds:/home/builder/Builds \
-e CertPass=YOUR_CERTs_PASSWORD \
-e TVIpAddress=YOUR_TVs_IP_ADDRESS \
-e ACCEPT_TIZEN_STUDIO_LICENSE=0 \
-e JELLYFIN_WEB_BRANCH=release-10.9.z \
-e JELLYFIN_TIZEN_BRANCH=master \
-it jellyfin-tizen-builder:latest

```

> Don't forget to change the environment variables. (lines starting with -e)

> To accept the license, set the variable to 1.

> If you set the JELLYFIN\_\*\_BRANCH variables to \_SKIP\_, it will not try to pull files from GitHub repositories, enabling you to use your own custom versions.

If you see `Tizen application is successfully installed.` at the logs, congratulations! You now have your Jellyfin client installed on your TV. Go to `Apps > Settings > Jellyfin > Add to Home Screen` to have it appear on your home screen. Have fun!

## Notes

- Red-colored output starting with `[BABEL] Note: The code gener...` is NOT an error. It's just a warning and it's expected that this part of the build will take a long time.
- If your certificates expire and you rebuild your Jellyfin widget, you will not be able to update your instance deployed on your TV directly. First, you will need to uninstall the build signed with your old certificates and then install the new build.
- This container doesn't have much error-handling as Tizen Studio is not very helpful on that topic. When the container exits without any obvious errors, it doesn't mean everything went perfectly. Don't forget to have a quick look at the logs, especially search for the `Tizen application is successfully installed.` log.

## Build Manually

_Also look [Wiki](https://github.com/jellyfin/jellyfin-tizen/wiki)._

### Prerequisites

- Tizen Studio 4.6+ with IDE or Tizen Studio 4.6+ with CLI. See [Installing TV SDK](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html).
- Git
- Node.js 20+

### Getting Started

1. Install prerequisites.
2. Install Certificate Manager using Tizen Studio Package Manager. See [Installing Required Extensions](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html#Installing-Required-Extensions).
3. Setup Tizen certificate in Certificate Manager. See [Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html).
   > If you have installation problems with the Tizen certificate, try creating a Samsung certificate. In this case, you will also need a Samsung account.
4. Clone or download [Jellyfin Web repository](https://github.com/jellyfin/jellyfin-web).

   > It is recommended that the web version match the server version.

   ```sh
   git clone -b release-10.9.z https://github.com/jellyfin/jellyfin-web.git
   ```

   > Replace `release-10.9.z` with the name of the branch you want to build.

   > You can also use `git checkout` to switch branches.

5. Clone or download Jellyfin Tizen (this) repository.
   ```sh
   git clone https://github.com/jellyfin/jellyfin-tizen.git
   ```

### Build Jellyfin Web

```sh
cd jellyfin-web
SKIP_PREPARE=1 npm ci --no-audit
USE_SYSTEM_FONTS=1 npm run build:production
```

> You should get `jellyfin-web/dist/` directory.

> `SKIP_PREPARE=1` can be omitted for 10.9+.

> `USE_SYSTEM_FONTS=1` is required to discard unused fonts and to reduce the size of the app. (Since Jellyfin Web 10.9)

> Use `npm run build:development` if you want to debug the app.

If any changes are made to `jellyfin-web/`, the `jellyfin-web/dist/` directory will need to be rebuilt using the command above.

### Prepare Interface

```sh
cd jellyfin-tizen
JELLYFIN_WEB_DIR=../jellyfin-web/dist npm ci --no-audit
```

> You should get `jellyfin-tizen/www/` directory.

> The `JELLYFIN_WEB_DIR` environment variable can be used to override the location of `jellyfin-web`.

> Add `DISCARD_UNUSED_FONTS=1` environment variable to discard unused fonts and to reduce the size of the app. (Until Jellyfin Web 10.9)  
> Don't use it with Jellyfin Web 10.9+. Instead, use `USE_SYSTEM_FONTS=1` environment variable when building Jellyfin Web.

If any changes are made to `jellyfin-web/dist/`, the `jellyfin-tizen/www/` directory will need to be rebuilt using the command above.

### Build WGT

> Make sure you select the appropriate Certificate Profile in Tizen Certificate Manager. This determines which devices you can install the widget on.

```sh
tizen build-web -e ".*" -e gulpfile.js -e README.md -e "node_modules/*" -e "package*.json" -e "yarn.lock"
tizen package -t wgt -o . -- .buildResult
```

> You should get `Jellyfin.wgt`.

## Deployment

### Deploy to Emulator

1. Run emulator.
2. Install package.
   ```sh
   tizen install -n Jellyfin.wgt -t T-samsung-5.5-x86
   ```
   > Specify target with `-t` option. Use `sdb devices` to list them.

### Deploy to TV

1. Run TV.
2. Activate Developer Mode on TV. See [Enable Developer Mode on the TV](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html#Connecting-the-TV-and-SDK).
3. Connect to TV with Device Manager from Tizen Studio.

   Or using sdb:

   ```sh
   sdb connect YOUR_TV_IP
   ```

4. If you are using a Samsung certificate, `Permit to install applications` on your TV using Device Manager from Tizen Studio.

   Or using Tizen CLI:

   ```sh
   tizen install-permit -t UE65NU7400
   ```

   > Specify target with `-t` option. Use `sdb devices` to list them.

   Or using sdb:

   ```sh
   sdb push ~/SamsungCertificate/<PROFILE_NAME>/*.xml /home/developer
   ```

5. Install package.
   ```sh
   tizen install -n Jellyfin.wgt -t UE65NU7400
   ```
   > Specify target with `-t` option. Use `sdb devices` to list them.

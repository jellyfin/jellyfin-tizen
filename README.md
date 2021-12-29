<h1 align="center">Jellyfin for Tizen</h1>
<h3 align="center">Part of the <a href="https://jellyfin.media">Jellyfin Project</a></h3>

## Build Process
_Also look [Wiki](https://github.com/jellyfin/jellyfin-tizen/wiki)._

### Prerequisites
* Tizen Studio with IDE or Tizen Studio with CLI (<a href="https://developer.tizen.org/development/tizen-studio/download">https://developer.tizen.org/development/tizen-studio/download</a>)
* Git

* Node.js
* Yarn (npm install --global yarn)
* Samsung account

### Getting Started

1. Install prerequisites
2. Open Tizen Studio Package Manager
3. Install Main SDK > Tizen SDK tools > Baseline SDK > Certificate Manager
4. Install Main SDK > Tizen SDK tools > Baseline SDK > Emulator Manager 
5. Install Extension SDK > Extra > Samsung Certificate Extension
6. Install Extension SDK > Extra > TV Extensions-6.0 > Emulator
7. Register on Samsung
8. Open Tizen Studio > Tools > Certificate Manager
9. Setup Samsung certificate
> You can also setup Tizen certificate to simplify deployment to emulator
10. Clone or download Jellyfin Web repository (<a href="https://github.com/jellyfin/jellyfin-web">https://github.com/jellyfin/jellyfin-web</a>)
   ```sh
   git clone https://github.com/jellyfin/jellyfin-web.git
   ```
6. Clone or download Jellyfin Tizen (this) repository.
   ```sh
   git clone https://github.com/jellyfin/jellyfin-tizen.git
   ```

### Build Jellyfin Web

```sh
cd jellyfin-web
npx browserslist@latest --update-db
npm ci --no-audit
```
<details>
    <summary><i>For 10.7 and lower</i></summary>

```sh
cd jellyfin-web
npx browserslist@latest --update-db
yarn install --frozen-lockfile
```
</details>

> You should get `jellyfin-web/dist/` directory.

If any changes are made to `jellyfin-web/`, the `jellyfin-web/dist/` directory will need to be rebuilt using the command above.

### Prepare Interface

```sh
cd jellyfin-tizen
JELLYFIN_WEB_DIR=../jellyfin-web/dist 
yarn install
```

> You should get `jellyfin-tizen/www/` directory.

> The `JELLYFIN_WEB_DIR` environment variable can be used to override the location of `jellyfin-web`.

> In PowerShell, setup the ENV variable with `$env:JELLYFIN_WEB_DIR="C:\jellyfin\jellyfin-web\dist"`

> If it doesn't work, copy `jellyfin-web/dist/` directory to `jellyfin-tizen/node_modules/jellyfin-web/dist/`

> If any changes are made to `jellyfin-web/dist/`, the `jellyfin-tizen/www/` directory will need to be rebuilt using the command above.

### Build WGT

> Make sure you select the appropriate Certificate Profile in Tizen Certificate Manager. This determines which devices you can install the widget on.

```sh
‪C:\tizen-studio\tools\ide\bin\tizen.bat build-web -e ".*" -e gulpfile.js -e README.md -e "node_modules/*" -e "package*.json" -e "yarn.lock"
‪C:\tizen-studio\tools\ide\bin\tizen.bat package -t wgt -o . -- .buildResult
```

> You should get `Jellyfin.wgt`.

## Deployment

### Deploy to Emulator

1. Open Tizen Studio > Tools > Emulator manager
2. Select Profile Samsung TV
3. Install package
   ```sh
   ‪C:\tizen-studio\tools\ide\bin\tizen.bat install -n Jellyfin.wgt -t T-samsung-6.0-x86
   ```
   > Specify target with `-t` option. Use `C:\tizen-studio\tools\sdb devices` to list them.
4. Launch Jellyfin app within the emulator to ensure it starts

### Deploy to TV

1. Run TV
2. Activate Developer Mode on TV (<a href="https://developer.samsung.com/tv/develop/getting-started/using-sdk/tv-device">https://developer.samsung.com/tv/develop/getting-started/using-sdk/tv-device</a>)
3. Connect to TV with Device Manager from Tizen Studio > Device Manager > Remote Device Manager (icon) > Scan Devices (icon) OR via sdb command
   ```sh
   C:\tizen-studio\tools\sdb connect YOUR_TV_IP
   ```
4. `Permit to install applications` on your TV with Device Manager from Tizen Studio or via sdb command
   > TODO: Find a command
5. Install package.
   ```sh
   C:\tizen-studio\tools\ide\bin\tizen.bat install -n Jellyfin.wgt -t UE55MU7055
   ```
   > Specify target with `-t` option. Use `C:\tizen-studio\tools\sdb devices` to list them.

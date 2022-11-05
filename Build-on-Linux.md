_This is a guide for Ubuntu. But I believe that Tizen Studio can be installed on other distros if its requirements are met._

### Prerequisites
* Tizen Studio with IDE or Tizen Studio with CLI (<a href="https://developer.tizen.org/development/tizen-studio/download">https://developer.tizen.org/development/tizen-studio/download</a>)
* Git
* Node.js 14+
* Samsung account

### Getting Started

1. Install prerequisites.
2. Install Certificate Manager and Samsung Certificate Extension with Tizen Studio Package Manager.
3. Register on Samsung.
4. Setup Samsung certificate <sup>_need Samsung account_</sup> in Certificate Manager.
> You can also setup Tizen certificate to simplify deployment to emulator.
5. Clone or download Jellyfin Web repository (<a href="https://github.com/jellyfin/jellyfin-web">https://github.com/jellyfin/jellyfin-web</a>).
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
SKIP_PREPARE=1 npm ci --no-audit
npm run build:production
```

> You should get `jellyfin-web/dist/` directory.

> `SKIP_PREPARE=1` can be omitted for 10.9+.

> Use `npm run build:development` if you want to debug the app.

If any changes are made to `jellyfin-web/`, the `jellyfin-web/dist/` directory will need to be rebuilt using the command above.

### Prepare Interface

```sh
cd jellyfin-tizen
JELLYFIN_WEB_DIR=../jellyfin-web/dist npm ci --no-audit
```

> You should get `jellyfin-tizen/www/` directory.

> The `JELLYFIN_WEB_DIR` environment variable can be used to override the location of `jellyfin-web`.

If any changes are made to `jellyfin-web/dist/`, the `jellyfin-tizen/www/` directory will need to be rebuilt using the command above.

### Build WGT

> Make sure you select the appropriate Certificate Profile in Tizen Certificate Manager. This determines which devices you can install the widget on.

```sh
tizen build-web -e ".*" -e gulpfile.js -e README.md -e "node_modules/*" -e "package*.json" -e "yarn.lock"
tizen package -t wgt -o . -- .buildResult
```

> You should get `Jellyfin.wgt`.

_Commands in this guide are for Windows Command Prompt or Batch files. Most of them will work in Windows PowerShell. Special cases will be in collapsible command blocks._

### Prerequisites
* Tizen Studio 4.6+ with IDE or Tizen Studio 4.6+ with CLI (<a href="https://developer.tizen.org/development/tizen-studio/download">https://developer.tizen.org/development/tizen-studio/download</a>)
* Git
* Node.js 16+

> All tools (node, tizen) are assumed to be added to the `PATH` environment variable.

### Getting Started

1. Install prerequisites.
2. Install Certificate Manager using Tizen Studio Package Manager.
3. Setup Tizen certificate in Certificate Manager.
4. Clone or download Jellyfin Web repository (<a href="https://github.com/jellyfin/jellyfin-web">https://github.com/jellyfin/jellyfin-web</a>).

   > It is recommended that the web version match the server version.

   ```bat
   git clone -b release-10.8.z https://github.com/jellyfin/jellyfin-web.git
   ```
   > Replace `release-10.8.z` with the name of the branch you want to build.

   > You can also use `git checkout` to switch branches.
5. Clone or download Jellyfin Tizen (this) repository.
   ```bat
   git clone https://github.com/jellyfin/jellyfin-tizen.git
   ```

### Build Jellyfin Web

```bat
cd jellyfin-web
set SKIP_PREPARE=1
set USE_SYSTEM_FONTS=1
npm ci --no-audit
npm run build:production
```
<details>
    <summary><i>For Windows PowerShell</i></summary>

```powershell
cd jellyfin-web
$env:SKIP_PREPARE=1
$env:USE_SYSTEM_FONTS=1
npm ci --no-audit
npm run build:production
```
</details>

> You should get `jellyfin-web/dist/` directory.

> `set SKIP_PREPARE=1` can be omitted for 10.9+.

> `USE_SYSTEM_FONTS=1` is required to discard unused fonts and to reduce the size of the app. (Since Jellyfin Web 10.9)

> Use `npm run build:development` if you want to debug the app.

If any changes are made to `jellyfin-web/`, the `jellyfin-web/dist/` directory will need to be rebuilt using the command above.

### Prepare Interface

```bat
cd jellyfin-tizen
set JELLYFIN_WEB_DIR=C:\jellyfin\jellyfin-web\dist
npm ci --no-audit
```
<details>
    <summary><i>For Windows PowerShell</i></summary>

```powershell
cd jellyfin-tizen
$env:JELLYFIN_WEB_DIR="C:\jellyfin\jellyfin-web\dist"
npm ci --no-audit
```
</details>

> You should get `jellyfin-tizen/www/` directory.

> The `JELLYFIN_WEB_DIR` environment variable can be used to override the location of `jellyfin-web`.

> Add `DISCARD_UNUSED_FONTS=1` environment variable to discard unused fonts and to reduce the size of the app. (Until Jellyfin Web 10.9)  
> Don't use it with Jellyfin Web 10.9+. Instead, use `USE_SYSTEM_FONTS=1` environment variable when building Jellyfin Web.

If any changes are made to `jellyfin-web/dist/`, the `jellyfin-tizen/www/` directory will need to be rebuilt using the command above.

### Build WGT

> Make sure you select the appropriate Certificate Profile in Tizen Certificate Manager. This determines which devices you can install the widget on.

```bat
tizen.bat build-web -e ".*" -e gulpfile.js -e README.md -e "node_modules/*" -e "package*.json" -e "yarn.lock"
tizen.bat package -t wgt -o . -- .buildResult
```

> You should get `Jellyfin.wgt`.

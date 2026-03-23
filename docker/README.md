# Jellyfin Tizen WGT Builder

Builds `Jellyfin.wgt` for Samsung Tizen TVs. **Everything runs inside Docker** — no tools need to be installed on your host machine.

## Prerequisites

- Docker
- Samsung account (free — [register here](https://developer.samsung.com))
- A browser (for the certificate creation step)

---

## Build the Docker image (one time)

```bash
docker build -t jellyfin-tizen .
```

Installs Tizen Studio web-CLI (headless build tools), system display libraries (for Certificate Manager GUI), and Node.js 20 into a `linux/amd64` Ubuntu image. Expect ~5–10 min and ~2 GB.

> **Different Tizen Studio version:**
> ```bash
> docker build --build-arg TIZEN_VERSION=5.6 -t jellyfin-tizen .
> ```
> Available versions: https://download.tizen.org/sdk/Installer/

---

## Step 1 — Create Samsung certificates (one time)

Samsung TVs only install apps signed with a certificate tied to your **TV's DUID** and your **Samsung Developer account**. This needs to be done once.

### 1a. Get your TV's Device Unique ID (DUID)

On the TV: **Apps → press `12345` on the remote** → note the Unique Device ID shown.  
(Also found at: Settings → Support → Contact Samsung → Unique Device ID)

### 1b. Run the certificate creator

```bash
mkdir -p certs cache data

docker run -it --rm \
  -e TV_DUID="YOUR_TV_DUID" \
  -p 6080:6080 \
  -v ./certs:/certs \
  -v ./cache:/cache \
  -v ./data:/home/builder/tizen-studio-data \
  jellyfin-tizen /create-certs.sh
```

For multiple TVs, comma-separate the DUIDs:

```bash
  -e TV_DUID="DUID1,DUID2,DUID3"
```

**Volume guide (host bind-mounts):**

| Host path | What it holds |
|---|---|
| `./certs` | Output: `author.p12`, `distributor.p12`, `duids.txt`, `SamsungCertificate/` (full backup), `keystore/` |
| `./cache` | 663 MB installer binary — skips re-download on subsequent runs |
| `./data` | Keystore and profiles — preserves certs across runs |

No `./sdk` volume needed. The IDE installs fresh each run (fast after the first download since `./cache` has the binary).

## Open **http://localhost:6080/vnc.html** then follow the installer:

1. Accept license → Next
2. **Keep the default path** `/home/builder/tizen-studio` → Install
   > If prompted for a separate SDK data path, choose any empty directory (e.g. `/sdk`).
3. Wait for progress bar → **uncheck "Launch Package Manager"** → Finish
4. Wait for component installation in the docker output
5. when components are installed, the cert manager will launch in noVNC (browser)
6. Certificate Manager opens automatically

In Certificate Manager:

1. Click **+** → **Samsung** → **TV** → Next
2. Enter a profile name → Next
3. Create a new author certificate — sign in with your Samsung Developer account
4. Create distributor certificate — enter each DUID shown in your terminal → Finish

The script automatically copies `certs/author.p12`, `certs/distributor.p12`, and a full `certs/SamsungCertificate/` backup to your host, then exits.

> **Distributor cert is TV-specific.** If you get a new TV, re-run with the new DUID added to the list.

---

## Step 2 — Build Jellyfin.wgt

```bash
mkdir -p build output

read -rsp "Certificate password (default: tizen): " CERT_PASS && echo && export CERT_PASS

docker run --rm \
  -e CERT_PASS \
  -v "$(pwd)/certs/my-tv/author.p12:/certs/author.p12:ro" \
  -v "$(pwd)/certs/my-tv/distributor.p12:/certs/distributor.p12:ro" \
  -v "$(pwd)/build:/build" \
  -v "$(pwd)/output:/output" \
  jellyfin-tizen /build-wgt.sh
```

`-e CERT_PASS` without `=value` inherits from your shell — never stored in history.

**Volume guide:**

| Host path | What it holds |
|---|---|
| `./certs/.../*.p12` | Your Samsung author + distributor certs (read-only) |
| `./build` | Git repos + `node_modules` cache — skips re-clone/re-install on subsequent runs |
| `./output` | Output: `Jellyfin.wgt` |

### Build a specific version

| Variable | Default | Description |
|---|---|---|
| `JELLYFIN_VERSION` | `10.11.6` | Jellyfin version — auto-derives `WEB_BRANCH` (e.g. `10.11.6` → `release-10.11.z`) |
| `WEB_BRANCH` | _(derived)_ | Override `jellyfin-web` branch/tag explicitly |
| `TIZEN_BRANCH` | `master` | `jellyfin-tizen` branch/tag |

```bash
docker run --rm \
  -e CERT_PASS \
  -e JELLYFIN_VERSION="10.11.6" \
  -v "$(pwd)/certs/my-tv/author.p12:/certs/author.p12:ro" \
  -v "$(pwd)/certs/my-tv/distributor.p12:/certs/distributor.p12:ro" \
  -v "$(pwd)/build:/build" \
  -v "$(pwd)/output:/output" \
  jellyfin-tizen /build-wgt.sh
```

---

## Step 3 — Install on your TV

### Enable Developer Mode on the TV (one time per reboot)

1. Go to **Apps** → press **12345** on the remote
2. Enable Developer Mode → enter your **host machine's LAN IP** → reboot TV

> Developer mode is disabled on every TV power cycle — re-enable it before each install session.

### Run the installer

```bash
docker run --rm --network host \
  -e TV_IP="192.168.1.100" \
  -v "$(pwd)/output:/output" \
  jellyfin-tizen /install-wgt.sh
```

**`--network host` requires a Linux host.** Docker Desktop on macOS runs containers inside a LinuxKit VM — even with `--network host`, the container cannot reach LAN devices (the VM is not on your LAN, only the Mac is). On macOS, install natively using [Tizen Studio CLI](https://developer.tizen.org/development/tizen-studio/download):

```bash
# macOS native (Tizen Studio CLI installed locally)
sdb connect 192.168.1.100
tizen install -n output/Jellyfin.wgt -s 192.168.1.100:26101
```

**Optional env vars:**

| Variable | Default | Description |
|---|---|---|
| `TV_IP` | _(required)_ | TV IP address |
| `TV_PORT` | `26101` | SDB port |
| `WGT_FILE` | `/output/Jellyfin.wgt` | Path to `.wgt` inside the container |




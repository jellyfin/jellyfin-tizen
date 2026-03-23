# ─────────────────────────────────────────────────────────────────────────────
# Jellyfin Tizen — Samsung cert creator + WGT builder (everything in Docker)
#
# Build (one time):
#   docker build -t jellyfin-tizen .
#
# Create Samsung certs (one time, opens browser UI on port 6080):
#   docker run -it --rm \
#     -e TV_DUID="YOUR_TV_DUID" \
#     -p 6080:6080 \
#     -v "$(pwd)/certs:/certs" \
#     jellyfin-tizen /create-certs.sh
#   → Open http://localhost:6080/vnc.html in your browser
#
# Build Jellyfin.wgt:
#   docker run --rm \
#     -v "$(pwd)/certs/author.p12:/certs/author.p12:ro" \
#     -v "$(pwd)/certs/distributor.p12:/certs/distributor.p12:ro" \
#     -v "$(pwd)/output:/output" \
#     jellyfin-tizen /build-wgt.sh
# ─────────────────────────────────────────────────────────────────────────────
# Tizen Studio only ships x86-64 binaries — force amd64 even on Apple Silicon
FROM --platform=linux/amd64 ubuntu:22.04

LABEL description="Jellyfin Tizen — Samsung cert creator + WGT builder"

ARG TIZEN_VERSION=6.0
ARG CERT_EXT_URL=https://download.tizen.org/sdk/extensions/tizen-certificate-extension_2.0.73.zip

ENV DEBIAN_FRONTEND=noninteractive \
    TIZEN_VERSION=${TIZEN_VERSION} \
    CERT_EXT_URL=${CERT_EXT_URL} \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# ── 1. System packages ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        openjdk-17-jre-headless \
        git wget curl \
        # Virtual display + window manager
        xvfb fluxbox \
        # VNC + noVNC for browser-based GUI access
        x11vnc novnc python3-websockify \
        # GTK2 required by SWT/Eclipse (libgtk-x11-2.0.so.0)
        libgtk2.0-0 \
        # Other Eclipse runtime dependencies
        libglib2.0-0 libgl1 libnss3 libx11-xcb1 libdbus-glib-1-2 libxt6 \
        # KDE/Qt5 libs required by Certificate Manager (cert-add-on)
        libkf5itemmodels5 libkf5kiowidgets5 libkchart2 \
        # Required by Tizen Studio package-manager for .rpm packages
        rpm2cpio cpio \
        # openssl used to strip .p12 passwords before registering cert profile
        openssl \
        # xdg-utils provides xdg-open, needed by Certificate Manager Samsung OAuth
        xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# ── 1b. Google Chrome — Certificate Manager opens Samsung OAuth in a browser ──
# Chrome's .deb works natively in linux/amd64 Docker (no snap required).
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
         -O /tmp/chrome.deb \
    && apt-get update && apt-get install -y --no-install-recommends /tmp/chrome.deb \
    && rm /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── 3. Non-root user — Tizen Studio installer refuses root ───────────────────
# X11 socket dir must pre-exist with sticky bit so non-root Xvfb can write to it.
RUN useradd -m -u 1000 -s /bin/bash builder \
    && mkdir -p /tmp/.X11-unix \
    && chmod 1777 /tmp/.X11-unix

ENV TIZEN_SDK=/home/builder/tizen-studio \
    TIZEN_DATA=/home/builder/tizen-studio-data \
    PATH=/home/builder/tizen-studio/tools/ide/bin:/home/builder/tizen-studio/tools:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# ── 4. Install Tizen Studio web-cli (headless, no GUI needed) ─────────────────
#    web-cli gives us all CLI build+signing tools. The web-IDE (Certificate
#    Manager GUI) is downloaded and installed at runtime by create-certs.sh
#    to keep docker build fast and reliable.
RUN wget -nv \
        "https://download.tizen.org/sdk/Installer/tizen-studio_${TIZEN_VERSION}/web-cli_Tizen_Studio_${TIZEN_VERSION}_ubuntu-64.bin" \
        -O /tmp/tizen.bin \
    && chmod +x /tmp/tizen.bin

USER builder
RUN /tmp/tizen.bin --accept-license "$TIZEN_SDK" \
    && test -d "$TIZEN_SDK" || (echo "ERROR: Tizen Studio did not install" && exit 1)

# ── 5. Copy scripts (root) ────────────────────────────────────────────────────
USER root
RUN rm -f /tmp/tizen.bin
COPY --chown=builder:builder create-certs.sh /create-certs.sh
COPY --chown=builder:builder build-wgt.sh /build-wgt.sh
COPY --chown=builder:builder install-wgt.sh /install-wgt.sh
# Replace Tizen's bundled secret-tool (requires dbus-launch / GNOME Keyring,
# which is unavailable headless) with a simple file-based implementation.
# LinuxCrypt.java calls this to store/retrieve .p12 passwords by keyfile path.
COPY --chown=builder:builder secret-tool.sh \
    /home/builder/tizen-studio/tools/certificate-encryptor/secret-tool
RUN chmod +x /create-certs.sh /build-wgt.sh /install-wgt.sh \
             /home/builder/tizen-studio/tools/certificate-encryptor/secret-tool

USER builder
WORKDIR /home/builder/build

# Pre-create output dirs so named/bind volumes inherit correct ownership
RUN mkdir -p /home/builder/build
USER root
RUN mkdir -p /certs /output && chown builder:builder /certs /output
USER builder

CMD ["/bin/bash"]


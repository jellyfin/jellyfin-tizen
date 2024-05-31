FROM debian:stable-slim

ENV ACCEPT_TIZEN_STUDIO_LICENSE=0
ENV CertPass=12345
ENV TVIpAddress=192.168.1.2

WORKDIR /home/builder

RUN useradd builder
RUN chown builder:builder /home/builder

# Install ca-certificates, sudo, curl, wget, gnupg and git.
RUN apt update
RUN apt -y install ca-certificates sudo curl wget gnupg git
RUN curl -fsSL https://deb.nodesource.com/setup_current.x | bash -
RUN apt -y install nodejs

# Download Tizen Studio but do not install. Note: Tizen Studio 5.6 doesn't work for some reason.
RUN wget https://download.tizen.org/sdk/Installer/tizen-studio_5.5/web-cli_Tizen_Studio_5.5_ubuntu-64.bin
RUN chmod +x /home/builder/web-cli_Tizen_Studio_5.5_ubuntu-64.bin

# These repositories are being pulled in the start.sh. No need to rebuild everytime.
RUN git clone https://github.com/jellyfin/jellyfin-web.git
RUN git clone https://github.com/jellyfin/jellyfin-tizen.git

ADD ./TIZEN-LICENSE.txt /home/builder/TIZEN-LICENSE.txt
ADD ./start.sh /home/builder/start.sh
RUN chmod +x /home/builder/start.sh
CMD ["bash", "/home/builder/start.sh"]
# CMD ["/bin/bash"]

# docker run --rm --net=host -v ./Certificates:/home/builder/Certificates -v ./Build:/home/builder/Builds -e CertPass=YOUR_CERTs_PASSWORD -e TVIpAddress=YOUR_TVs_IP_ADDRESS --ulimit nofile=65536:65536 -e ACCEPT_TIZEN_STUDIO_LICENSE=0 -it jellyfin-tizen-builder:latest

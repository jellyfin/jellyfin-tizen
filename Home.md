## Build Process
* [[Build on Linux|Build-on-Linux]]
* [[Build on Windows|Build-on-Windows]]

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

# Mobile HTTPS Setup

This demo needs HTTPS for reliable phone motion and orientation sensors. Use `mkcert` to create a local trusted certificate for your LAN address.

## 1. Install mkcert

Windows:

```powershell
winget install FiloSottile.mkcert
```

macOS:

```bash
brew install mkcert
brew install nss
```

Linux:

```bash
sudo apt install libnss3-tools
```

Then install `mkcert` from the official releases if your package manager does not provide it.

## 2. Create The Local CA

```bash
mkcert -install
```

Find your computer LAN IP address. On Windows:

```powershell
ipconfig
```

Create certificates for localhost and your LAN IP:

```bash
mkdir certs
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 YOUR_LAN_IP
```

Replace `YOUR_LAN_IP` with an address like `192.168.1.100`.

## 3. Trust The CA On Phones

Find the mkcert root CA:

```bash
mkcert -CAROOT
```

### iPhone / iPad

1. Send `rootCA.pem` to the phone with AirDrop, a cable, or another trusted channel.
2. Open it and install the profile.
3. Go to Settings > General > VPN & Device Management and install the profile.
4. Go to Settings > General > About > Certificate Trust Settings.
5. Enable full trust for the mkcert certificate.

### Android

1. Rename `rootCA.pem` to `rootCA.crt`.
2. Transfer it to the phone.
3. Go to Settings > Security > Encryption & credentials > Install a certificate.
4. Choose the certificate for VPN and apps.

Exact Android menu names vary by vendor.

## 4. Start The Server

```bash
node scripts/serve-https.mjs
```

Or pass explicit paths:

```bash
node scripts/serve-https.mjs --host 0.0.0.0 --port 8443 --cert certs/cert.pem --key certs/key.pem
```

Open the printed Network URL on a phone connected to the same LAN, for example:

```text
https://192.168.1.100:8443
```

## Troubleshooting

- If the phone shows a certificate warning, confirm the phone trusts the mkcert root CA.
- If iPhone Safari does not ask for motion permission, make sure the page is opened over HTTPS and the game is started by tapping the button.
- If the screen does not rotate with the phone, check browser motion/orientation permission settings.
- If the phone and computer cannot connect, confirm they are on the same Wi-Fi and the firewall allows port `8443`.

# Nginx + TLS (WSS) setup for the Python WebSocket server

This document explains how to terminate TLS with nginx and forward WSS to the local Python server running on port `2343`.

Important caveat: Let's Encrypt will NOT issue certificates for a bare IP address (e.g. `165.173.23.252`). You must use a DNS name that points to that IP (e.g. `game.example.com`). If you cannot use a domain, see the "Self-signed cert for IP" section below.

Steps (domain -> Let's Encrypt):

1. Install nginx and certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

2. Copy the provided nginx template to `/etc/nginx/sites-available/gimkit-wss` and enable it

```bash
sudo cp server/nginx-wss.conf /etc/nginx/sites-available/gimkit-wss
sudo sed -i 's/example.com/your.domain.here/g' /etc/nginx/sites-available/gimkit-wss
sudo ln -s /etc/nginx/sites-available/gimkit-wss /etc/nginx/sites-enabled/gimkit-wss
sudo nginx -t
sudo systemctl reload nginx
```

3. Obtain a Let's Encrypt certificate (certbot will update nginx config paths)

```bash
sudo certbot --nginx -d your.domain.here
```

4. Start the WebSocket server as a systemd service

Copy the systemd unit template `server/simple_ws_server.service` to `/etc/systemd/system/` and then enable/start it:

```bash
sudo cp server/simple_ws_server.service /etc/systemd/system/simple_ws_server.service
# Adjust the ExecStart and WorkingDirectory in the unit file if your paths differ
sudo systemctl daemon-reload
sudo systemctl enable --now simple_ws_server.service
sudo journalctl -u simple_ws_server.service -f
```

5. Test a WSS connection (from a machine that trusts the cert):

Install `wscat` or use browser devtools to connect to `wss://your.domain.here/`.

```bash
# install wscat (node required)
sudo npm install -g wscat
wscat -c wss://your.domain.here/
```

Self-signed cert for IP (if you must use the raw IP):

1. Create a self-signed cert with the IP as subjectAltName (example):

```bash
cat > /tmp/ip_openssl.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
[req_distinguished_name]
[v3_req]
subjectAltName = @alt_names
[alt_names]
IP.1 = 165.173.23.252
EOF

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/wss-selfsigned.key \
  -out /etc/ssl/certs/wss-selfsigned.crt \
  -config /tmp/ip_openssl.cnf \
  -subj "/CN=165.173.23.252"
```

2. Update the nginx TLS server block to point to the above cert/key (replace `ssl_certificate` and `ssl_certificate_key` with the self-signed paths) and reload nginx.

Note: Browsers will warn about self-signed certificates; you'll need to accept the risk to connect.

Troubleshooting & tips:
- If clients load your page over HTTPS, the page must use `wss://` (secure WebSocket). The client already switches to `wss://` when the page is HTTPS, but you must have a working TLS certificate for the domain.
- If certbot fails because the domain doesn't point to your server, update DNS and wait for propagation.
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log` and `access.log`.
- Check server logs: `sudo journalctl -u simple_ws_server.service -f`.

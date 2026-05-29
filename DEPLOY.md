# Deploy Makrone to Server
# Domain: makrone.duckdns.org
# Server: 159.65.218.231

## STEP 1: Make sure DuckDNS points to your server

Go to https://www.duckdns.org and make sure `makrone` subdomain points to `159.65.218.231`

## STEP 2: SSH into your server

```bash
ssh root@159.65.218.231
```

## STEP 3: Install everything

```bash
# Install Node.js (skip if already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2, Nginx, Certbot
npm install -g pm2
apt-get install -y nginx certbot python3-certbot-nginx
```

## STEP 4: Clone and setup the app

```bash
mkdir -p /var/www
cd /var/www
git clone https://mak265:YOUR_TOKEN@github.com/mak265/makrone-system.git makrone
cd makrone
npm install --omit=dev
```

## STEP 5: Start the app with PM2

```bash
cd /var/www/makrone
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## STEP 6: Setup Nginx

```bash
nano /etc/nginx/sites-available/makrone
```

Paste this config:

```nginx
server {
    listen 80;
    server_name makrone.duckdns.org;

    location / {
        proxy_pass http://localhost:5555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/makrone /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## STEP 7: Add FREE SSL (HTTPS)

```bash
certbot --nginx -d makrone.duckdns.org --non-interactive --agree-tos -m makronecctvservices@gmail.com
```

## STEP 8: Open firewall

```bash
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable
```

## DONE!

Your system is now live at:
- https://makrone.duckdns.org (Landing page)
- https://makrone.duckdns.org/admin (Admin panel)
- https://makrone.duckdns.org/review/[token] (Review links)

## Useful Commands

```bash
pm2 status              # Check app status
pm2 logs makrone        # View logs
pm2 restart makrone     # Restart app
cd /var/www/makrone && git pull && pm2 restart makrone  # Update from GitHub
```

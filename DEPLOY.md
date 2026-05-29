# Deploy Makrone to Server (159.65.218.231)

## Step 1: Connect to your server

```bash
ssh root@159.65.218.231
```

## Step 2: Install Node.js (if not installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:
```bash
node --version
npm --version
```

## Step 3: Install PM2 (keeps app running 24/7)

```bash
npm install -g pm2
```

## Step 4: Upload your project

From your LOCAL machine (Windows), run this in the project folder:

```bash
scp -r . root@159.65.218.231:/var/www/makrone
```

OR if you prefer, on the server:

```bash
mkdir -p /var/www/makrone
cd /var/www/makrone
```

Then use FileZilla/WinSCP to upload all files (except node_modules) to `/var/www/makrone`

## Step 5: Install dependencies on server

```bash
cd /var/www/makrone
npm install --production
```

## Step 6: Start the app with PM2

```bash
cd /var/www/makrone
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 7: Open firewall (if needed)

```bash
sudo ufw allow 80
sudo ufw allow 443
```

## Done!

Your system is now live at:
- Landing Page: http://159.65.218.231
- Admin Panel: http://159.65.218.231/admin

## Useful PM2 Commands

```bash
pm2 status          # Check if app is running
pm2 logs makrone    # View logs
pm2 restart makrone # Restart the app
pm2 stop makrone    # Stop the app
```

## Optional: Add a Domain Name

If you buy a domain (e.g. makrone.ph), point the A record to 159.65.218.231.
Then you can access it via http://makrone.ph

## Optional: Add HTTPS (SSL)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

Then update server.js to use HTTPS, or use Nginx as reverse proxy.

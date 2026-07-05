# Deploying to AWS — https://nexussoftlab.com/OrderNow

This app is deployed on a **single EC2 instance** with **Nginx** as the reverse
proxy. There is no Render and no Vercel. Everything lives under the `/OrderNow`
sub-path of the main domain:

| Piece            | Public URL                                    | Served by            |
|------------------|-----------------------------------------------|----------------------|
| Frontend (React) | `https://nexussoftlab.com/OrderNow/`          | Nginx static files   |
| REST API         | `https://nexussoftlab.com/OrderNow/api/`      | Node backend `:3007` |
| Uploaded images  | `https://nexussoftlab.com/OrderNow/uploads/`  | Node backend `:3007` |
| Websockets       | `https://nexussoftlab.com/OrderNow/socket.io/`| Node backend `:3007` |

Because it's all one origin behind Nginx, there are no cross-origin/CORS issues.

> **Casing matters.** The path is `/OrderNow` everywhere (Vite `base`, router
> basename, env vars, Nginx). URLs are case-sensitive — don't mix `/Ordernow`
> and `/OrderNow`.

---

## What changed in the code (already done)

**Frontend**
- `vite.config.js` — `base: '/OrderNow/'` so all asset URLs are prefixed.
- `src/main.jsx` — `<BrowserRouter basename>` reads that base.
- `src/lib/socket.js` — derives the socket origin + `/OrderNow/socket.io` path from `VITE_API_URL`.
- `AdminTables.jsx` / `AdminRooms.jsx` — QR codes now include the `/OrderNow` base.
- `.env.production` — `VITE_API_URL=https://nexussoftlab.com/OrderNow/api`.
- `vercel.json` — **deleted** (no longer using Vercel).

**Backend**
- `app.set('trust proxy', 1)` — correct `https` + client IP behind Nginx.
- Upload URLs use `PUBLIC_URL` (so images resolve to `.../OrderNow/uploads/...`).
- `CORS_ORIGIN`, `SOCKET_PATH`, and `PORT` are now env-driven.
- `.env.production.example` — template for the server's `.env`.
- `ecosystem.config.js` — PM2 process config.

---

## One-time server setup

```bash
# On the EC2 box (Ubuntu). Security group must allow inbound 80 + 443.
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

# Postgres: either install locally...
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER masala WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE masala OWNER masala;"
# ...or use an AWS RDS Postgres instance and point DATABASE_URL at it.
```

Point DNS: an **A record** for `nexussoftlab.com` (and `www`) → the EC2 Elastic IP.

---

## Deploy the backend

```bash
cd /var/www
sudo git clone <resto-backend repo> resto-backend
cd resto-backend

cp .env.production.example .env
nano .env          # set PORT=3007, DATABASE_URL, JWT_SECRET, PUBLIC_URL, etc.

npm ci --omit=dev
npm run build      # prisma generate + db push (creates the schema)
# Optional first-run seed of demo data:  npm run db:seed

pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints, to start on boot
```

Verify: `curl http://127.0.0.1:3007/` → `{"service":"Masala Story API",...}`.

---

## Deploy the frontend

Build locally (or on the server) and copy the static `dist/` to where Nginx serves it.

```bash
cd resto-frontend
npm ci
npm run build                       # reads .env.production, base = /OrderNow/

sudo mkdir -p /var/www/ordernow
sudo cp -r dist/* /var/www/ordernow/
```

The build must be at `/var/www/ordernow/` so `index.html` sits at
`/var/www/ordernow/index.html` and assets at `/var/www/ordernow/assets/...`.

---

## Configure Nginx + SSL

```bash
sudo cp deploy/nginx-nexussoftlab.conf /etc/nginx/sites-available/nexussoftlab
sudo ln -s /etc/nginx/sites-available/nexussoftlab /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Free HTTPS cert (also auto-renews):
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nexussoftlab.com -d www.nexussoftlab.com
```

Then open **https://nexussoftlab.com/OrderNow/** — you should see the app.

---

## Redeploying later

```bash
# Backend
cd /var/www/resto-backend && git pull && npm ci --omit=dev && npm run build && pm2 restart ordernow-api

# Frontend
cd resto-frontend && git pull && npm ci && npm run build && sudo cp -r dist/* /var/www/ordernow/
```

---

## Android app

The native Android app (`resto-android/`) is a WebView wrapper around this same
deployed site — pull-to-refresh + working back button included. It always shows
the live site, so no rebuild is needed when the web app changes.

**User download link:** `https://nexussoftlab.com/OrderNow/app`

To publish it:
```bash
# 1. Build + sign the APK (see resto-android/README.md), rename to ordernow.apk
sudo mkdir -p /var/www/ordernow-app
sudo cp ordernow.apk /var/www/ordernow-app/ordernow.apk
sudo cp resto-frontend/deploy/download/index.html /var/www/ordernow-app/index.html
sudo systemctl reload nginx   # the /OrderNow/app/ blocks are already in the config
```
The Nginx config in `deploy/nginx-nexussoftlab.conf` already serves the landing
page and the APK (with the correct `application/vnd.android.package-archive` type).

---

## Troubleshooting

- **Blank page / 404 on assets** — the `base` and the Nginx `alias` path must
  agree. Assets should load from `/OrderNow/assets/...`.
- **API calls 404 or CORS error** — check `VITE_API_URL` was baked into the
  build (rebuild after editing `.env.production`) and that Nginx `/OrderNow/api/`
  proxies to `:3007`.
- **Sockets won't connect** — `SOCKET_PATH` in the backend `.env` must be
  `/OrderNow/socket.io`, matching the Nginx location. Check `pm2 logs`.
- **Uploaded images 404** — `PUBLIC_URL` must be `https://nexussoftlab.com/OrderNow`
  (no trailing slash) so stored URLs include the sub-path.
- **502 Bad Gateway** — backend isn't running: `pm2 status`, `pm2 logs ordernow-api`.

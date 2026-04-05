# Production Deploy

## 1. Environment

Copy `.env.example` to `.env` and set at minimum:

```env
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://your-domain.com
TRUST_PROXY=true
DB_PATH=./data/mvp.sqlite
FRONTEND_ROOT=./frontend
AUTO_SYNC_FRONTEND=true
SESSION_SECRET=replace-with-a-long-random-secret
SESSION_NAME=node_admin_ts.sid
SESSION_SECURE=true
SESSION_SAME_SITE=lax
SESSION_MAX_AGE_MS=28800000
```

## 2. Build and run

```powershell
npm install
npm run build
npm run start:prod
```

## 3. PM2

```powershell
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

## 4. Nginx reverse proxy

Use [node_admin_ts.conf](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\deploy\nginx\node_admin_ts.conf) as the base server block.

Then enable HTTPS with Certbot or your TLS setup.

## 5. Catalog sync

Run manually when frontend pages change:

```powershell
npm run sync:catalog
```

The app also auto-syncs at boot when `AUTO_SYNC_FRONTEND=true`.

## 6. Session and proxy

For production behind Nginx:

- `TRUST_PROXY=true`
- `SESSION_SECURE=true`
- set a real `SESSION_SECRET`
- optionally set `SESSION_DOMAIN=.your-domain.com`

## 7. Recommended deployment flow

1. upload project
2. copy `.env`
3. run `npm install`
4. run `npm run build`
5. run `npm run sync:catalog`
6. start with PM2
7. put Nginx in front
8. enable HTTPS

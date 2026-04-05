# Node TypeScript Unified App

Project nay da duoc gom theo mo hinh:

- `frontend clone` tai `/`
- `admin panel` tai `/admin`
- `user panel` tai `/user/*`
- `REST API JSON` tai `/api/*`

Frontend clone da duoc copy vao trong project, nen runtime khong con phu thuoc `C:\My Web Sites\1`.

No dung:

- Node.js
- TypeScript
- Express
- SQLite (`node:sqlite`)

Database mac dinh:

- [mvp.sqlite](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\data\mvp.sqlite)

Frontend clone mac dinh:

- [frontend](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\frontend)

## Environment

- copy `.env.example` thanh `.env`
- dat `SESSION_SECRET` rieng cho production
- production guide: [PRODUCTION_DEPLOY.md](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\PRODUCTION_DEPLOY.md)

## Tai khoan seed

Admin:

- `thequy01 / Matkhau1234@`
- `operator01 / Matkhau1234@`

User:

- xem [demo-credentials.json](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\data\demo-credentials.json)
- password demo chung: `User1234@`

## Route chinh

Frontend clone:

- `/`
- `/index.html`
- `/login.html`
- `/register.html`
- cac service page clone dang co

Admin:

- `/admin/login`
- `/admin`
- `/admin/users`
- `/admin/categories`
- `/admin/products`
- `/admin/orders`
- `/admin/transactions`

User:

- `/user/login`
- `/user/register`
- `/user/dashboard`
- `/services`
- `/services/:id`
- `/user/orders`
- `/user/wallet`

REST API:

- `/api/health`
- `/api/auth/user/login`
- `/api/auth/user/register`
- `/api/auth/user/me`
- `/api/services`
- `/api/frontend/page-map/:pageSlug`
- `/api/orders`
- `/api/orders/me`
- `/api/wallet/me`
- `/api/admin/catalog/sync-status`
- `/api/admin/catalog/sync`

## Scripts

```powershell
npm install
npm start
npm run build
npm run start:prod
npm run sync:catalog
```

## Catalog sync

- app tu sync frontend -> categories/products luc boot neu `AUTO_SYNC_FRONTEND=true`
- co the sync tay bang `npm run sync:catalog`
- admin co the trigger sync tai dashboard hoac qua `/api/admin/catalog/sync`

## Ghi chu

`node:sqlite` hien van hien canh bao `ExperimentalWarning` tren Node 24, nhung project da build va chay duoc trong may hien tai.

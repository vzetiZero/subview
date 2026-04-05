# Run Project

## 1. Yeu cau

Can cai truoc:

- Node.js 24+
- npm

## 2. Thu muc lam viec

Project Node nam tai:

- [node_admin_ts](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts)

Project hien da tu chua frontend clone trong thu muc `frontend`, khong can phu thuoc `C:\My Web Sites\1` de chay runtime.

Database seed:

- [mvp.sqlite](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\data\mvp.sqlite)

Frontend clone:

- [frontend](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\frontend)

## 3. Environment

Copy file:

```powershell
Copy-Item .env.example .env
```

Dev co the dung mac dinh. Production phai doi:

- `SESSION_SECRET`
- `APP_BASE_URL`
- `TRUST_PROXY=true`
- `SESSION_SECURE=true`

## 4. Chay project

```powershell
cd "c:\Users\Administrator\Desktop\Clone Web\node_admin_ts"
npm install
npm start
```

Mac dinh app chay:

```text
http://localhost:3000
```

## 5. Scripts khac

```powershell
npm run build
npm run start:prod
npm run sync:catalog
```

## 6. Route can mo

Frontend clone:

- `http://localhost:3000/`
- `http://localhost:3000/index.html`
- `http://localhost:3000/login.html`
- `http://localhost:3000/register.html`

Admin:

- `http://localhost:3000/admin/login`
- `http://localhost:3000/admin`

User:

- `http://localhost:3000/user/login`
- `http://localhost:3000/user/dashboard`

API:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/admin/catalog/sync-status`

## 7. Tai khoan dang nhap

Admin:

- `thequy01 / Matkhau1234@`
- `operator01 / Matkhau1234@`

User:

- password chung: `User1234@`
- danh sach user demo xem tai:
  - [demo-credentials.json](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\data\demo-credentials.json)

## 8. Frontend clone dang hoat dong nhu the nao

Express se:

1. serve file clone HTML/CSS/JS tu thu muc frontend
2. inject script `/node-bridge.js`
3. bridge noi login/register/order sang REST API Node
4. backend auto sync service pages thanh products/categories

## 9. Production

Xem them:

- [PRODUCTION_DEPLOY.md](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\PRODUCTION_DEPLOY.md)
- [ecosystem.config.cjs](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\ecosystem.config.cjs)
- [node_admin_ts.conf](c:\Users\Administrator\Desktop\Clone%20Web\node_admin_ts\deploy\nginx\node_admin_ts.conf)

## 10. Kiem tra nhanh sau khi chay

1. mo `http://localhost:3000/api/health`
2. mo `http://localhost:3000/admin/login`
3. dang nhap bang `thequy01 / Matkhau1234@`
4. mo 1 service page clone
5. submit form dat don
6. neu frontend doi, chay `npm run sync:catalog`

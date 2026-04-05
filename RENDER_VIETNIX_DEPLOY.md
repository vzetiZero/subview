# Deploy Node.js TypeScript Len Render + Vietnix

Tai lieu nay ap dung cho chinh project hien tai trong `node_admin_ts`.

## 1. Trang thai hien tai cua project

Project da san sang de dua len Render:

- runtime: `Node.js + TypeScript + Express`
- build command: `npm ci && npm run build`
- start command: `npm run start:prod`
- app da bind `0.0.0.0`
- health check: `/api/health`
- da co file [render.yaml](./render.yaml)

Luu y:

- project dang dung `SQLite`
- Render Free khong phu hop cho production quan trong neu anh can du lieu ben vung
- moi lan redeploy hoac restart instance, du lieu co the bi reset neu khong dung persistent disk

Neu chi de demo / hobby / test domain thi dung duoc.

## 2. Kiem tra local truoc khi push

Chay:

```powershell
npm install
npm run build
npm start
```

Mo:

- `http://localhost:3000/`
- `http://localhost:3000/api/health`

Neu muon test production mode local:

```powershell
npm run build
npm run start:prod
```

## 3. Khoi tao Git repo local

PowerShell hien tai cua anh chua an bien `git` vao `PATH`, nhung may da co Git tai:

- `C:\Program Files\Git\cmd\git.exe`

Neu muon dung ngay trong PowerShell hien tai:

```powershell
$env:Path = 'C:\Program Files\Git\cmd;' + $env:Path
git --version
```

Neu van khong nhan, dong mo lai terminal/VS Code.

Khoi tao repo:

```powershell
cd "c:\Users\Administrator\Desktop\Clone Web\node_admin_ts"
git init
git add .
git commit -m "render-ready node admin app"
```

## 4. Tao GitHub repo va push len

Tao 1 repo rong tren GitHub, sau do thay `<REPO_URL>`:

```powershell
git branch -M main
git remote add origin <REPO_URL>
git push -u origin main
```

## 5. Tao Web Service tren Render

Trong Render:

1. `New +`
2. `Web Service`
3. ket noi GitHub
4. chon repo vua push

Neu dung file `render.yaml`, Render se doc cau hinh san:

- runtime: `node`
- plan: `free`
- build: `npm ci && npm run build`
- start: `npm run start:prod`
- health check: `/api/health`

Neu anh muon dien tay:

- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:prod`

## 6. Environment variables can dat tren Render

Can dat hoac kiem tra trong `Render Dashboard -> Environment`:

- `NODE_ENV=production`
- `APP_BASE_URL=https://subviewmmo.pro.vn`
- `APP_LANGUAGE=th`
- `APP_LOCALE=th-TH`
- `TRUST_PROXY=true`
- `SESSION_SECURE=true`
- `SESSION_SAME_SITE=lax`
- `SESSION_SECRET=<chuoi_bi_mat_rieng>`
- `BASE_CURRENCY_CODE=VND`
- `DISPLAY_CURRENCY_CODE=THB`
- `VND_TO_THB_RATE=0.0013`
- `AUTO_SYNC_FRONTEND=true`

Neu app dung du lieu mau co san trong repo:

- `DB_PATH=/opt/render/project/src/data/mvp.sqlite`
- `FRONTEND_ROOT=/opt/render/project/src/frontend`

Luu y quan trong:

- neu anh tao service bang tay tu GitHub repo, `render.yaml` khong tu dong sinh env cho service da tao san
- vi vay `SESSION_SECRET` van phai them tay trong Render Dashboard
- loi anh gap vua roi la do service dang chay production nhung chua co `SESSION_SECRET`

## 7. Gan custom domain `subviewmmo.pro.vn`

Trong Render:

1. vao service
2. `Settings`
3. `Custom Domains`
4. `Add Custom Domain`
5. nhap:

```text
subviewmmo.pro.vn
```

Luu lai.

## 8. Cau hinh DNS tai Vietnix

Neu `subviewmmo.pro.vn` dang duoc quan ly DNS tai Vietnix, them record:

```text
Type: A
Name: @
Content: 216.24.57.1
TTL: mac dinh
```

Neu muon them `www.subviewmmo.pro.vn`:

```text
Type: CNAME
Name: www
Content: <ten-service>.onrender.com
TTL: mac dinh
```

Rà soát va xoa record xung dot neu co:

- A cu
- CNAME cu
- AAAA cho cung host

## 9. Verify domain

Sau khi luu DNS:

1. quay lai Render
2. `Settings > Custom Domains`
3. bam `Verify`

Khi verify xong:

- Render tu cap SSL
- Render tu redirect HTTP -> HTTPS

## 10. Auto deploy ve sau

Moi lan update code:

```powershell
git add .
git commit -m "update"
git push
```

Render se tu build va deploy lai neu repo da lien ket.

## 11. Nhung diem can luu y voi project nay

### SQLite

Project hien tai dung `SQLite`, nen:

- nhanh
- don gian
- hop demo

Nhung neu dua len website that de chay lau dai, anh nen doi sang:

- PostgreSQL

Vi Render Free khong phai noi ly tuong de giu `SQLite` ben vung cho san pham that.

### Git hien tai

Luc toi kiem tra:

- thu muc `node_admin_ts` chua duoc `git init`
- nghia la chua co `.git` o day

## 12. Lenh day du de anh chay

```powershell
cd "c:\Users\Administrator\Desktop\Clone Web\node_admin_ts"
$env:Path = 'C:\Program Files\Git\cmd;' + $env:Path
git init
git add .
git commit -m "render-ready node app"
git branch -M main
git remote add origin <REPO_URL>
git push -u origin main
```

Sau do qua Render tao service va gan domain.

# PAWPAL

ร้านสัตว์เลี้ยงภาษาไทย Responsive สร้างด้วย Next.js 16 (App Router), React และ TypeScript เผยแพร่บน Netlify เก็บข้อมูลใน libSQL (Turso) เก็บรูปสินค้าและสลิปใน Netlify Blobs และลงชื่อเข้าใช้ด้วยบัญชี Google

## สิ่งที่ทำงานแล้ว

- หน้าร้านออกแบบใหม่โทนม่วง/เหลือง พร้อมฉาก Three.js ที่โหลดอัตโนมัติ มีสุนัข แมว และกระต่าย ลากหมุนฉากและแตะทักทายได้
- แสงและเงาแบบ real-time, กล้องตอบสนองเมาส์, scroll reveal, หมวดสัตว์แบบภาพแนวตั้ง และการ์ดสินค้าที่ตอบสนองการชี้เมาส์
- หยุดแอนิเมชันได้ รองรับ reduced motion, พักการวาดฉากเมื่ออยู่นอกจอ และมีภาพสำรองเมื่อ WebGL ไม่พร้อม
- ค้นหา กรองตามสัตว์/หมวดหมู่ เรียงราคา ดูรายละเอียดสินค้า รายการโปรด และตะกร้าในอุปกรณ์
- แกลเลอรีสินค้าสูงสุด 8 ภาพ เลื่อนด้วยนิ้ว/ปุ่ม/คีย์บอร์ด ซูมภาพ และจัดลำดับภาพปกในหลังบ้าน
- ลิงก์ตรงไปยังสินค้า แชร์ผ่าน LINE, Facebook, X, เมนูแชร์ของอุปกรณ์ และคัดลอกลิงก์
- เลือกจำนวนและซื้อทันทีได้โดยเก็บตะกร้าเดิมไว้ พร้อมสินค้าที่เกี่ยวข้องและแชตถามร้านจากหน้าสินค้า
- รีวิว 1–5 ดาวจากผู้ซื้อที่คำสั่งซื้อจัดส่งแล้ว แก้ไขรีวิวเดิมได้ และแยกรีวิวโหมดทดลองจากโหมดขายจริง
- สั่งซื้อ คำนวณค่าจัดส่งจากฝั่งเซิร์ฟเวอร์ ตรวจยอดซ้ำ ป้องกันคำสั่งซื้อซ้ำ และจองสต็อกแบบ atomic
- แนบสลิป JPG/PNG/WebP ไม่เกิน 3 MB เก็บใน Netlify Blobs (ในเครื่องใช้โฟลเดอร์ `.data/blobs`); ตรวจสิทธิ์เจ้าของคำสั่งซื้อและแอดมินก่อนอ่านไฟล์
- ลงชื่อเข้าใช้ด้วยบัญชี Google ทั้งลูกค้าและเจ้าของร้าน เซสชันเก็บในคุกกี้ที่เซิร์ฟเวอร์เซ็น HMAC-SHA256 (httpOnly, SameSite=Lax, ใช้ prefix `__Host-` บน production) ต้องลงชื่อเข้าใช้ก่อนสั่งซื้อ
- สิทธิ์แอดมินมาจาก allowlist `ADMIN_EMAIL` เทียบกับอีเมล Google ที่ยืนยันแล้ว ถ้าไม่ได้ตั้งค่าไว้จะไม่มีใครเป็นแอดมิน
- แอดมินเพิ่ม/แก้ไข/ซ่อน/คืนสินค้า อัปโหลดรูป จัดการสต็อก ตรวจสลิป และบันทึกเลขพัสดุ
- แชตสองทางพร้อมประวัติในฐานข้อมูล อัปเดตทุก 4 วินาที ไม่ใช่บอตตอบอัตโนมัติ
- ปรับบัญชีธนาคาร ค่าจัดส่ง เงื่อนไขคืนสินค้า และโหมดทดลองจากหลังบ้าน
- คำสั่งซื้อที่ยังไม่แนบสลิปเกิน 24 ชั่วโมงถูกยกเลิกและคืนสต็อกเมื่อมีคำขอ API ครั้งถัดไป

## ก่อนเปิดรับเงินจริง

ขณะส่งมอบเป็นโหมดทดลอง ใช้สินค้าและภาพแพ็กเกจสมมติ ไม่มีเลขบัญชีธนาคาร และยังไม่ได้ตั้งอีเมลแอดมินสำหรับระบบออนไลน์ตามคำขอผู้ใช้

1. ทำตาม [คู่มือนำขึ้นเว็บบน Netlify](docs/deploy-netlify.md) ให้ครบทุกขั้น จนหน้าร้านเปิดได้และลงชื่อเข้าใช้ด้วย Google ได้จริง
2. ตั้ง `ADMIN_EMAIL` ใน Netlify ให้ตรงบัญชี Google ของเจ้าของร้าน (อีเมลที่ Google ยืนยันแล้ว) แล้ว deploy ใหม่ ถ้าไม่ตั้ง จะไม่มีใครเป็นแอดมินเลย ผู้ที่ไม่มีอีเมลใน allowlist จะเข้า API แอดมินไม่ได้
3. ตั้ง `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TURSO_DATABASE_URL` และ `TURSO_AUTH_TOKEN` ใน Netlify ให้ครบ ถ้าไม่มี `SESSION_SECRET` ระบบจะไม่ยอมให้ใครลงชื่อเข้าใช้เลย ซึ่งเป็นพฤติกรรมที่ตั้งใจไว้
4. ลงชื่อเข้าใช้ที่ `/admin` ด้วยบัญชี Google ที่อยู่ใน `ADMIN_EMAIL` รุ่นนี้ไม่มีรหัสผ่านของร้านเองและไม่มีการลงชื่อเข้าใช้ด้วย LINE
5. เปลี่ยนสินค้าตัวอย่างให้เป็นสินค้าจริง รวมภาพ ราคา สต็อก ข้อมูลฉลาก และเงื่อนไขร้าน
6. **ตั้งเลขบัญชีรับเงินจริงในหลังบ้านก่อนปิดโหมดทดลอง** ตราบใดที่ยังไม่มีเลขบัญชีที่ถูกต้อง ห้ามปิดโหมดทดลอง เพราะลูกค้าจะโอนเงินไปผิดที่ และร้านต้องตรวจเงินเข้าบัญชีจริงก่อนยืนยันสลิปทุกครั้ง ระบบไม่มีบริการตรวจสลิปธนาคารอัตโนมัติ
7. ลบหรือซ่อนคำสั่งซื้อ แชต และรีวิวตัวอย่างที่ติดมากับฐานข้อมูลสาธิต ข้อมูลชุดนั้นผูกกับรหัสผู้ใช้ของระบบเดิม จึงไม่มีบัญชี Google ใดตรงกับมันอีก แต่ยังโผล่ในหลังบ้าน
8. การยกเลิกคืนเฉพาะสต็อก หากรับเงินแล้วร้านต้องดำเนินการคืนเงินแยกต่างหาก

## รันในเครื่อง

ต้องใช้ Node.js 22.13 ขึ้นไป และ npm

```sh
npm ci
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

แก้ `.env` ให้มีอย่างน้อยสามค่านี้สำหรับเครื่องนี้

```ini
ADMIN_EMAIL=dev@pawpal.test
SESSION_SECRET=<ข้อความสุ่มยาว ๆ>
PAWPAL_DEV_AUTH=1
```

แล้วสร้างฐานข้อมูลกับรันเซิร์ฟเวอร์

```sh
npm run db:migrate       # = node scripts/db-migrate.mjs
npm run dev              # = next dev -H 127.0.0.1 (เพิ่ม -- -p 3000 เพื่อเลือกพอร์ต)
```

`npm run db:migrate` ใช้ migration ทั้งหมดใน `drizzle/` ตามลำดับ ครั้งละหนึ่งรอบเท่านั้น ค่าเริ่มต้นลงไฟล์ `file:.data/local.db`; ตั้ง `TURSO_DATABASE_URL` (และ `TURSO_AUTH_TOKEN`) เพื่อชี้ไปฐานข้อมูล hosted เติม `--fresh` เพื่อลบไฟล์เดิมแล้วเริ่มใหม่ หรือ `--status` เพื่อดูสถานะโดยไม่แก้อะไร (`npm run db:migrate -- --status`)

รูปสินค้าและสลิปในเครื่องเก็บที่ `.data/blobs` โดยอัตโนมัติ ไม่ต้องมีบัญชี Netlify; ตั้ง `PAWPAL_BLOBS_DIR` เมื่อรัน production build ในเครื่อง

เมื่อ `PAWPAL_DEV_AUTH=1` ปุ่ม “ลงชื่อเข้าใช้ด้วย Google” จะพาไปที่ `/auth/dev` ซึ่งเซ็นเซสชันในเครื่องให้ทันทีโดยไม่ต้องติดต่อ Google เส้นทางนี้ตอบ 404 เสมอเมื่อ `NODE_ENV=production` เมื่อไม่ได้ตั้ง `PAWPAL_DEV_AUTH=1` หรือเมื่อมีตัวแปรสภาพแวดล้อม `NETLIFY*` อยู่ จึงเข้าถึงไม่ได้บนเว็บไซต์ที่เผยแพร่แล้ว `ADMIN_EMAIL=dev@pawpal.test` ใน `.env` มีไว้ทดสอบในเครื่องเท่านั้นและไม่ถูก commit

`npm run dev` ผูกกับ `127.0.0.1` ด้วยเหตุผลด้านความปลอดภัย: `/auth/dev` ออกเซสชันด้วยอีเมลที่ผู้เรียกกำหนดเอง จึงรับเฉพาะคำขอที่มาถึง `127.0.0.1`/`localhost` เท่านั้น และต้องเป็นการเปิดหน้าเว็บของผู้ใช้เอง ไม่ใช่รูปหรือ subresource ที่หน้าเว็บอื่นสั่งโหลด ถ้าไม่ผูกกับ loopback `next dev` จะเปิดทุก interface และคนที่ใช้ Wi-Fi เดียวกันจะเรียกเส้นทางนี้ผ่านหมายเลข LAN ได้

คำสั่ง npm ทั้งหมด

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | `next dev -H 127.0.0.1` เซิร์ฟเวอร์สำหรับพัฒนา |
| `npm run build` | `next build` สร้าง production build (Netlify เรียกคำสั่งนี้) |
| `npm start` | `next start` รัน production build ในเครื่อง |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | ใช้ migrations กับฐานข้อมูล libSQL |
| `npm run db:generate` | `drizzle-kit generate` สร้าง migration ใหม่จาก `db/schema.ts` |

## ตัวแปรสภาพแวดล้อม

ทุกตัวอยู่ใน `.env.example` พร้อมคำอธิบาย ในเครื่องใช้ไฟล์ `.env` (ถูก `.gitignore` ไว้) บนเว็บจริงตั้งในหน้า Netlify ไม่ใช่ในรีโป

| ตัวแปร | มีไว้ทำอะไร | ไม่ตั้งแล้วเป็นอย่างไร |
| --- | --- | --- |
| `SESSION_SECRET` | กุญแจ HMAC-SHA256 ที่ใช้เซ็นคุกกี้เซสชัน และใช้สร้างกุญแจ AES-GCM ที่ปิดผนึกคุกกี้ระหว่างจับมือกับ Google | บน production ไม่มีใครลงชื่อเข้าใช้ได้เลย (ตั้งใจให้เป็นแบบนั้น) นอก production จะสุ่มค่าชั่วคราวต่อโปรเซสพร้อมเตือน |
| `GOOGLE_CLIENT_ID` | OAuth client ของร้าน ใช้เป็นทั้งตัวระบุคำขอและค่า `aud` ที่ตรวจใน id_token | `/signin` ตอบ 503 |
| `GOOGLE_CLIENT_SECRET` | ใช้แลก authorization code เป็น id_token จากฝั่งเซิร์ฟเวอร์ ไม่เคยออกไปถึงเบราว์เซอร์ | `/signin` ตอบ 503 |
| `GOOGLE_REDIRECT_URI` | บังคับค่า redirect_uri เมื่อแอปเดาโดเมนจากคำขอเองไม่ได้ (เช่นอยู่หลัง proxy แปลก ๆ) | แอปสร้างจากโดเมนของคำขอ ซึ่งถูกต้องในกรณีทั่วไป |
| `ADMIN_EMAIL` | allowlist อีเมลแอดมิน คั่นด้วยจุลภาค เทียบกับอีเมล Google ที่ยืนยันแล้ว | ไม่มีใครเป็นแอดมิน ทุกคนได้ 403 จาก API แอดมิน |
| `TURSO_DATABASE_URL` | ฐานข้อมูล libSQL ของร้าน เช่น `libsql://pawpal-org.turso.io` หรือไฟล์ `file:.data/local.db` | บน production ไม่มีฐานข้อมูล เว็บตอบ 503; นอก production ใช้ `file:.data/local.db` |
| `TURSO_AUTH_TOKEN` | token ของฐานข้อมูล Turso | ใช้ได้เฉพาะฐานข้อมูลที่ไม่ต้องใช้ token เช่นไฟล์ในเครื่อง |
| `PAWPAL_BLOBS_DIR` | บังคับให้เก็บรูป/สลิปลงโฟลเดอร์นี้ แทนที่จะใช้ Netlify Blobs | บน Netlify ใช้ Netlify Blobs; นอก production ใช้ `.data/blobs`; บน production ที่ไม่ใช่ Netlify จะตอบ 503 |
| `NETLIFY_BLOBS_STORE` | เปลี่ยนชื่อ store ของ Netlify Blobs | ใช้ชื่อ `pawpal-media` |
| `PAWPAL_DEV_AUTH` | ตั้งเป็น `1` เพื่อเปิด `/auth/dev` สำหรับพัฒนาและสคริปต์ตรวจสอบในเครื่อง **ห้ามตั้งบนเว็บจริง** | `/auth/dev` ตอบ 404 และต้องลงชื่อเข้าใช้ผ่าน Google จริง |

## นำขึ้นเว็บ

Netlify ตรวจพบ Next.js เองและติดตั้ง Next.js Runtime (adapter ของ OpenNext) ให้อัตโนมัติ ไม่มีและต้องไม่มีเซิร์ฟเวอร์ที่เขียนเอง `netlify.toml` ในรีโปกำหนดแค่คำสั่ง build (`npm run build`), publish directory (`.next`) และเวอร์ชัน Node ให้ตรงกับ `engines` ใน `package.json`

ขั้นตอนที่เจ้าของร้านต้องทำเองในเบราว์เซอร์ ตั้งแต่สร้างฐานข้อมูล Turso สร้าง Google OAuth client เชื่อม GitHub กับ Netlify ตั้งตัวแปรสภาพแวดล้อม รัน migrations ไปจนถึงรายการตรวจหลัง deploy อยู่ใน [`docs/deploy-netlify.md`](docs/deploy-netlify.md) **ค่าความลับทุกตัวให้เจ้าของร้านวางเองในหน้าเว็บของผู้ให้บริการ ห้ามพิมพ์ลงในแชตและห้าม commit ลงรีโป**

## ตรวจสอบ

```sh
npm run typecheck
npm run lint
npm run build

# ไม่ต้องมีเซิร์ฟเวอร์
node scripts/verify-migrations.mjs
node scripts/verify-d1-shim.mjs
node scripts/verify-blob-store.mjs
```

```sh
# สคริปต์ด้านล่างยิงคำขอจริงใส่เซิร์ฟเวอร์ในเครื่องที่ตั้ง PAWPAL_DEV_AUTH=1 ไว้
# เช่น npm run dev -- -p 3214 แล้ว export TEST_BASE_URL=http://127.0.0.1:3214
# verify-auth.mjs ต้องได้ SESSION_SECRET ตัวเดียวกับเซิร์ฟเวอร์ ไม่เช่นนั้นจะข้ามการตรวจ
# บางข้อแล้วจบด้วย exit code ไม่เท่ากับ 0 เพื่อไม่ให้อ่านผลผิดว่าผ่านครบ
SESSION_SECRET=<ค่าเดียวกับเซิร์ฟเวอร์> node scripts/verify-auth.mjs   # ตัวตน: header ปลอม คุกกี้ถูกแก้ สิทธิ์แอดมิน ข้อมูลข้ามบัญชี
node scripts/verify-shop.mjs
node scripts/verify-gallery-reviews.mjs
node scripts/verify-slip-upload.mjs

# กรณีที่ต้องตั้งค่าเซิร์ฟเวอร์ต่างออกไป (ดูหัวไฟล์ประกอบ)
node scripts/verify-auth-closed.mjs no-admin     # dev server ที่ไม่ได้ตั้ง ADMIN_EMAIL
node scripts/verify-auth-closed.mjs production   # npm start ของ production build
node scripts/verify-auth-closed.mjs no-secret    # production build ที่ไม่มี SESSION_SECRET
node scripts/verify-auth-closed.mjs google       # production build ที่ตั้ง GOOGLE_CLIENT_ID ไว้
```

Integration test ต้องมีเซิร์ฟเวอร์ในเครื่อง และบัญชีจาก `/auth/dev` ต้องอยู่ใน `ADMIN_EMAIL` จะสร้างข้อมูลทดสอบเฉพาะฐานข้อมูล local และซ่อนสินค้าทดสอบเมื่อเสร็จ ห้ามชี้ไป production

ทดสอบสิทธิ์ การกันสต็อก สลิปปลอม retry/idempotency สลิปเปลี่ยนระหว่างตรวจ การคืนสต็อก และแชต ข้อมูลรายการสินค้ารองรับราคาทศนิยม 2 ตำแหน่ง

## โครงสร้าง

- `app/storefront.tsx`, `app/shopping.tsx`: หน้าร้าน ตะกร้า คำสั่งซื้อ แชต
- `app/product-detail.tsx`, `app/product-detail.css`: แกลเลอรี แชร์สินค้า ซื้อทันที รีวิว และสินค้าที่เกี่ยวข้อง
- `app/experience.tsx`, `app/pet-world.tsx`, `app/redesign.css`: ฉากหลัก โมเดล 3D แบบ procedural และดีไซน์ใหม่ ไม่มีโมเดลหรือภาพจากเว็บอ้างอิง
- `app/admin/`: หลังบ้านและหน้าตรวจสิทธิ์
- `app/api/[...path]/route.ts`: API และ validation
- `lib/server.ts`: สิทธิ์ฐานข้อมูล/ที่เก็บไฟล์ และการตรวจไฟล์
- `lib/session.ts`, `lib/auth.ts`, `app/session.ts`: คุกกี้เซสชันที่เซ็นด้วย HMAC-SHA256, ค่าคอนฟิก Google และตัวตนที่แอปมองเห็น
- `app/signin/`, `app/signout/`, `app/auth/google/callback/`, `app/auth/dev/`: เริ่ม/จบการลงชื่อเข้าใช้ Google (authorization code + PKCE) และผู้ให้บริการสำหรับ development เท่านั้น
- `lib/runtime.ts`, `lib/d1-shim.ts`, `lib/blob-store.ts`: เลือกฐานข้อมูล libSQL และที่เก็บไฟล์ (Netlify Blobs หรือโฟลเดอร์ในเครื่อง)
- `db/schema.ts`, `drizzle/`: schema และ migrations (migration แรกมี triggers สำหรับจอง/คืนสต็อก)
- `scripts/`: migration runner และสคริปต์ตรวจสอบทั้งหมด
- `netlify.toml`, `docs/deploy-netlify.md`: ค่า build ของ Netlify และคู่มือนำขึ้นเว็บ
- `public/images/`: ภาพต้นฉบับสร้างสำหรับ PAWPAL แปลง WebP แล้ว

สินค้าและคำสั่งซื้อบันทึกในฐานข้อมูล libSQL ไม่ได้ใช้ localStorage เป็นฐานข้อมูลร้าน ตะกร้า/รายการโปรดเป็นข้อมูลเฉพาะอุปกรณ์เท่านั้น ยังไม่มีระบบอีเมลแจ้งเตือน ขนส่งอัตโนมัติ หรือภาษีเต็มรูปแบบ คำสั่งซื้อ/แชต/รีวิวเดิมในฐานข้อมูลตัวอย่างผูกกับรหัสผู้ใช้ของระบบเดิม จึงไม่ตรงกับบัญชี Google ใหม่และจะไม่ปรากฏให้ผู้ใช้คนใดเห็น

แรงบันดาลใจด้านคาแรกเตอร์และ motion: [Spacers](https://spacers.wannathis.one/), [ATMOS](https://atmos.leeroy.ca/), [Gemini](https://exp-gemini.lusion.co/style) ปรับเป็นเมนูช้อปปิ้งปกติที่ใช้บนมือถือได้โดยไม่ต้องผ่านฉากเปิดหรือบังคับทิศทางจอ

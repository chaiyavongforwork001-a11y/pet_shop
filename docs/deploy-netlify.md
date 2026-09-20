# เปิดเว็บไซต์ PAWPAL บน Netlify

คู่มือนี้เขียนให้เจ้าของร้านทำเองผ่านเบราว์เซอร์ ทำตามลำดับจากบนลงล่าง ข้ามขั้นไม่ได้เพราะขั้นหลังต้องใช้ค่าจากขั้นก่อนหน้า

## กฎเรื่องความลับ อ่านก่อนเริ่ม

- ค่าที่เป็นความลับ (`TURSO_AUTH_TOKEN`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`) **เจ้าของร้านเป็นคนคัดลอกและวางเองในหน้าเว็บของ Turso, Google Cloud Console และ Netlify เท่านั้น**
- **ห้ามพิมพ์หรือวางค่าเหล่านี้ลงในแชตกับผู้ช่วย AI ห้ามส่งทางไลน์/อีเมล และห้าม commit ลงใน repo**
- ไฟล์ `.env` มีไว้สำหรับเครื่องของนักพัฒนาเท่านั้น `.gitignore` กันไม่ให้ถูก commit อยู่แล้ว ส่วน `.env.example` เก็บแค่ชื่อตัวแปรกับคำอธิบาย ไม่มีค่าจริง
- `netlify.toml` ในรีโปมีแค่คำสั่ง build กับเวอร์ชัน Node ไม่มีและต้องไม่มีค่าความลับ
- ถ้าเผลอเปิดเผยค่าไหนไปแล้ว ให้สร้างค่าใหม่ทันที (Turso: rotate token, Google: reset client secret, `SESSION_SECRET`: เปลี่ยนค่าใหม่ ซึ่งจะทำให้ทุกคนถูกลงชื่อออกหนึ่งครั้ง)

---

## 1. สร้างฐานข้อมูล Turso

ข้อมูลสินค้า คำสั่งซื้อ แชต และรีวิวทั้งหมดอยู่ที่นี่

1. สมัคร/เข้าสู่ระบบที่ <https://turso.tech>
2. สร้าง database ใหม่ ตั้งชื่อเช่น `pawpal` เลือก region ที่ใกล้ผู้ซื้อ (เช่น Singapore)
3. เปิดหน้า database แล้วคัดลอก **Database URL** เก็บไว้ หน้าตาเป็น `libsql://pawpal-<ชื่อองค์กร>.turso.io`
4. สร้าง **auth token** ของ database นี้ (ปุ่ม Create Token / Generate Token) คัดลอกเก็บไว้ทันที เพราะหลายบริการแสดงค่าเต็มครั้งเดียว

ได้มาสองค่า เก็บไว้ใช้ในขั้นที่ 4 และ 5

| ค่า | จะใช้เป็นตัวแปรชื่อ |
| --- | --- |
| Database URL | `TURSO_DATABASE_URL` |
| Auth token | `TURSO_AUTH_TOKEN` (ความลับ) |

---

## 2. เชื่อม GitHub repo เข้ากับ Netlify

ทำขั้นนี้ก่อนขั้น Google เพราะต้องรู้ชื่อเว็บไซต์ก่อน จึงจะกรอก redirect URI ของ Google ได้ถูก

1. push branch ที่ต้องการขึ้น GitHub
2. เข้า <https://app.netlify.com> → **Add new site** → **Import an existing project** → เลือก GitHub แล้วเลือก repo นี้
3. เลือก branch ที่จะ deploy
4. Netlify จะตรวจพบ Next.js เองและติดตั้ง Next.js Runtime (ตัว adapter OpenNext) ให้อัตโนมัติ ค่า build ถูกกำหนดไว้แล้วใน `netlify.toml` ของรีโป ไม่ต้องแก้ในหน้าเว็บ
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 22.13.0
5. **อย่าเพิ่งกด Deploy** ให้ข้ามไปตั้งค่า environment variables ก่อน (ขั้นที่ 4) มิฉะนั้น build แรกจะขึ้นเว็บที่ยังไม่มีฐานข้อมูลและยังลงชื่อเข้าใช้ไม่ได้ ถ้ากดไปแล้วก็ไม่เสียหาย แค่ต้อง deploy ซ้ำอีกครั้งหลังตั้งค่าครบ
6. จดชื่อเว็บไซต์ที่ Netlify ตั้งให้ไว้ เช่น `https://pawpal-shop.netlify.app` ถ้าจะใช้โดเมนของร้านเอง ให้ตั้ง custom domain ที่ **Domain management** ตั้งแต่ตอนนี้ แล้วใช้โดเมนนั้นในขั้นถัดไปแทน

> ถ้าเปลี่ยนโดเมนภายหลัง ต้องกลับไปเพิ่ม redirect URI ของโดเมนใหม่ใน Google ด้วย ไม่อย่างนั้นการลงชื่อเข้าใช้จะพัง

---

## 3. สร้าง Google OAuth client

ทั้งลูกค้าและเจ้าของร้านลงชื่อเข้าใช้ด้วย Google ร้านนี้ไม่มีรหัสผ่านของตัวเอง

1. เข้า <https://console.cloud.google.com> สร้าง project ใหม่ (หรือเลือกอันเดิม)
2. ไปที่ **APIs & Services → OAuth consent screen**
   - User type: **External**
   - กรอกชื่อแอป (เช่น PAWPAL) อีเมลผู้ติดต่อ และลิงก์นโยบายถ้ามี
   - Scopes ใช้แค่ `openid`, `email`, `profile` ซึ่งเป็นค่าพื้นฐาน ไม่ต้องขอเพิ่ม
   - ระหว่างยังไม่ publish แอปจะอยู่ในสถานะ **Testing** ซึ่งให้เฉพาะอีเมลที่ใส่ไว้ใน Test users ลงชื่อเข้าใช้ได้ ถ้าจะเปิดให้ลูกค้าทั่วไปซื้อของ ต้องกด **Publish app**
3. ไปที่ **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised redirect URIs** ใส่ให้ครบทุกโดเมนที่จะใช้งานจริง ต้องตรงตัวอักษรต่ออักษร
     - `https://<ชื่อเว็บไซต์>.netlify.app/auth/google/callback`
     - ถ้ามีโดเมนของร้านเอง ใส่ `https://<โดเมนร้าน>/auth/google/callback` เพิ่มอีกบรรทัด
   - ไม่ต้องใส่ `http://localhost` เพราะการพัฒนาในเครื่องใช้ `PAWPAL_DEV_AUTH=1` แทน ไม่ได้ติดต่อ Google
4. คัดลอก **Client ID** และ **Client secret** เก็บไว้

| ค่า | จะใช้เป็นตัวแปรชื่อ |
| --- | --- |
| Client ID | `GOOGLE_CLIENT_ID` |
| Client secret | `GOOGLE_CLIENT_SECRET` (ความลับ) |

---

## 4. ตั้ง environment variables ใน Netlify

ไปที่ **Site configuration → Environment variables** แล้วเพิ่มทีละตัว เลือก scope เป็น **All scopes** และ context เป็น **All deploy contexts** (หรืออย่างน้อย Production)

| ตัวแปร | ค่า | จำเป็น |
| --- | --- | --- |
| `SESSION_SECRET` | ข้อความสุ่มยาว ๆ สร้างเองด้วย `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"` | ใช่ ถ้าไม่ตั้ง จะไม่มีใครลงชื่อเข้าใช้ได้เลย |
| `GOOGLE_CLIENT_ID` | จากขั้นที่ 3 | ใช่ |
| `GOOGLE_CLIENT_SECRET` | จากขั้นที่ 3 | ใช่ |
| `TURSO_DATABASE_URL` | จากขั้นที่ 1 | ใช่ ถ้าไม่ตั้ง เว็บจะตอบ 503 แทนที่จะโชว์ร้านว่าง ๆ |
| `TURSO_AUTH_TOKEN` | จากขั้นที่ 1 | ใช่ |
| `ADMIN_EMAIL` | อีเมล Google ของเจ้าของร้าน คั่นด้วยจุลภาคถ้ามีหลายคน | ใช่ ถ้าไม่ตั้ง จะไม่มีใครเป็นแอดมิน |
| `GOOGLE_REDIRECT_URI` | เว้นว่าง | ไม่ ตั้งเฉพาะกรณีเว็บอยู่หลัง proxy ที่แอปเดาโดเมนเองไม่ได้ |
| `PAWPAL_DEV_AUTH` | **ห้ามตั้ง** | — |
| `NETLIFY_BLOBS_STORE` | เว้นว่าง | ไม่ ค่าเริ่มต้นคือ `pawpal-media` |

หมายเหตุ

- **รูปสินค้าและสลิปไม่ต้องตั้งค่าอะไรเลย** แอปตรวจพบว่าอยู่บน Netlify แล้วใช้ Netlify Blobs เองโดยอัตโนมัติ
- `ADMIN_EMAIL` ต้องเป็นอีเมลที่ Google ยืนยันแล้วของบัญชีที่จะใช้ลงชื่อเข้าใช้จริง ระบบเทียบอีเมลจาก id_token ไม่ใช่จากสิ่งที่ผู้ใช้พิมพ์เอง
- `PAWPAL_DEV_AUTH` เป็นทางลงชื่อเข้าใช้สำหรับเครื่องนักพัฒนา บน production build เส้นทางนั้นตอบ 404 อยู่แล้วแม้จะตั้งค่าไว้ แต่ก็ไม่มีเหตุผลที่จะไปตั้งไว้บนเว็บจริง

---

## 5. รัน migrations ใส่ฐานข้อมูล Turso

ฐานข้อมูลที่เพิ่งสร้างยังว่างเปล่า ไม่มีตารางและไม่มี trigger กันสต็อกติดลบ ต้องรัน migrations หนึ่งครั้งจากเครื่องของเจ้าของร้าน (Netlify ไม่ได้รันให้ตอน deploy โดยตั้งใจ เพราะการแก้โครงสร้างฐานข้อมูลควรเป็นการตัดสินใจของคน ไม่ใช่ผลข้างเคียงของการ push)

ติดตั้ง Node.js 22.13 ขึ้นไป แล้ว

```sh
git clone <repo>
cd pet_website
npm ci
```

macOS / Linux / Git Bash

```sh
TURSO_DATABASE_URL='libsql://...' TURSO_AUTH_TOKEN='...' node scripts/db-migrate.mjs
```

Windows PowerShell

```powershell
$env:TURSO_DATABASE_URL='libsql://...'; $env:TURSO_AUTH_TOKEN='...'; node scripts/db-migrate.mjs
```

ผลลัพธ์ที่ถูกต้องจะขึ้นว่า `Applied 6 migration(s)` และแสดงตาราง `products, orders, order_lines, messages, reviews, settings` กับ trigger สี่ตัว

- ตรวจสถานะโดยไม่แก้อะไร: เติม `--status`
- `--fresh` ลบฐานข้อมูลแล้วเริ่มใหม่ ใช้ได้เฉพาะไฟล์ในเครื่อง **ห้ามใช้กับ Turso ของร้านจริง**
- ปิด terminal แล้วค่า `$env:` จะหายไปเอง อย่าบันทึก token ลงไฟล์ใด ๆ ในโฟลเดอร์โปรเจกต์

---

## 6. Deploy แล้วตรวจให้ครบ

1. ที่ Netlify กด **Deploys → Trigger deploy → Deploy site** (หรือ push commit ใหม่)
2. ดู build log จนขึ้น **Site is live**
3. ตรวจทีละข้อ

   - [ ] เปิดหน้าแรก เห็นสินค้าจากฐานข้อมูล ไม่ใช่หน้า 503
   - [ ] กด “ลงชื่อเข้าใช้ด้วย Google” แล้วเด้งไป `accounts.google.com` จริง
   - [ ] ลงชื่อเข้าใช้ด้วยบัญชีที่อยู่ใน `ADMIN_EMAIL` แล้วเข้า `/admin` เห็นหลังบ้าน
   - [ ] เปิด `https://<เว็บไซต์>/auth/dev` ต้องได้ **404** ถ้าได้อย่างอื่นให้หยุดและแจ้งนักพัฒนาทันที
   - [ ] อัปโหลดรูปสินค้าจากหลังบ้านหนึ่งรูป แล้วรีเฟรชหน้าร้าน รูปต้องยังอยู่ (พิสูจน์ว่า Netlify Blobs ทำงาน)
   - [ ] สั่งซื้อทดลองหนึ่งรายการจากเบราว์เซอร์จริง แนบสลิป แล้วดูว่าขึ้นในหลังบ้าน ขั้นนี้สำคัญเพราะเป็นการพิสูจน์ว่าการกันคำขอข้ามเว็บไซต์ (CSRF) ไม่ได้บล็อกลูกค้าจริง
   - [ ] ลงชื่อเข้าใช้ด้วยบัญชี Google อีกบัญชีที่ **ไม่อยู่ใน** `ADMIN_EMAIL` แล้วเปิด `/admin` ต้องเข้าไม่ได้

4. เมื่อทุกข้อผ่าน จึงค่อยทำรายการใน [“ก่อนเปิดรับเงินจริง”](../README.md#ก่อนเปิดรับเงินจริง) ของ README ให้ครบก่อนปิดโหมดทดลอง

---

## ถ้ามีปัญหา

| อาการ | สาเหตุที่พบบ่อย |
| --- | --- |
| หน้าแรกขึ้น 503 | ยังไม่ได้ตั้ง `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` หรือยังไม่ได้ deploy ซ้ำหลังตั้งค่า |
| หน้าแรกเปิดได้แต่ไม่มีสินค้าเลย | ยังไม่ได้รัน migrations (ขั้นที่ 5) หรือรันใส่ฐานข้อมูลคนละตัว |
| กดลงชื่อเข้าใช้แล้วขึ้น 503 “ยังไม่ได้เชื่อมต่อการลงชื่อเข้าใช้ด้วย Google” | ยังไม่ได้ตั้ง `SESSION_SECRET` หรือ `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` |
| Google ขึ้น `redirect_uri_mismatch` | redirect URI ใน Google ไม่ตรงกับโดเมนที่ใช้จริง ต้องเป็น `https://<โดเมน>/auth/google/callback` เป๊ะ ๆ รวมทั้ง `https` และไม่มี `/` ต่อท้าย |
| ลงชื่อเข้าใช้ได้แต่เข้า `/admin` ไม่ได้ | อีเมลที่ลงชื่อเข้าใช้ไม่ตรงกับ `ADMIN_EMAIL` หรือเปลี่ยนค่าแล้วยังไม่ได้ deploy ซ้ำ |
| ลงชื่อเข้าใช้ได้ แต่สั่งซื้อแล้วขึ้น “ไม่อนุญาตคำขอจากเว็บไซต์อื่น” | proxy หน้าเว็บตัดหัวข้อ `Origin`/`Referer` ทิ้ง ให้แจ้งนักพัฒนา |
| เปลี่ยน environment variable แล้วไม่มีผล | ต้อง deploy ใหม่ Netlify ไม่ได้ใส่ค่าใหม่ให้เว็บที่ deploy ไปแล้ว |
| build ล้มเหลวที่ขั้น secrets scanning | Netlify เจอค่าของตัวแปรความลับโผล่ในไฟล์ผลลัพธ์ **อย่าปิดการสแกน** ให้แจ้งนักพัฒนาหาสาเหตุก่อน |

หมายเหตุสุดท้าย เซสชันเป็นคุกกี้ที่เซ็นไว้และไม่มีระบบเพิกถอนรายคน ถ้าจำเป็นต้องไล่ทุกคนออกจากระบบพร้อมกัน ให้เปลี่ยน `SESSION_SECRET` เป็นค่าใหม่แล้ว deploy ใหม่

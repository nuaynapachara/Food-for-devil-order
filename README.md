# ร้านอาหารปีศาจ — ระบบสั่งอาหาร

โปรเจกต์ Next.js (App Router, JavaScript) สำหรับระบบสั่งอาหารร้านอาหาร ธีม "ร้านอาหารปีศาจ" เชื่อมต่อกับ Supabase และ deploy บน Vercel

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.local.example .env.local   # แล้วใส่ค่า Supabase จริง
npm run dev
```

เปิด http://localhost:3000

## Environment Variables

ต้องตั้งค่าใน `.env.local` (และในหน้า Environment Variables ของโปรเจกต์บน Vercel):

| ชื่อ | คำอธิบาย |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของโปรเจกต์ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key ของ Supabase |

## โครงสร้างฐานข้อมูล (Supabase) ที่มีอยู่แล้ว

- **sessions**: `id`, `table_number`, `adult_count`, `child_count`, `status`, `created_at`
- **menu_categories**: `id`, `name`, `sort_order`
- **menu_items**: `id`, `category_id`, `name`
- **orders**: `id`, `session_id`, `table_number`, `items` (jsonb), `status`, `created_at`

## หมายเหตุสำคัญ — Next.js เวอร์ชันล่าสุด (สำคัญมากสำหรับขั้นตอนถัดไป)

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุดซึ่ง **`params` ของ Dynamic Route เป็น Promise** แล้ว ไม่ใช่ object ธรรมดา

เวลาสร้างหน้าแบบ Dynamic Route (เช่น หน้าสั่งอาหารที่จะรับ `table_number` หรือ `session_id` จาก URL ในขั้นตอนถัดไป) **ต้อง unwrap `params` ด้วย `use()` จาก React เสมอ** ห้ามเข้าถึง `params.xxx` ตรง ๆ

ตัวอย่างรูปแบบที่ต้องใช้ (Client Component):

```jsx
'use client';
import { use } from 'react';

export default function OrderPage({ params }) {
  const { tableNumber } = use(params);
  // ...
}
```

หรือใน Server Component ให้ใช้ `await params`:

```jsx
export default async function OrderPage({ params }) {
  const { tableNumber } = await params;
  // ...
}
```

กฎนี้ใช้กับทั้ง `params` และ `searchParams` ในทุกหน้า Dynamic Route ของโปรเจกต์นี้

## หน้าที่มีในตอนนี้ (สำหรับทดสอบ deploy)

- `/` — หน้าแรก แสดงชื่อร้าน พร้อมลิงก์ไปหน้าอื่น
- `/generate-qr` — placeholder สำหรับสร้าง QR โต๊ะ
- `/kitchen` — placeholder สำหรับหน้าครัว

## Deploy บน Vercel

1. Push โค้ดขึ้น Git repository (GitHub/GitLab/Bitbucket)
2. Import โปรเจกต์เข้า Vercel
3. ตั้งค่า Environment Variables ตามตารางด้านบนในหน้า Project Settings
4. Deploy

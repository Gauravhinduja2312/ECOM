# Student Marketplace E-Commerce Platform

Production-ready e-commerce platform with React + Vite frontend, Node.js + Express backend, Supabase database/auth/storage, Razorpay test payments, and Firebase Hosting deployment support.

## 1) Project Structure

```
/frontend
  /src
    /components
    /pages
    /services
    /utils
/backend
  /routes
  /controllers
  /middleware
  /services
  /utils
/supabase
  schema.sql
```

## 2) Setup

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## 3) Required Environment Variables

### `frontend/.env`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL`
- `VITE_RAZORPAY_KEY_ID`

### `backend/.env`

- `PORT`
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## 4) Supabase Setup

1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in Supabase SQL editor.
3. Create at least one admin user by updating role in `public.users`:

```sql
update public.users set role = 'admin' where email = 'your_admin_email@example.com';
```

## 5) Features Implemented

- Supabase Auth signup/login
- Roles: `user`, `admin`
- Route protection for authenticated and admin routes
- Products list, search, category filtering, detail page
- Cart add/update/remove
- Razorpay test checkout + backend signature verification
- Order + order_items creation and stock decrement
- Invoice PDF download on success page
- User dashboard (orders + total spend)
- Admin dashboard:
  - Product CRUD
  - Orders view
  - CRM users and total spending
  - Sales analytics chart (daily)
- Landing page SEO tags + lead capture form
- Supabase RLS policies for data isolation and admin access

## 6) Razorpay Test Flow

- Frontend creates payment order via backend `/api/payment/create-order`
- Razorpay checkout opens in browser
- On success, frontend sends signature payload to backend `/api/payment/verify-and-create-order`
- Backend verifies signature and writes `orders` + `order_items`, updates stock, clears cart

## 7) Render Deployment (Backend API)

This project includes a Render blueprint at `render.yaml`.

### Option A: Deploy from Render Dashboard

1. Push project to GitHub.
2. In Render, create a new **Web Service** and connect your repo.
3. Use these settings:
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
4. Add environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `FRONTEND_URL=https://ecom-52bb3.web.app,http://localhost:5173`
5. Deploy and copy backend URL, e.g. `https://student-marketplace-backend.onrender.com`.

### Option B: Blueprint deploy

Import repository as **Blueprint** in Render and use `render.yaml`.

## 8) Firebase Hosting Deployment (Frontend)

From `frontend` folder:

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting
# public directory: dist
# single-page app rewrite: yes
firebase deploy
```

If you use existing `firebase.json` and `.firebaserc`, update project id in `.firebaserc` first.

Before deploying frontend, set:

```bash
VITE_BACKEND_URL=https://your-render-service-name.onrender.com
```

## 9) Production Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` only on backend.
- Enforce strict CORS via `FRONTEND_URL`.
- Use Supabase storage bucket `product-images` for real uploads.
- Add observability/logging (e.g., Sentry) before production launch.

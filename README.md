# Harimandir Balopasana

Branch-based student attendance with QR scanning. React + Vite + Supabase.

## Roles

- **Admin** — branches, managers, all students, reports
- **Manager** — scan QR, manage students, reports

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email**: turn off “Confirm email” for internal use (or managers must confirm before login).
3. **SQL Editor**: run the full script in [`supabase/schema.sql`](supabase/schema.sql).
4. **Authentication → Users → Add user**: create your admin (email + password).
5. Copy the user **UUID** from the users table, then run:

```sql
insert into public.profiles (id, email, name, role)
values ('YOUR_USER_UUID', 'admin@tsk.org', 'System Administrator', 'admin');
```

6. Copy **Project URL** and **anon public** key from **Settings → API**.

### 3. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Use the **Project URL** from **Settings → API** (e.g. `https://abcdefgh.supabase.co`). Do **not** add `/rest/v1` — the app adds that automatically.

### 4. Run locally

```bash
npm run dev
```

Sign in with the admin user you created.

## Deploy (Netlify)

The repo includes `netlify.toml` (build + SPA redirects).

### 1. Environment variables (required)

In **Netlify → Site configuration → Environment variables**, add:

| Key | Value |
|-----|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` (Project URL only, **not** `/rest/v1`) |
| `VITE_SUPABASE_ANON_KEY` | Anon public key from Supabase → **Settings → API** |

Then **Deploys → Trigger deploy → Deploy site** (a new build is required; changing env alone is not enough).

### 2. Supabase Auth URLs (required for live login)

In **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://YOUR-SITE.netlify.app` (your real Netlify URL)
- **Redirect URLs:** add `https://YOUR-SITE.netlify.app/**`

Save, then try signing in on the live site with the same email/password you use locally.

### 3. If login still fails on Netlify

- Confirm the user exists under **Authentication → Users** and is **confirmed**
- Confirm `profiles` has a row with `role` = `admin` or `manager` for that user
- Turn off **Confirm email** under **Authentication → Providers → Email** (or confirm the user by email)
- Check the red error on the login form (e.g. invalid credentials vs no profile)

## Managers

Admins create managers in **Managers** with email + password. Passwords are hashed by Supabase Auth.

In **Authentication → Providers → Email**, turn off **Confirm email** so new managers are not sent verification emails.

If sign-up is rate-limited, add the user manually in **Authentication → Users** (enable **Auto Confirm User**), then set their profile role to `manager` in SQL.

## Storage

Student photos are stored in the `student-photos` bucket (public read). Created by `schema.sql`.

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run lint` | ESLint             |

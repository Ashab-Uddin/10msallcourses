# 10msallcourses.com — 10 Minute School Affiliate Course Portal

A production-ready Next.js 15 App Router affiliate course catalog and admin management platform for **10 Minute School** courses (`10msallcourses.com`). Built with TypeScript, Tailwind CSS v4, SSR SEO metadata, structured data (JSON-LD), real-time course offer countdown timers, and Vercel-compatible persistence & cloud media upload.

---

## Key Features

- **Dynamic Public Course Portal**:
  - Dedicated academic batch routes (`/hsc/hsc-28`, `/hsc/hsc-27`, `/hsc/hsc-26`, `/ssc/ssc-27`, `/ssc/ssc-28`, `/class-6`, `/class-7`, `/class-8`) and category pages (`/skills`, `/admission`, `/category/[slug]`).
  - Instant search, category filtering, popular course filtering, and responsive 16:9 / 1:1 non-cropped course thumbnails.
  - Real-time Homepage Offer Countdown Timers synced with server time and linked directly to active courses.
  - Safe affiliate URL redirect gateway (`/go/[slug]`) that preserves query/tracking parameters (`aff`, `ref`, `utm_*`, `fbclid`, `gclid`), blocks closed/inactive courses, and tracks clicks.
- **Secured Admin Dashboard (`/admin/login`, `/admin/dashboard`)**:
  - HMAC-SHA256 signed session tokens with `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies and rate-limited login protection.
  - Full CRUD for Courses (with live public card preview, status toggle, search, category/status filters, and pagination), Categories (with slug cascade & delete protection), Offer Countdown Timers (create, edit, pause/resume, delete), and Portal Settings (call/WhatsApp/Messenger contact links, hero copy, default affiliate ref).
  - Optimized thumbnail upload pipeline (client-side WebP resizing + server-side MIME & magic-byte validation) supporting **Vercel Blob** and **Cloudinary**.
- **SEO & Production Security**:
  - Dynamic `sitemap.xml`, `robots.txt`, OpenGraph/Twitter tags, canonical URLs, and Schema.org JSON-LD (`Organization`, `WebSite`, `ItemList`, `Course`, `BreadcrumbList`).
  - Security headers (`HSTS`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` on Vercel), open-redirect protection, and per-IP rate limiting on public & auth endpoints.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + `lucide-react` icons
- **Persistence**:
  - **Production (Vercel)**: Upstash Redis / Vercel KV REST API (auto-seeded from `data/database.json` on first run)
  - **Local Development**: Atomic JSON file storage (`data/database.json`)
- **Media Upload**: Vercel Blob (`BLOB_READ_WRITE_TOKEN`) or Cloudinary (`CLOUDINARY_*`), with size-capped inline fallback for local testing

---

## Local Development Setup

### Prerequisites
- Node.js `20+`
- npm `10+`

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from the template:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a random 64-character `ADMIN_SESSION_SECRET` (generate via `openssl rand -hex 32`).
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` (Public site) or `http://localhost:3000/admin/login` (Admin dashboard).

### Production Build & Lint Check
```bash
npm run lint
npm run build
```

---

## Environment Variables

| Variable | Required in Prod | Description |
| --- | --- | --- |
| `APP_URL` | Recommended | Canonical domain (e.g., `https://10msallcourses.com`) |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public site URL for metadata/canonical tags |
| `ADMIN_EMAIL` | **Yes** | Admin login email address |
| `ADMIN_PASSWORD` | **Yes** (or hash) | Strong admin login password |
| `ADMIN_PASSWORD_HASH` | Optional | Alternative to `ADMIN_PASSWORD` (`sha256:<hex>` or `scrypt:<salt>:<hex>`) |
| `ADMIN_NAME` | Optional | Display name inside the admin dashboard |
| `ADMIN_SESSION_SECRET` | **Yes** | 64-char random hex secret for signing session tokens |
| `UPSTASH_REDIS_REST_URL` | **Recommended** | Upstash Redis REST URL for persistent Vercel storage |
| `UPSTASH_REDIS_REST_TOKEN` | **Recommended** | Upstash Redis REST token |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Vercel Blob read/write token for course thumbnail uploads |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name (alternative to Vercel Blob) |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret |

---

## Deploying to Vercel via GitHub

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Production-ready 10msallcourse affiliate platform"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
   - Framework Preset: **Next.js** (auto-detected). Build command: `npm run build`.
3. **Connect Persistent Database (Upstash Redis)**:
   - In your Vercel project, open **Storage -> Create Database -> Upstash Redis** (or connect an existing Upstash Redis instance).
   - This automatically injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
   - On first request, the app automatically seeds Redis with all existing courses, categories, and settings from `data/database.json`.
4. **Connect Cloud Media Storage (Vercel Blob)**:
   - In **Storage -> Create Database -> Blob**, create a Blob store and link it to your project (`BLOB_READ_WRITE_TOKEN`).
   - Alternatively, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
5. **Configure Required Environment Variables**:
   - In **Project Settings -> Environment Variables**, add `APP_URL`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, and `ADMIN_SESSION_SECRET`.
6. **Deploy & Connect Custom Domain**:
   - Trigger a deployment.
   - Under **Settings -> Domains**, add `10msallcourses.com` and `www.10msallcourses.com` and update your registrar's DNS `A` / `CNAME` records as instructed by Vercel.

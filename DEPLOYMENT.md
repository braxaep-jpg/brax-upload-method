# Deployment Plan

This guide covers deploying **TikTok Video Optimizer** to production with a public domain.

## Goal

Deploy the frontend on Vercel and the backend on Railway or Render, using:
- `https://tiktokvideooptimizer.com`
- `https://api.tiktokvideooptimizer.com`

## Prerequisites

- GitHub account
- Vercel account
- Railway or Render account
- Registered domain: `tiktokvideooptimizer.com`
- Node.js 18+ locally
- npm 9+ locally
- ffmpeg installed locally for build/test

## Repository setup

```bash
git clone https://github.com/brax-studio/brax-upload-method.git
cd brax-upload-method
npm install
cp .env.example .env
```

Edit `.env` locally if you run the project locally.

## Public domain plan

1. Register `tiktokvideooptimizer.com` in your DNS provider.
2. Create a DNS `A` or `CNAME` record for the frontend domain.
3. Create a DNS `CNAME` record for the API subdomain.
4. Configure the frontend and backend providers to use these domains.

## Frontend deployment: Vercel

### Step 1: Prepare Vercel

```bash
npm install -g vercel
vercel login
```

### Step 2: Deploy frontend

```bash
cd frontend
vercel --prod
```

During deployment, set the frontend environment variables:

- `VITE_API_URL` = `https://api.tiktokvideooptimizer.com`
- `VITE_SITE_URL` = `https://tiktokvideooptimizer.com`

### Step 3: Attach custom domain

1. In Vercel dashboard, open the frontend project.
2. Go to `Domains`.
3. Add `tiktokvideooptimizer.com`.
4. Follow Vercel DNS instructions.
5. Wait until the domain is verified and HTTPS is active.

### Step 4: Confirm

Open:
- `https://tiktokvideooptimizer.com`
- `https://api.tiktokvideooptimizer.com/api/health`

Expected API response:

```json
{ "status": "ok" }
```

## Backend deployment: Railway

### Option: Railway (recommended)

```bash
npm install -g railway
railway login
cd backend
railway init
railway up
```

When Railway asks for service configuration, choose a Node.js web service.

### Set environment variables

```bash
railway env add PORT 4000
railway env add NODE_ENV production
railway env add FFMPEG_PATH /usr/bin/ffmpeg
railway env add FRONTEND_ORIGIN https://tiktokvideooptimizer.com
```

### Add custom domain

1. In Railway dashboard, open the backend service.
2. Add custom domain: `api.tiktokvideooptimizer.com`.
3. Add the DNS records Railway provides.
4. Wait for verification.

### Build command

Railway should use:

- Build: `npm run backend:build`
- Start: `node dist/server.js`

## Backend deployment: Render (alternative)

1. Create Web Service in Render.
2. Connect GitHub repository.
3. Set `Root directory` to `backend`.
4. Set Build Command: `npm run build`
5. Set Start Command: `node dist/server.js`
6. Add environment variables:
   - `PORT` = `4000`
   - `NODE_ENV` = `production`
   - `FFMPEG_PATH` = `/usr/bin/ffmpeg`
   - `FRONTEND_ORIGIN` = `https://tiktokvideooptimizer.com`
7. Add custom domain: `api.tiktokvideooptimizer.com`.
8. Add the DNS record provided by Render.

## DNS setup

### Frontend domain

- `tiktokvideooptimizer.com` → Vercel-managed domain
- If using external DNS, add records as Vercel instructs

### API subdomain

- `api.tiktokvideooptimizer.com` → Railway or Render
- Use the exact DNS record value from the hosting provider

## Required code/config changes

### Frontend

`frontend/src/config.ts` should use environment variables:

```ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.tiktokvideooptimizer.com';
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tiktokvideooptimizer.com';
```

### Backend

`backend/src/server.ts` should whitelist these origins:

```ts
const allowedOrigins = [
  frontendOrigin,
  'https://tiktokvideooptimizer.com',
  'https://api.tiktokvideooptimizer.com'
];
```

### Extension

`extension/src/config.js` should default to production URLs:

```js
const DEFAULT_CONFIG = {
  backendUrl: 'https://api.tiktokvideooptimizer.com',
  frontendUrl: 'https://tiktokvideooptimizer.com'
};
```

## Testing before PR

1. Local frontend:
   ```bash
   npm run frontend:start
   ```
2. Local backend:
   ```bash
   npm run backend:start
   ```
3. Visit `http://localhost:5173` and verify upload/optimize flow.
4. Open `http://localhost:4000/api/health`.

## Public deployment checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Railway or Render
- [ ] `tiktokvideooptimizer.com` connected to Vercel
- [ ] `api.tiktokvideooptimizer.com` connected to Railway/Render
- [ ] HTTPS active on both domains
- [ ] `VITE_API_URL` set to `https://api.tiktokvideooptimizer.com`
- [ ] `VITE_SITE_URL` set to `https://tiktokvideooptimizer.com`
- [ ] CORS configured for production domains
- [ ] `README.md` and `DEPLOYMENT.md` updated
- [ ] `boot`-up test successful

## PR-ready instruction

1. Create branch: `git checkout -b deploy/public-domain`
2. Commit changes:
   - `frontend/src/config.ts`
   - `extension/src/config.js`
   - `backend/src/server.ts`
   - `.env.example`
   - `README.md`
   - `DEPLOYMENT.md`
3. Push branch and open PR.
4. In PR description include:
   - target domain: `tiktokvideooptimizer.com`
   - API domain: `api.tiktokvideooptimizer.com`
   - hosting plan: frontend on Vercel, backend on Railway/Render
   - test commands: `npm run build`, `npm run frontend:start`, `npm run backend:start`

## Notes

- This plan assumes `tiktokvideooptimizer.com` is available and registered.
- If the domain is not yet purchased, substitute it with the actual domain name used.
- For production, ensure `ffmpeg` is installed on the backend host.

- Issues: [GitHub Issues](https://github.com/brax-studio/brax-upload-method/issues)
- Documentation: [Wiki](https://github.com/brax-studio/brax-upload-method/wiki)
- Email: support@brax-upload.com

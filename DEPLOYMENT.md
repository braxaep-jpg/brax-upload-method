# Deployment Plan

This application runs independently on your own computer or VPS. The backend serves the built frontend, so Railway is not required.

## Free Render deployment

The repository includes `render.yaml`. To deploy without using your computer as a server:

1. Push the repository to GitHub.
2. Open Render and choose **New +** -> **Blueprint**.
3. Select the repository and confirm the `render.yaml` configuration.
4. Wait for the Docker build to finish.
5. Open the generated `https://brax-video-optimizer.onrender.com` URL.

Render will build the frontend and backend together, create the access secret automatically, and expose `/api/health` as its health check. The free service may sleep after inactivity, so the first request after a pause can take some time.

## Requirements

- Docker Desktop, or Node.js 18+ and ffmpeg
- A domain name only if you want public access

## Docker deployment

Create `.env` in the repository root:

```env
ACCESS_SECRET=replace-this-with-a-long-random-secret
FRONTEND_ORIGIN=https://your-domain.example
```

Build and start the single application service:

```bash
docker compose up -d --build
```

The site and API are available on port `4000`:

```text
http://your-server:4000
http://your-server:4000/api/health
```

The health endpoint should return `{"status":"ok"}`. Keep `ACCESS_SECRET` unchanged between restarts so access tokens remain valid until they expire.

For a public domain, point the domain DNS record to the server and proxy HTTPS traffic to port `4000` with Nginx, Caddy, or another reverse proxy.

## Node deployment without Docker

Install dependencies, build both workspaces, then start the backend:

```bash
npm install
npm run build
```

Windows PowerShell:

```powershell
$env:PORT = "4000"
$env:ACCESS_SECRET = "replace-this-with-a-long-random-secret"
$env:FRONTEND_ORIGIN = "http://localhost:4000"
node backend/dist/server.js
```

Linux/macOS:

```bash
PORT=4000 ACCESS_SECRET=replace-this-with-a-long-random-secret FRONTEND_ORIGIN=http://localhost:4000 node backend/dist/server.js
```

Open `http://localhost:4000`. The production frontend uses same-origin API requests automatically, so no Railway URL is needed.

## Separate frontend hosting

If you intentionally host the frontend separately, set this variable during the Vite build:

```env
VITE_API_BASE_URL=https://your-api-domain.example
```

The backend must then set `FRONTEND_ORIGIN` to the exact frontend origin.

## Maintenance

```bash
docker compose logs -f app
docker compose restart app
docker compose down
```

The `tmp` directory is mounted as a volume for temporary video processing files.

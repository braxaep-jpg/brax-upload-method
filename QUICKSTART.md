# ⚡ Quick Start Guide

Get **Brax Upload Method** running in 5 minutes.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (comes with Node.js)
- ffmpeg 8.0+ ([Download](https://ffmpeg.org/download.html))
  - Windows: Use [Topaz Video AI](https://www.topazlabs.com/) or [Gyan.dev build](https://www.gyan.dev/ffmpeg/builds/)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

## 1️⃣ Clone Repository

```bash
git clone https://github.com/brax-studio/brax-upload-method.git
cd brax-upload-method
```

## 2️⃣ Install Dependencies

```bash
npm install
```

## 3️⃣ Start Development Servers

**Terminal 1 - Backend (API):**
```bash
npm run backend:start
# Runs on http://localhost:4000
```

**Terminal 2 - Frontend (UI):**
```bash
npm run frontend:start
# Runs on http://localhost:5173
```

## 4️⃣ Open in Browser

Visit: **http://localhost:5173**

## 5️⃣ Install Browser Extension

1. Open Chrome/Edge and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from the project
5. Visit TikTok.com and start uploading a video
6. See the Brax banner appear

## ✅ You're Done!

- 📤 Upload a video to test
- 📊 See analysis results
- 🚀 Download optimized version

---

## 🧪 Quick Test

```bash
# Test backend API
curl http://localhost:4000/api/health
# Expected: { "status": "ok" }

# Upload a test video via frontend at http://localhost:5173
```

## 🐛 Troubleshooting

### ffmpeg not found
```bash
# Check if ffmpeg is in PATH
ffmpeg -version

# If not, set path in .env
FFMPEG_PATH=C:\path\to\ffmpeg.exe
FFPROBE_PATH=C:\path\to\ffprobe.exe
```

### Port 4000 already in use
```bash
# Find process using port
netstat -ano | findstr :4000  # Windows
lsof -i :4000                  # macOS/Linux

# Kill process or change port in backend/package.json
```

### Extension not showing on TikTok
1. Reload extension in `chrome://extensions`
2. Hard refresh TikTok page (Ctrl+Shift+R)
3. Check Console for errors (F12 → Console)

---

## 📁 Project Structure

```
brax-upload-method/
├── backend/          # Express API (Node.js)
├── frontend/         # React UI (TypeScript + Vite)
├── extension/        # Chrome extension (Manifest V3)
├── README.md         # Full documentation
├── QUICKSTART.md     # This file
└── DEPLOYMENT.md     # Production deployment guide
```

## 📚 Next Steps

- **Customize:** Edit `backend/src/videoAnalyzer.ts` for different optimization profiles
- **Deploy:** See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- **Contribute:** See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

## 🎯 Common Tasks

### Run tests
```bash
npm test
```

### Build for production
```bash
npm run build
```

### Format code
```bash
npm run lint
npm run format
```

### Check for errors
```bash
npm run type-check
```

## 📖 Documentation

- **[README.md](README.md)** - Full project overview
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment to production
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[PRIVACY.md](PRIVACY.md)** - Privacy policy

## 🤝 Need Help?

- 📖 Check [GitHub Wiki](https://github.com/brax-studio/brax-upload-method/wiki)
- 🐛 Open [GitHub Issue](https://github.com/brax-studio/brax-upload-method/issues)
- 💬 Join [GitHub Discussions](https://github.com/brax-studio/brax-upload-method/discussions)

## 📦 What's Next?

Once you're comfortable with local development:

1. **Make changes** to the code
2. **Test locally**
3. **Push to GitHub** with meaningful commit messages
4. **Deploy to production** (Vercel + Railway)
5. **Submit extension** to Chrome Web Store

See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for full deployment guide.

---

**Happy coding!** 🚀

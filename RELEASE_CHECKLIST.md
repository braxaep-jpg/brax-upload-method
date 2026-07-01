# 🚀 Public Release Checklist

Follow this checklist to make **Brax Upload Method** publicly available on GitHub, Chrome Web Store, and deploy to production.

## Phase 1: GitHub Repository (Day 1)

### Step 1.1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create new repository:
   - **Name:** `brax-upload-method`
   - **Description:** `TikTok Video Optimizer - Analyze and optimize videos before upload`
   - **Visibility:** Public
   - **Initialize:** Add README (we have one), .gitignore (we have one)
3. Click "Create repository"

### Step 1.2: Push Code to GitHub

```bash
cd C:\Users\brax\BraxUploadMethod

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit: Brax Upload Method MVP"

# Add remote
git remote add origin https://github.com/your-username/brax-upload-method.git

# Push to GitHub
git branch -M main
git push -u origin main

# Verify
git remote -v
```

### Step 1.3: Add GitHub Topics

1. Go to repository Settings
2. Add topics: `tiktok` `video-optimization` `ffmpeg` `typescript` `react` `browser-extension`

### Step 1.4: Enable GitHub Pages (Optional)

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, /docs folder (or /README.md)

**Status After Phase 1:** ✅ Code is public on GitHub

---

## Phase 2: Frontend Deployment (Day 1-2)

### Step 2.1: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy frontend
cd frontend
vercel --prod
```

**During deployment:**
- Project name: `brax-upload-method`
- Source: Connect GitHub repo
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Step 2.2: Add Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select project → Settings → Environment Variables
3. Add variables:
   - `VITE_API_URL` = `https://api.brax-upload.com` (will update after backend deploy)
   - `VITE_NODE_ENV` = `production`

### Step 2.3: Verify Frontend

- Visit deployed URL (e.g., `brax-upload-method.vercel.app`)
- Test upload functionality (will fail until backend deployed)
- Check console for errors

**Status After Phase 2:** ✅ Frontend deployed, ready for backend connection

---

## Phase 3: Backend Deployment (Day 2-3)

### Step 3.1: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Select: Node.js
# Configure environment variables when prompted
```

**Or use Railway Dashboard:**
1. Go to [Railway](https://railway.app)
2. Create new project → GitHub repo
3. Set build command: `npm run backend:build`
4. Set start command: `node backend/dist/server.js`

### Step 3.2: Configure Environment Variables

Railway Dashboard → Variables → Add:

```
PORT=4000
NODE_ENV=production
FFMPEG_PATH=/usr/bin/ffmpeg
```

### Step 3.3: Update Frontend API URL

1. Go back to Vercel Dashboard
2. Settings → Environment Variables
3. Update: `VITE_API_URL` = `https://your-railway-api.railway.app`
4. Redeploy frontend: `vercel --prod`

### Step 3.4: Test Backend

```bash
curl https://your-railway-api.railway.app/api/health
# Expected: { "status": "ok" }
```

### Step 3.5: Update Extension

1. Edit `extension/src/contentScript.js`:
   ```javascript
   const uiUrl = 'https://brax-upload-method.vercel.app'; // Production URL
   ```
2. Commit changes

**Status After Phase 3:** ✅ Full stack deployed and connected

---

## Phase 4: Chrome Web Store Submission (Day 3-5)

### Step 4.1: Create Chrome Web Store Account

1. Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
2. Pay $5 developer registration fee
3. Verify email

### Step 4.2: Prepare Extension Package

```bash
# Create ZIP file
cd extension
7z a -r brax-upload-method.zip . -x "*node_modules*" "*.git*"

# Or on Linux/macOS:
zip -r brax-upload-method.zip . -x "node_modules/*" ".git/*"
```

### Step 4.3: Prepare Store Listing

Gather the following:

**Required Images:**
1. **Icon (128x128)** - `extension/icons/icon-128.png` ✅ (has SVG, convert to PNG)
2. **Screenshots (1280x800):**
   - Screenshot 1: Main upload interface
   - Screenshot 2: Analysis results
   - Screenshot 3: Browser extension active
3. **Small tile (440x280)** - Promotional image

**Convert SVG icons to PNG:**
```bash
# Use ImageMagick or online converter
# https://convertio.co/svg-png/

# Or use Node.js:
npm install svg-to-png
npx svg-to-png extension/icons/icon-128.svg extension/icons/icon-128.png
```

### Step 4.4: Submit to Chrome Web Store

1. Developer Console → New Item → Upload `.zip` file
2. Fill in details:
   - **Name:** Brax Upload Method - TikTok Video Optimizer
   - **Summary:** Analyze and optimize videos before uploading to TikTok
   - **Description:**
     ```
     Brax Upload Method helps TikTok creators upload higher-quality videos.
     
     Features:
     • Automatic video analysis - codec, resolution, fps, bitrate detection
     • Problem detection - identify what causes TikTok compression
     • Smart recommendations - optimal settings for TikTok
     • One-click optimization - auto-convert to TikTok-ready MP4
     • Browser integration - get alerts when uploading on TikTok.com
     
     Privacy:
     • Your videos are never stored permanently
     • Only technical metadata is analyzed
     • No personal data collection
     • Open source on GitHub
     ```
   - **Category:** Productivity
   - **Privacy/Permissions:** Check manifest.json coverage
   - **Support Email:** support@brax-upload.com
   - **Privacy Policy:** Link to PRIVACY.md
   - **Links:** GitHub repo, website

3. Add screenshots and promotional image
4. Accept all agreements
5. Submit for review

### Step 4.5: Wait for Review

- ⏳ Typical review time: 1-3 days
- 📧 You'll get email with approval or rejection
- If rejected: Review feedback, fix, resubmit

**Status After Phase 4:** ✅ Extension pending Chrome review

---

## Phase 5: Post-Launch Maintenance

### Step 5.1: Monitor Deployments

**Vercel (Frontend):**
- Check deployment status: Vercel Dashboard
- Monitor performance: Vercel Analytics
- View logs: Dashboard → Logs

**Railway (Backend):**
- Check health: `curl https://api.railway.app/api/health`
- Monitor logs: Railway Dashboard → Logs
- Check CPU/Memory usage

**Extension:**
- Chrome Web Store dashboard shows reviews and ratings
- Monitor crash reports

### Step 5.2: Set Up Alerts

1. **GitHub:** Enable notifications for issues
2. **Railway:** Set up crash alerts
3. **Vercel:** Enable build failure notifications

### Step 5.3: Create Landing Page (Optional)

1. Create `landing/` directory
2. Simple HTML page with:
   - Feature overview
   - Download links
   - Chrome Web Store badge
   - GitHub link
3. Deploy to Vercel: `vercel --scope landing`

---

## Phase 6: Marketing & Promotion

### Announcement

Once deployed, announce to:

1. **GitHub:**
   - Create Release: `v0.1.0 - Initial Public Release`
   - Include changelog and links

2. **Social Media:**
   - Twitter/X: Announce with screenshots
   - TikTok: Demo video
   - Reddit: r/TikTok, r/webdev, r/chrome_extensions

3. **Communities:**
   - Product Hunt (optional)
   - Hacker News (optional)
   - Tech forums

### Sample Announcement Post

```
🚀 Announcing Brax Upload Method!

Stop losing video quality on TikTok! Our free tool analyzes your videos and 
automatically optimizes them before upload.

Features:
✅ Auto analysis (codec, fps, resolution, bitrate)
✅ Problem detection (what causes TikTok compression)
✅ Smart recommendations (optimal settings)
✅ One-click optimization (ready to upload)
✅ Chrome extension (alerts on TikTok upload)

🔗 Website: https://brax-upload-method.vercel.app
📦 GitHub: https://github.com/your-username/brax-upload-method
🛒 Chrome Web Store: [link after approval]

Open source & privacy-friendly. No data collection.
```

---

## Troubleshooting

### GitHub Push Issues

```bash
# If authentication fails
git config --global user.email "your@email.com"
git config --global user.name "Your Name"

# If remote URL is wrong
git remote set-url origin https://github.com/your-username/brax-upload-method.git
```

### Vercel Deployment Issues

```bash
# Check build logs
vercel logs

# Rebuild
vercel --prod --force
```

### Railway Backend Issues

```bash
# Check logs
railway logs

# Reconnect
railway link

# Redeploy
railway up
```

### Chrome Web Store Rejection

Common rejection reasons:
- ❌ Permissions not justified → Fix manifest.json description
- ❌ Privacy policy missing → Add link to PRIVACY.md
- ❌ Malware warnings → Ensure no external network calls
- ❌ Poor screenshots → Make them more professional

---

## Success Indicators

✅ All done when:
- [ ] Repository is on GitHub with stars
- [ ] Frontend is deployed and working
- [ ] Backend API is responding
- [ ] Extension is available on Chrome Web Store
- [ ] Users can upload videos and see results
- [ ] No critical errors in logs

---

## Next Steps (Post-Launch)

1. Collect user feedback
2. Fix bugs reported
3. Add requested features
4. Improve documentation
5. Create usage tutorials
6. Monitor analytics
7. Prepare v0.2.0 roadmap

---

**Questions?** Open GitHub issue or email support@brax-upload.com

**Timeline:** ~1 week from start to full deployment

**Estimated Cost:** 
- GitHub: Free
- Vercel: Free ($5-20 if needed)
- Railway: ~$5-10/month
- Chrome Developer Account: $5 (one-time)
- **Total: ~$20-35 (one-time setup)**

Good luck! 🚀

import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { analyzeVideo, optimizeVideo } from './videoAnalyzer';

const app = express();
const tmpDir = path.join(__dirname, '../../tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only video files are allowed'));
  }
});

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const allowedOrigins = [
  frontendOrigin,
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:4000',
  'https://braxuploadmethod.com',
  'https://tiktokvideooptimizer.com',
  'https://api.tiktokvideooptimizer.com',
  'https://braxaep-jpg.github.io'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.tiktok.com') ||
      origin === 'https://tiktok.com' ||
      origin.startsWith('chrome-extension://')
    ) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.get('/', (req, res) => {
  if (fs.existsSync(frontendDist)) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }

  return res.json({
    name: 'TikTok Video Optimizer API',
    status: 'ok',
    frontend: frontendOrigin,
    health: '/api/health'
  });
});

app.post('/api/analyze', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  try {
    const fileStats = fs.statSync(req.file.path);
    if (fileStats.size === 0) {
      return res.status(400).json({ error: 'Uploaded video is empty' });
    }

    const result = await analyzeVideo(req.file.path);
    return res.json(result);
  } catch (error) {
    console.error('Analysis failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to analyze video: ${errorMessage}` });
  }
});

app.post('/api/optimize', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  try {
    const fileStats = fs.statSync(req.file.path);
    if (fileStats.size === 0) {
      return res.status(400).json({ error: 'Uploaded video is empty' });
    }

    const optimizedPath = await optimizeVideo(req.file.path);
    const cleanup = () => {
      fs.unlink(optimizedPath, (unlinkError) => {
        if (unlinkError) {
          console.error('Temporary file cleanup failed:', unlinkError);
        }
      });
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    return res.download(optimizedPath, 'brax-optimized.mp4', (downloadError) => {
      if (downloadError) {
        console.error('Download error:', downloadError);
      }
    });
  } catch (error) {
    console.error('Optimization failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to optimize video';
    return res.status(500).json({ error: `Failed to optimize video: ${errorMessage}` });
  }
});

app.post('/api/optimize-json', express.json({ limit: '150mb' }), async (req, res) => {
  const { fileName, fileType, fileBase64 } = req.body || {};

  if (!fileBase64 || !fileName) {
    return res.status(400).json({ error: 'fileName and fileBase64 are required' });
  }

  const buffer = Buffer.from(fileBase64, 'base64');
  if (!buffer.length) {
    return res.status(400).json({ error: 'Decoded video is empty' });
  }

  const uploadPath = path.join(tmpDir, `${Date.now()}-${path.basename(fileName)}`);
  try {
    fs.writeFileSync(uploadPath, buffer);
    const optimizedPath = await optimizeVideo(uploadPath);
    const cleanup = () => {
      fs.unlink(uploadPath, () => {});
      fs.unlink(optimizedPath, () => {});
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    return res.download(optimizedPath, 'brax-optimized.mp4', (downloadError) => {
      if (downloadError) {
        console.error('Download error:', downloadError);
      }
    });
  } catch (error) {
    console.error('JSON optimization failed:', error);
    return res.status(500).json({ error: `Failed to optimize video: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (fs.existsSync(frontendDist)) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }

  next();
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

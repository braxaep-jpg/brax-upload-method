import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { addCredits, bumpUsage, createUserRecord, getUserRecord, markPayment, setUserPlan, type PlanKey, type UserRecord } from './billing';
import { analyzeVideo, boostVideoFps, optimizeVideo } from './videoAnalyzer';

const app = express();
const accessSecret = process.env.ACCESS_SECRET || crypto.randomBytes(32).toString('hex');
const paymentConfig = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    starterPriceId: process.env.STRIPE_PRICE_STARTER || '',
    proPriceId: process.env.STRIPE_PRICE_PRO || ''
  },
  crypto: {
    usdtTrc20: process.env.CRYPTO_USDT_TRC20_ADDRESS || 'TVG1iA3EYfeNF2gvvVXsJjSXHi44ykU7MD',
    eth: process.env.CRYPTO_ETH_ADDRESS || '0x0edD3bAf8084f527c808d834dC65Aa35CCDcb21e',
    btc: process.env.CRYPTO_BTC_ADDRESS || 'bc1qysnqm87jt6v2k35ncl5hp22qap9n7z2gn8284l'
  }
} as const;
const sponsorOffers = [
  {
    id: 'zovi-bot-start-8096099859',
    label: 'Zovi bot',
    url: 'https://t.me/zovi_bot?start=8096099859'
  },
  {
    id: 'honey-swap-bot-start-8342022',
    label: 'Honey Swap bot',
    url: 'https://t.me/Honey_Swap_bot?start=8342022'
  }
];
const planCatalog = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    limit: '3 videos / week',
    description: 'Perfect for testing the workflow and trying upload-safe quality presets.',
    bestFor: 'Creators testing the platform'
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$12',
    cadence: 'month',
    limit: '30 videos / month',
    description: 'The first serious plan for creators who need consistent quality before publishing.',
    bestFor: 'Daily creators and short-form teams',
    highlight: true
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$39',
    cadence: 'month',
    limit: '150 videos / month',
    description: 'For heavy publishers, agencies and teams working across multiple social formats.',
    bestFor: 'High-volume publishing workflows'
  }
];
const referralRewards = [
  { label: 'Invite friend', value: '+20 credits' },
  { label: 'Friend upgrades', value: '+50 credits' },
  { label: 'Monthly streak', value: '+10 credits' }
];
const sponsorOfferIds = sponsorOffers.map((offer) => offer.id);
const accessTokenTtlSeconds = 30 * 24 * 60 * 60;
const tmpDir = path.join(__dirname, '../../tmp');
type UserState = {
  plan: 'free' | 'starter' | 'pro';
  credits: number;
  usage: Record<'analyze' | 'optimize' | 'fpsBoost', number>;
  resetAt: number;
};

const userStore = new Map<string, UserState>();
const planLimits = {
  free: 3,
  starter: 30,
  pro: 150
} as const;
const operationCosts = {
  analyze: 1,
  optimize: 2,
  fpsBoost: 2
} as const;
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const videoExtensions = /\.(mp4|mov|avi|mkv|webm|wmv|mpeg|mpg|m4v|3gp|flv)$/i;

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isVideoMime = file.mimetype && file.mimetype.startsWith('video/');
    const isVideoExtension = videoExtensions.test(file.originalname || '');

    if (isVideoMime || isVideoExtension) {
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
  'https://braxaep-jpg.github.io'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.onrender.com') ||
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

const createAccessToken = () => {
  const payload = Buffer.from(JSON.stringify({
    offerIds: sponsorOfferIds,
    expiresAt: Date.now() + accessTokenTtlSeconds * 1000
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', accessSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const hasValidAccessToken = (token?: string) => {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = crypto.createHmac('sha256', accessSecret).update(payload).digest('base64url');
  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { offerIds?: string[]; expiresAt?: number };
    const offerIds = data.offerIds;
    return Array.isArray(offerIds) && sponsorOfferIds.every((offerId) => offerIds.includes(offerId)) && typeof data.expiresAt === 'number' && data.expiresAt > Date.now();
  } catch {
    return false;
  }
};

const requireAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!hasValidAccessToken(req.header('x-access-token'))) {
    return res.status(403).json({ error: 'Complete the sponsor offer to unlock tools' });
  }
  next();
};

const getClientPlan = (req: express.Request): 'free' | 'starter' | 'pro' => {
  const planHeader = req.header('x-plan');
  return planHeader === 'starter' || planHeader === 'pro' ? planHeader : 'free';
};

const normalizeUserId = (value?: string) => (value && value.trim() ? value.trim() : 'anonymous-user');

const getUserId = (req: express.Request) => normalizeUserId(req.header('x-user-id'));

const getUsageState = (req: express.Request): UserState => {
  const userId = getUserId(req);
  const now = Date.now();
  const currentPlan = getClientPlan(req);
  const existing = userStore.get(userId);

  if (!existing || now - existing.resetAt > (currentPlan === 'free' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)) {
    const freshState: UserState = {
      plan: currentPlan,
      credits: Number(req.header('x-credits') || 25),
      usage: { analyze: 0, optimize: 0, fpsBoost: 0 },
      resetAt: now
    };
    userStore.set(userId, freshState);
    return freshState;
  }

  existing.plan = currentPlan;
  if (!Number.isFinite(existing.credits)) {
    existing.credits = Number(req.header('x-credits') || 25);
  }
  userStore.set(userId, existing);
  return existing;
};

const consumeUserOperation = (req: express.Request, operation: 'analyze' | 'optimize' | 'fpsBoost') => {
  const state = getUsageState(req);
  const plan = state.plan;
  const cost = operationCosts[operation];
  const totalUsed = Object.values(state.usage).reduce<number>((sum, value) => sum + value, 0);

  if (totalUsed + cost <= planLimits[plan]) {
    state.usage[operation] += cost;
    userStore.set(getUserId(req), state);
    return { ok: true };
  }

  const credits = Number(req.header('x-credits') || state.credits || 0);
  if (credits >= cost) {
    state.usage[operation] += cost;
    state.credits = Math.max(0, credits - cost);
    userStore.set(getUserId(req), state);
    return { ok: true };
  }

  return {
    ok: false,
    code: 403,
    message: plan === 'free'
      ? 'Free plan limit reached. Upgrade to Starter or buy more credits.'
      : 'Plan limit reached. Upgrade or buy more credits.'
  };
};

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

app.post('/api/access/unlock', (req, res) => {
  const completedOfferIds = Array.isArray(req.body?.completedOfferIds) ? req.body.completedOfferIds : [];
  if (!sponsorOfferIds.every((offerId) => completedOfferIds.includes(offerId))) {
    return res.status(400).json({ error: 'Unknown sponsor offer' });
  }
  return res.json({ accessToken: createAccessToken(), expiresIn: accessTokenTtlSeconds });
});

app.get('/api/access/status', (req, res) => {
  return res.json({
    unlocked: hasValidAccessToken(req.header('x-access-token')),
    offers: sponsorOffers
  });
});

app.get('/api/plans', (req, res) => {
  return res.json({
    plans: planCatalog,
    referralRewards,
    defaultCredits: 25,
    freeLimit: '3 videos / week',
    paymentConfig: {
      stripe: {
        configured: Boolean(paymentConfig.stripe.secretKey),
        mode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
        priceIds: {
          starter: paymentConfig.stripe.starterPriceId,
          pro: paymentConfig.stripe.proPriceId
        }
      },
      crypto: paymentConfig.crypto
    }
  });
});

app.post('/api/auth/create-user', (req, res) => {
  const { email, userId } = req.body || {};
  const resolvedId = normalizeUserId(userId || 'anonymous-user');
  const existing = getUserRecord(resolvedId) ?? createUserRecord(resolvedId);
  const next = {
    ...existing,
    email: typeof email === 'string' && email.trim() ? email.trim() : existing.email,
    updatedAt: Date.now()
  };

  userStore.set(resolvedId, {
    plan: next.plan,
    credits: next.credits,
    usage: next.usage,
    resetAt: next.resetAt
  });

  return res.json({
    success: true,
    user: {
      id: resolvedId,
      email: next.email,
      plan: next.plan,
      credits: next.credits
    }
  });
});

app.get('/api/user/state', (req, res) => {
  const userId = normalizeUserId(String(req.query.userId || 'anonymous-user'));
  const record = getUserRecord(userId) ?? createUserRecord(userId);
  userStore.set(userId, {
    plan: record.plan,
    credits: record.credits,
    usage: record.usage,
    resetAt: record.resetAt
  });

  return res.json({
    userId,
    plan: record.plan,
    credits: record.credits,
    usage: record.usage,
    resetAt: record.resetAt
  });
});

app.post('/api/checkout/plan', (req, res) => {
  const { userId, plan } = req.body || {};
  const resolvedId = normalizeUserId(userId);
  const normalizedPlan: PlanKey = plan === 'starter' || plan === 'pro' ? plan : 'starter';
  const updated = setUserPlan(resolvedId, normalizedPlan);

  return res.json({
    success: true,
    message: `${normalizedPlan === 'pro' ? 'Pro' : 'Starter'} activated successfully`,
    plan: updated.plan,
    credits: updated.credits
  });
});

app.post('/api/checkout/credits', (req, res) => {
  const { userId, amount } = req.body || {};
  const resolvedId = normalizeUserId(userId);
  const creditsToAdd = Number(amount) > 0 ? Number(amount) : 0;
  const updated = addCredits(resolvedId, creditsToAdd);

  return res.json({
    success: true,
    message: `Added ${creditsToAdd} credits`,
    credits: updated.credits
  });
});

app.post('/api/billing/webhook', (req, res) => {
  const { userId, plan, provider, customerId, subscriptionId, eventId, amount } = req.body || {};
  const resolvedId = normalizeUserId(userId);
  const normalizedPlan: PlanKey = plan === 'starter' || plan === 'pro' ? plan : 'free';
  const updated = markPayment(
    resolvedId,
    provider === 'crypto' ? 'crypto' : 'stripe',
    customerId || null,
    subscriptionId || null,
    eventId || null,
    normalizedPlan
  );

  if (amount && Number(amount) > 0) {
    addCredits(resolvedId, Number(amount));
  }

  return res.json({
    success: true,
    plan: updated.plan,
    provider: provider === 'crypto' ? 'crypto' : 'stripe',
    userId: resolvedId
  });
});

app.post('/api/analyze', requireAccess, upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const spendCheck = consumeUserOperation(req, 'analyze');
  if (!spendCheck.ok) {
    return res.status(spendCheck.code ?? 403).json({ error: spendCheck.message || 'Limit reached' });
  }

  const userId = getUserId(req);
  const record = getUserRecord(userId) ?? createUserRecord(userId);
  bumpUsage(userId, 'analyze', operationCosts.analyze);
  const nextUsage = { ...record.usage, analyze: record.usage.analyze + operationCosts.analyze };
  userStore.set(userId, {
    plan: record.plan,
    credits: record.credits,
    usage: nextUsage,
    resetAt: record.resetAt
  });

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

app.post('/api/optimize', requireAccess, upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const spendCheck = consumeUserOperation(req, 'optimize');
  if (!spendCheck.ok) {
    return res.status(spendCheck.code ?? 403).json({ error: spendCheck.message || 'Limit reached' });
  }

  const userId = getUserId(req);
  const record = getUserRecord(userId) ?? createUserRecord(userId);
  bumpUsage(userId, 'optimize', operationCosts.optimize);
  const nextUsage = { ...record.usage, optimize: record.usage.optimize + operationCosts.optimize };
  userStore.set(userId, {
    plan: record.plan,
    credits: record.credits,
    usage: nextUsage,
    resetAt: record.resetAt
  });

  try {
    const fileStats = fs.statSync(req.file.path);
    if (fileStats.size === 0) {
      return res.status(400).json({ error: 'Uploaded video is empty' });
    }

    const optimizedPath = await optimizeVideo(req.file.path);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      for (const temporaryPath of [optimizedPath, req.file!.path]) {
        fs.unlink(temporaryPath, (unlinkError) => {
          if (unlinkError && unlinkError.code !== 'ENOENT') {
            console.error('Temporary file cleanup failed:', unlinkError);
          }
        });
      }
    };

    res.once('finish', cleanup);
    res.once('close', cleanup);

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

app.post('/api/fps-boost', requireAccess, upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const spendCheck = consumeUserOperation(req, 'fpsBoost');
  if (!spendCheck.ok) {
    return res.status(spendCheck.code ?? 403).json({ error: spendCheck.message || 'Limit reached' });
  }

  const userId = getUserId(req);
  const record = getUserRecord(userId) ?? createUserRecord(userId);
  bumpUsage(userId, 'fpsBoost', operationCosts.fpsBoost);
  const nextUsage = { ...record.usage, fpsBoost: record.usage.fpsBoost + operationCosts.fpsBoost };
  userStore.set(userId, {
    plan: record.plan,
    credits: record.credits,
    usage: nextUsage,
    resetAt: record.resetAt
  });

  try {
    const fileStats = fs.statSync(req.file.path);
    if (fileStats.size === 0) {
      return res.status(400).json({ error: 'Uploaded video is empty' });
    }

    const boostedPath = await boostVideoFps(req.file.path);
    const cleanup = () => {
      fs.unlink(req.file!.path, () => {});
      fs.unlink(boostedPath, () => {});
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    return res.download(boostedPath, 'brax-fps-boost.mp4', (downloadError) => {
      if (downloadError) {
        console.error('FPS boost download error:', downloadError);
      }
    });
  } catch (error) {
    console.error('FPS boost failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to boost FPS';
    return res.status(500).json({ error: `Failed to boost FPS: ${errorMessage}` });
  }
});

app.post('/api/optimize-json', requireAccess, express.json({ limit: '150mb' }), async (req, res) => {
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

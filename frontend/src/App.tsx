import { useEffect, useState } from 'react';
import './index.css';
import { API_BASE_URL } from './config';

interface AnalysisResult {
  format: string;
  codec: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  duration: number;
  colorSpace: string | null;
  profile: string | null;
  issues: string[];
  recommended: {
    resolution: string;
    fps: number;
    codec: string;
    bitrate: number;
    colorSpace: string;
  };
}

interface SponsorOffer {
  id: string;
  label: string;
  url: string;
}

type PlanKey = 'free' | 'starter' | 'pro';

type OperationKey = 'analyze' | 'optimize' | 'fpsBoost';

interface PlanOption {
  key: PlanKey;
  name: string;
  price: string;
  cadence: string;
  limit: string;
  description: string;
  bestFor: string;
  highlight?: boolean;
}

interface ReferralReward {
  label: string;
  value: string;
}

interface PlatformPreset {
  key: 'tiktok' | 'reels' | 'youtube';
  label: string;
  aspectRatio: string;
  recommendedResolution: string;
  recommendedFps: number;
  recommendedBitrate: number;
  description: string;
}

interface PlanUsageState {
  resetAt: number;
  used: Record<OperationKey, number>;
}

const selectedPlanKey = 'brax-selected-plan';
const creditBalanceKey = 'brax-credit-balance';
const usageStateKey = 'brax-plan-usage-v1';

const defaultSponsorOffers: SponsorOffer[] = [
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
const accessTokenKey = 'brax-access-token-v2';
const openedOffersKey = 'brax-opened-offers';
const legacyAccessTokenKeys = ['brax-access-token', 'brax-access-token-v1'];

const readStoredAccessToken = () => {
  for (const key of [accessTokenKey, ...legacyAccessTokenKeys]) {
    const value = window.localStorage.getItem(key);
    if (value && value.trim()) {
      if (key !== accessTokenKey) {
        window.localStorage.setItem(accessTokenKey, value);
      }
      return value;
    }
  }

  return '';
};

const readOpenedOfferIds = (offers: SponsorOffer[] = defaultSponsorOffers) => {
  try {
    const raw = window.localStorage.getItem(openedOffersKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .filter((value) => offers.some((offer) => offer.id === value));
  } catch {
    return [];
  }
};

const persistOpenedOfferIds = (nextOfferIds: string[], offers: SponsorOffer[]) => {
  const uniqueOfferIds = [...new Set(nextOfferIds.filter((id) => offers.some((offer) => offer.id === id)))];
  window.localStorage.setItem(openedOffersKey, JSON.stringify(uniqueOfferIds));
  return uniqueOfferIds;
};

const defaultPlanOptions: PlanOption[] = [
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

const defaultReferralRewards: ReferralReward[] = [
  { label: 'Invite friend', value: '+20 credits' },
  { label: 'Friend upgrades', value: '+50 credits' },
  { label: 'Monthly streak', value: '+10 credits' }
];

const platformPresets: PlatformPreset[] = [
  {
    key: 'tiktok',
    label: 'TikTok',
    aspectRatio: '9:16',
    recommendedResolution: '1080x1920',
    recommendedFps: 60,
    recommendedBitrate: 12000000,
    description: 'Optimized for short-form vertical upload quality.'
  },
  {
    key: 'reels',
    label: 'Reels',
    aspectRatio: '9:16',
    recommendedResolution: '1080x1920',
    recommendedFps: 60,
    recommendedBitrate: 10000000,
    description: 'Balanced for mobile-first content and stronger motion.'
  },
  {
    key: 'youtube',
    label: 'YouTube',
    aspectRatio: '16:9',
    recommendedResolution: '1920x1080',
    recommendedFps: 30,
    recommendedBitrate: 15000000,
    description: 'Better for longer-form uploads and wider frames.'
  }
];

const readStoredPlan = (): PlanKey => {
  const value = window.localStorage.getItem(selectedPlanKey);
  return value === 'starter' || value === 'pro' ? value : 'free';
};

const readStoredCreditBalance = () => {
  const rawValue = window.localStorage.getItem(creditBalanceKey);
  const parsed = Number(rawValue ?? '25');
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 25;
};

const getPlanLimit = (planKey: PlanKey) => {
  if (planKey === 'starter') return 30;
  if (planKey === 'pro') return 150;
  return 3;
};

const getPlanWindowLabel = (planKey: PlanKey) => {
  if (planKey === 'starter' || planKey === 'pro') return 'month';
  return 'week';
};

const defaultUsageState = (): PlanUsageState => ({
  resetAt: Date.now(),
  used: { analyze: 0, optimize: 0, fpsBoost: 0 }
});

const readUsageState = (): PlanUsageState => {
  try {
    const raw = window.localStorage.getItem(usageStateKey);
    if (!raw) return defaultUsageState();

    const parsed = JSON.parse(raw) as Partial<PlanUsageState>;
    const resetAt = typeof parsed.resetAt === 'number' ? parsed.resetAt : Date.now();
    const used = {
      analyze: Number(parsed.used?.analyze ?? 0),
      optimize: Number(parsed.used?.optimize ?? 0),
      fpsBoost: Number(parsed.used?.fpsBoost ?? 0)
    };

    return {
      resetAt,
      used: {
        analyze: Number.isFinite(used.analyze) ? used.analyze : 0,
        optimize: Number.isFinite(used.optimize) ? used.optimize : 0,
        fpsBoost: Number.isFinite(used.fpsBoost) ? used.fpsBoost : 0
      }
    };
  } catch {
    return defaultUsageState();
  }
};

const persistUsageState = (nextState: PlanUsageState) => {
  window.localStorage.setItem(usageStateKey, JSON.stringify(nextState));
};

const getPlanUsageSnapshot = (planKey: PlanKey) => {
  const usageState = readUsageState();
  const now = Date.now();
  const resetMs = planKey === 'free' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  if (now - usageState.resetAt > resetMs) {
    const freshState = defaultUsageState();
    persistUsageState(freshState);
    return freshState;
  }

  return usageState;
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [sponsorOffers, setSponsorOffers] = useState<SponsorOffer[]>(defaultSponsorOffers);
  const [openedOfferIds, setOpenedOfferIds] = useState<string[]>(() => readOpenedOfferIds());
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(() => readStoredPlan());
  const [creditBalance, setCreditBalance] = useState<number>(() => readStoredCreditBalance());
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformPreset['key']>('tiktok');
  const [planOptions, setPlanOptions] = useState<PlanOption[]>(defaultPlanOptions);
  const [referralRewards, setReferralRewards] = useState<ReferralReward[]>(defaultReferralRewards);
  const [planUsage, setPlanUsage] = useState<PlanUsageState>(() => getPlanUsageSnapshot(readStoredPlan()));

  const apiBase = API_BASE_URL;
  const allOffersCompleted = sponsorOffers.every((offer) => openedOfferIds.includes(offer.id));
  const activePlan = planOptions.find((plan) => plan.key === selectedPlan) ?? planOptions[0];
  const activePlatform = platformPresets.find((preset) => preset.key === selectedPlatform) ?? platformPresets[0];
  const activePlanLimit = getPlanLimit(selectedPlan);
  const planUsageTotal = Object.values(planUsage.used).reduce((sum, value) => sum + value, 0);
  const remainingPlanUsage = Math.max(activePlanLimit - planUsageTotal, 0);
  const hasUsageRemaining = remainingPlanUsage > 0 || selectedPlan !== 'free';
  const qualityScore = result ? Math.max(0, 100 - result.issues.length * 18) : 0;

  useEffect(() => {
    window.localStorage.setItem(selectedPlanKey, selectedPlan);
    const refreshedUsage = getPlanUsageSnapshot(selectedPlan);
    setPlanUsage(refreshedUsage);
  }, [selectedPlan]);

  useEffect(() => {
    window.localStorage.setItem(creditBalanceKey, String(creditBalance));
  }, [creditBalance]);

  useEffect(() => {
    persistUsageState(planUsage);
  }, [planUsage]);

  useEffect(() => {
    const loadPlanCatalog = async () => {
      try {
        const response = await fetch(`${apiBase}/api/plans`);
        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          setPlanOptions(data.plans);
        }
        if (Array.isArray(data.referralRewards) && data.referralRewards.length > 0) {
          setReferralRewards(data.referralRewards);
        }
      } catch {
        // keep fallback pricing
      }
    };

    loadPlanCatalog();
  }, [apiBase]);

  useEffect(() => {
    let cancelled = false;

    const syncUnlockState = async () => {
      try {
        const response = await fetch(`${apiBase}/api/access/status`, {
          headers: { 'x-access-token': readStoredAccessToken() }
        });
        if (!response.ok) throw new Error('Access status request failed');

        const data = await response.json();
        const nextOffers = Array.isArray(data.offers) && data.offers.length > 0 ? data.offers : defaultSponsorOffers;
        if (cancelled) return;

        setSponsorOffers(nextOffers);
        setOpenedOfferIds(readOpenedOfferIds(nextOffers));
        setIsUnlocked(Boolean(data.unlocked));

        if (!data.unlocked) {
          window.localStorage.removeItem(accessTokenKey);
        }
      } catch {
        if (!cancelled) {
          setIsUnlocked(false);
        }
      }
    };

    syncUnlockState();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || [accessTokenKey, openedOffersKey].includes(event.key)) {
        syncUnlockState();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [apiBase]);

  const accessHeaders = () => ({
    'x-access-token': readStoredAccessToken()
  });

  const handleAccessDenied = () => {
    window.localStorage.removeItem(accessTokenKey);
    setIsUnlocked(false);
    setError('Доступ истёк. Снова подтвердите выполнение офферов.');
  };

  const unlockTools = async () => {
    if (!allOffersCompleted) return;
    setIsUnlocking(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/access/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedOfferIds: openedOfferIds })
      });

      if (!response.ok) {
        throw new Error('Unlock request failed');
      }

      const data = await response.json();
      const accessToken = data?.accessToken || '';
      if (!accessToken) {
        throw new Error('Access token was not returned');
      }
      window.localStorage.setItem(accessTokenKey, accessToken);
      setIsUnlocked(true);
    } catch {
      setError('Не удалось подтвердить выполнение оффера. Попробуйте ещё раз.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const openOffer = (offerId: string) => {
    setOpenedOfferIds((current) => {
      const next = current.includes(offerId) ? current : [...current, offerId];
      return persistOpenedOfferIds(next, sponsorOffers);
    });
  };

  const consumePlanUsage = (operation: OperationKey, cost: number) => {
    const nextUsage = getPlanUsageSnapshot(selectedPlan);
    const nextUsed = { ...nextUsage.used, [operation]: nextUsage.used[operation] + cost };
    const nextState = { ...nextUsage, used: nextUsed };
    setPlanUsage(nextState);
    return nextState;
  };

  const ensureCanUseOperation = (operation: OperationKey, cost: number) => {
    if (selectedPlan === 'starter' || selectedPlan === 'pro') {
      const currentPaidUsage = Object.values(planUsage.used).reduce((sum, value) => sum + value, 0);
      if (currentPaidUsage + cost > getPlanLimit(selectedPlan)) {
        setError(`Plan limit reached for ${activePlan.name}. Upgrade or buy more credits.`);
        return false;
      }
      return true;
    }

    const currentFreeUsage = Object.values(planUsage.used).reduce((sum, value) => sum + value, 0);
    if (currentFreeUsage + cost > getPlanLimit('free')) {
      setError('Free plan limit reached. Upgrade to Starter for more videos.');
      return false;
    }

    return true;
  };

  const upload = async () => {
    if (!file) return;
    if (!ensureCanUseOperation('analyze', 1)) return;

    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('platform', selectedPlatform);

    const response = await fetch(`${apiBase}/api/analyze`, {
      method: 'POST',
      headers: accessHeaders(),
      body: formData
    });

    if (!response.ok) {
      if (response.status === 403) {
        handleAccessDenied();
        return;
      }
      const body = await response.json();
      setError(body?.error || 'Ошибка сервера');
      return;
    }

    consumePlanUsage('analyze', 1);
    const data = await response.json();

    const platformPreset = platformPresets.find((preset) => preset.key === selectedPlatform) ?? platformPresets[0];
    const nextResult = {
      ...data,
      recommended: {
        ...data.recommended,
        resolution: platformPreset.recommendedResolution,
        fps: platformPreset.recommendedFps,
        bitrate: platformPreset.recommendedBitrate,
        colorSpace: 'bt709'
      }
    };

    setResult(nextResult);
  };

  const optimize = async () => {
    if (!file) return;
    if (!ensureCanUseOperation('optimize', 2)) return;

    setError(null);
    setIsOptimizing(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(`${apiBase}/api/optimize`, {
        method: 'POST',
        headers: accessHeaders(),
        body: formData
      });

      if (!response.ok) {
        if (response.status === 403) {
          handleAccessDenied();
          return;
        }
        const body = await response.json();
        setError(body?.error || 'Ошибка оптимизации');
        return;
      }

      consumePlanUsage('optimize', 2);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brax-optimized.mp4';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Не удалось оптимизировать видео');
    } finally {
      setIsOptimizing(false);
    }
  };

  const boostFps = async () => {
    if (!file) return;
    if (!ensureCanUseOperation('fpsBoost', 2)) return;

    setError(null);
    setIsBoosting(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(`${apiBase}/api/fps-boost`, {
        method: 'POST',
        headers: accessHeaders(),
        body: formData
      });

      if (!response.ok) {
        if (response.status === 403) {
          handleAccessDenied();
          return;
        }
        const body = await response.json();
        setError(body?.error || 'Ошибка FPS Boost');
        return;
      }

      consumePlanUsage('fpsBoost', 2);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brax-fps-boost.mp4';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Не удалось сделать видео плавнее');
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <div className="app-shell">
      <video
        className="background-video"
        autoPlay
        muted
        loop
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
      />
      <div className="video-overlay" />
      <div className="page-content">
        {!isUnlocked && (
          <div className="access-gate" role="dialog" aria-modal="true" aria-labelledby="access-title">
            <div className="access-card">
              <div className="access-kicker">ONE QUICK STEP</div>
              <div className="access-lock">✦</div>
              <h2 id="access-title">Unlock the tools</h2>
              <p>Open both Telegram offers, press Start in each bot, then return here to unlock every tool.</p>
              <div className="offer-list">
                {sponsorOffers.map((offer, index) => (
                  <a
                    key={offer.id}
                    className={`sponsor-button${openedOfferIds.includes(offer.id) ? ' completed' : ''}`}
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => openOffer(offer.id)}
                  >
                    <span>{openedOfferIds.includes(offer.id) ? 'Opened' : `Open offer ${index + 1}`}</span>
                    <strong>{offer.label}</strong>
                    <span>↗</span>
                  </a>
                ))}
              </div>
              <button className="confirm-button" onClick={unlockTools} disabled={isUnlocking || !allOffersCompleted}>
                {isUnlocking ? 'Checking...' : allOffersCompleted ? 'I completed both offers' : `Open ${sponsorOffers.length - openedOfferIds.length} more offer`}
              </button>
              <small>We can confirm that both offers were opened. Automatic Start verification requires a callback from the offer providers.</small>
            </div>
          </div>
        )}
        <nav className="top-nav" aria-label="Основная навигация">
          <div className="brand-pill">
            <span className="brand-mark">B</span>
            <span className="brand-name">BRA<span>X</span></span>
          </div>
          <div className="nav-pill">
            <a href="#workspace" className="nav-link active">Workspace</a>
            <a href="#tools" className="nav-link">Tools</a>
            <a href="#results" className="nav-link">Results</a>
            <a href="#about" className="nav-link">About</a>
          </div>
        </nav>

        <main className={`hero-layout${isUnlocked ? '' : ' is-locked'}`} id="workspace" aria-hidden={!isUnlocked}>
          <div className="hero-copy">
            <a href="#tools" className="eyebrow-link">UPLOAD-SAFE QUALITY <span>→</span></a>
            <h1>Protect the look of your video<br />before <em>TikTok</em> touches it.</h1>
            <p>Design for safer uploads, cleaner output and stronger platform-specific quality. Built for creators who need results before publishing.</p>
            <div className="hero-stats">
              <div><strong>01</strong><span>Audit</span></div>
              <div><strong>02</strong><span>Optimize</span></div>
              <div><strong>03</strong><span>Publish</span></div>
            </div>
          </div>

          <section className="tool-panel" id="tools" aria-label="Video tools">
            <div className="panel-label">PICK THE PLATFORM</div>
            <div className="platform-switcher" role="tablist" aria-label="Platform presets">
              {platformPresets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`platform-pill${selectedPlatform === preset.key ? ' active' : ''}`}
                  onClick={() => setSelectedPlatform(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="platform-note">{activePlatform.description}</div>
            <div className="panel-label panel-label-spaced">DROP YOUR SOURCE</div>
            <label htmlFor="file-input" className="drop-zone">
              <span className="drop-icon">+</span>
              <span className="file-text">{file ? file.name : 'Choose a video to begin'}</span>
              <span className="file-hint">MP4, MOV or AVI · up to 100 MB</span>
            </label>
            <input id="file-input" type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} className="file-input" />
            <div className="tool-actions">
              <button onClick={upload} disabled={!file} className="btn btn-primary">Analyze</button>
              <button onClick={optimize} disabled={!file || isOptimizing} className="btn btn-success">{isOptimizing ? 'Working...' : 'Optimize'} <span>→</span></button>
              <button onClick={boostFps} disabled={!file || isBoosting} className="btn btn-fps">{isBoosting ? 'Working...' : 'FPS Boost'}</button>
            </div>
          </section>
        </main>

        <section className="plan-section" aria-label="Subscription plans">
          <div className="plan-header-row">
            <div>
              <div className="eyebrow-kicker">SMART PRICING</div>
              <h3>Start soft, upgrade when it matters.</h3>
            </div>
            <div className="credit-pill">
              <span>Credits</span>
              <strong>{creditBalance}</strong>
            </div>
          </div>

          <div className="plan-grid">
            {planOptions.map((plan) => (
              <button
                key={plan.key}
                type="button"
                className={`plan-card${selectedPlan === plan.key ? ' selected' : ''}${plan.highlight ? ' highlight' : ''}`}
                onClick={() => setSelectedPlan(plan.key)}
              >
                <div className="plan-topline">
                  <span className="plan-name">{plan.name}</span>
                  {plan.highlight && <span className="plan-badge">Most popular</span>}
                </div>
                <div className="plan-price-row">
                  <span className="plan-price">{plan.price}</span>
                  <span className="plan-cadence">/{plan.cadence}</span>
                </div>
                <div className="plan-limit">{plan.limit}</div>
                <p>{plan.description}</p>
                <small>{plan.bestFor}</small>
              </button>
            ))}
          </div>

          <div className="referral-strip">
            <div>
              <span className="ref-label">Referral rewards</span>
              <h4>Invite creators. Earn credits for every active upgrade.</h4>
            </div>
            <div className="reward-list">
              {referralRewards.map((reward) => (
                <span key={reward.label} className="reward-pill">{reward.label}: {reward.value}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="usage-summary" aria-label="Current plan summary">
          <div>
            <span className="usage-label">Current plan</span>
            <strong>{activePlan.name}</strong>
          </div>
          <div>
            <span className="usage-label">Includes</span>
            <strong>{activePlan.limit}</strong>
          </div>
          <div>
            <span className="usage-label">Remaining</span>
            <strong>{remainingPlanUsage} / {activePlanLimit} {getPlanWindowLabel(selectedPlan)}</strong>
          </div>
        </section>

        {error && <div className="error-box"><span className="error-icon">!</span><p>{error}</p></div>}

        {result && <div className="results-section" id="results">
            <div className="metadata-card">
              <div className="result-header-row">
                <h3>📊 Параметры видео</h3>
                <div className="quality-badge">Quality score {qualityScore.toFixed(0)}%</div>
              </div>
              <div className="metadata-grid">
                <div className="metadata-item">
                  <span className="label">Разрешение</span>
                  <span className="value">{result.width}×{result.height}</span>
                </div>
                <div className="metadata-item">
                  <span className="label">Codec</span>
                  <span className="value">{result.codec.toUpperCase()}</span>
                </div>
                <div className="metadata-item">
                  <span className="label">FPS</span>
                  <span className="value">{result.fps}</span>
                </div>
                <div className="metadata-item">
                  <span className="label">Битрейт</span>
                  <span className="value">{(result.bitrate / 1000000).toFixed(1)} Мбит/с</span>
                </div>
                <div className="metadata-item">
                  <span className="label">Длительность</span>
                  <span className="value">{result.duration.toFixed(2)}с</span>
                </div>
                <div className="metadata-item">
                  <span className="label">Цветовое пространство</span>
                  <span className="value">{result.colorSpace || 'N/A'}</span>
                </div>
              </div>
            </div>

            {result.issues.length > 0 && (
              <div className="issues-card">
                <h3>⚠️ Проблемы найдены</h3>
                <ul className="issues-list">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="issue-item">
                      <span className="issue-icon">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="recommendations-card">
              <h3>💡 Рекомендации для {activePlatform.label}</h3>
              <div className="recommendations-grid">
                <div className="rec-item">
                  <span className="rec-label">Разрешение</span>
                  <span className="rec-value">{result.recommended.resolution}</span>
                </div>
                <div className="rec-item">
                  <span className="rec-label">FPS</span>
                  <span className="rec-value">{result.recommended.fps} fps</span>
                </div>
                <div className="rec-item">
                  <span className="rec-label">Codec</span>
                  <span className="rec-value">{result.recommended.codec}</span>
                </div>
                <div className="rec-item">
                  <span className="rec-label">Битрейт</span>
                  <span className="rec-value">{(result.recommended.bitrate / 1000000).toFixed(0)} Мбит/с</span>
                </div>
              </div>
            </div>
          </div>}
        </div>
      </div>
  );
}

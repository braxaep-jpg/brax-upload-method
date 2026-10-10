import { useEffect, useState } from 'react';
import './index.css';
import { API_BASE_URL, CRYPTO_WALLETS, STRIPE_MODE, STRIPE_PUBLISHABLE_KEY } from './config';

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

const operationCosts: Record<OperationKey, number> = {
  analyze: 1,
  optimize: 2,
  fpsBoost: 2
};

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
const userIdKey = 'brax-user-id-v1';
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
    description: 'Test the workflow and understand the safest upload settings before upgrading.',
    bestFor: 'Creators testing the workflow'
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$12',
    cadence: 'month',
    limit: '30 videos / month',
    description: 'Ideal for creators publishing regularly and needing consistent upload-safe optimization.',
    bestFor: 'Daily creators and short-form teams',
    highlight: true
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$39',
    cadence: 'month',
    limit: '150 videos / month',
    description: 'Built for high-volume publishing, agencies and teams working at scale.',
    bestFor: 'High-volume publishing workflows'
  }
];

const defaultReferralRewards: ReferralReward[] = [
  { label: 'Invite friend', value: '+20 credits' },
  { label: 'Friend upgrades', value: '+50 credits' },
  { label: 'Monthly streak', value: '+10 credits' }
];

const cryptoPaymentOptions = [
  {
    key: 'usdt-trc20',
    label: 'USDT TRC20',
    address: CRYPTO_WALLETS.usdtTrc20,
    note: 'Recommended for fastest and cheapest transfers.'
  },
  {
    key: 'eth',
    label: 'ETH',
    address: CRYPTO_WALLETS.eth,
    note: 'Use Ethereum mainnet only.'
  },
  {
    key: 'btc',
    label: 'BTC',
    address: CRYPTO_WALLETS.btc,
    note: 'Slower confirmation, higher fee variance.'
  }
] as const;

const stripeStatusText = STRIPE_PUBLISHABLE_KEY ? `Stripe live key loaded (${STRIPE_MODE})` : 'Stripe credentials pending';

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

const readStoredUserId = () => {
  const existing = window.localStorage.getItem(userIdKey);
  if (existing && existing.trim()) {
    return existing;
  }

  const nextId = `user_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  window.localStorage.setItem(userIdKey, nextId);
  return nextId;
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
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(() => readStoredCreditBalance());
  const [userId, setUserId] = useState<string>(() => readStoredUserId());
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformPreset['key']>('tiktok');
  const [planOptions, setPlanOptions] = useState<PlanOption[]>(defaultPlanOptions);
  const [creditPack, setCreditPack] = useState<number>(50);
  const [referralRewards, setReferralRewards] = useState<ReferralReward[]>(defaultReferralRewards);
  const [planUsage, setPlanUsage] = useState<PlanUsageState>(() => getPlanUsageSnapshot(readStoredPlan()));
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'plan' | 'credits'>('plan');
  const [checkoutPlan, setCheckoutPlan] = useState<PlanKey>('starter');
  const [checkoutAmount, setCheckoutAmount] = useState<number>(50);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [selectedCryptoMethod, setSelectedCryptoMethod] = useState<(typeof cryptoPaymentOptions)[number]['key']>('usdt-trc20');

  const apiBase = API_BASE_URL;
  const allOffersCompleted = sponsorOffers.every((offer) => openedOfferIds.includes(offer.id));
  const activePlan = planOptions.find((plan) => plan.key === selectedPlan) ?? planOptions[0];
  const activePlatform = platformPresets.find((preset) => preset.key === selectedPlatform) ?? platformPresets[0];
  const activePlanLimit = getPlanLimit(selectedPlan);
  const creditPacks = [
    { amount: 25, label: '25 credits', price: '$5' },
    { amount: 50, label: '50 credits', price: '$9' },
    { amount: 120, label: '120 credits', price: '$20' },
    { amount: 250, label: '250 credits', price: '$39' }
  ];
  const planUsageTotal = Object.values(planUsage.used).reduce((sum, value) => sum + value, 0);
  const remainingPlanUsage = Math.max(activePlanLimit - planUsageTotal, 0);
  const hasUsageRemaining = remainingPlanUsage > 0 || selectedPlan !== 'free';
  const qualityScore = result ? Math.max(0, 100 - result.issues.length * 18) : 0;

  useEffect(() => {
    window.localStorage.setItem(userIdKey, userId);
  }, [userId]);

  useEffect(() => {
    const syncBackendState = async () => {
      try {
        const response = await fetch(`${apiBase}/api/user/state?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) return;

        const data = await response.json();
        if (data?.plan) {
          setSelectedPlan(data.plan);
          window.localStorage.setItem(selectedPlanKey, data.plan);
        }
        if (typeof data?.credits === 'number') {
          setCreditBalance(data.credits);
          window.localStorage.setItem(creditBalanceKey, String(data.credits));
        }
        if (data?.usage && typeof data.usage === 'object') {
          setPlanUsage({
            resetAt: Date.now(),
            used: {
              analyze: Number(data.usage.analyze ?? 0),
              optimize: Number(data.usage.optimize ?? 0),
              fpsBoost: Number(data.usage.fpsBoost ?? 0)
            }
          });
        }
      } catch {
        // keep local state if backend is not available
      }
    };

    syncBackendState();
  }, [apiBase, userId]);

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
    'x-access-token': readStoredAccessToken(),
    'x-plan': selectedPlan,
    'x-user-id': userId,
    'x-credits': String(creditBalance)
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
    const currentUsage = Object.values(planUsage.used).reduce((sum, value) => sum + value, 0);
    const currentPlanLimit = getPlanLimit(selectedPlan);

    if (currentUsage + cost <= currentPlanLimit) {
      return true;
    }

    if (creditBalance >= cost) {
      return true;
    }

    setError(
      selectedPlan === 'free'
        ? 'Free plan limit reached. Upgrade to Starter or buy more credits.'
        : `Plan limit reached for ${activePlan.name}. Upgrade or buy more credits.`
    );
    return false;
  };

  const buyCredits = (amount: number) => {
    setCreditBalance((current) => current + amount);
    setCheckoutMessage(`Added ${amount} credits to your balance.`);
    setError(null);
  };

  const refreshUserState = async () => {
    try {
      const response = await fetch(`${apiBase}/api/user/state?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data?.plan) {
        setSelectedPlan(data.plan);
      }
      if (typeof data?.credits === 'number') {
        setCreditBalance(data.credits);
      }
      if (data?.usage && typeof data.usage === 'object') {
        setPlanUsage({
          resetAt: Date.now(),
          used: {
            analyze: Number(data.usage.analyze ?? 0),
            optimize: Number(data.usage.optimize ?? 0),
            fpsBoost: Number(data.usage.fpsBoost ?? 0)
          }
        });
      }
    } catch {
      // silent sync failure; UI keeps local state
    }
  };

  const openCheckout = (type: 'plan' | 'credits', nextPlan: PlanKey = 'starter', amount = 50) => {
    setCheckoutType(type);
    setCheckoutPlan(nextPlan);
    setCheckoutAmount(amount);
    setPendingPlan(type === 'plan' ? nextPlan : null);
    setShowCheckoutModal(true);
    setCheckoutMessage(null);
  };

  const activeCryptoOption = cryptoPaymentOptions.find((option) => option.key === selectedCryptoMethod) ?? cryptoPaymentOptions[0];

  const confirmCheckout = async () => {
    try {
      const endpoint = checkoutType === 'plan' ? '/api/checkout/plan' : '/api/checkout/credits';
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          checkoutType === 'plan'
            ? { userId, plan: checkoutPlan }
            : { userId, amount: checkoutAmount }
        )
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const data = await response.json();
      if (checkoutType === 'plan') {
        setSelectedPlan(checkoutPlan);
        setPendingPlan(null);
        setCheckoutMessage(`${checkoutPlan === 'pro' ? 'Pro' : 'Starter'} activated successfully. ${data.message || 'Mock checkout completed.'}`);
      } else {
        setPendingPlan(null);
        setCreditBalance(Number(data.credits ?? creditBalance + checkoutAmount));
        setCheckoutMessage(`Added ${checkoutAmount} credits to your balance. ${data.message || 'Payment confirmed.'}`);
      }
    } catch {
      setPendingPlan(null);
      setCheckoutMessage('Checkout stub failed. Please retry with valid backend credentials.');
    }

    setShowCheckoutModal(false);
    await refreshUserState();
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

    consumePlanUsage('analyze', operationCosts.analyze);
    if (creditBalance >= operationCosts.analyze) {
      setCreditBalance((current) => Math.max(0, current - operationCosts.analyze));
    }
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

      consumePlanUsage('optimize', operationCosts.optimize);
      if (creditBalance >= operationCosts.optimize) {
        setCreditBalance((current) => Math.max(0, current - operationCosts.optimize));
      }
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

      consumePlanUsage('fpsBoost', operationCosts.fpsBoost);
      if (creditBalance >= operationCosts.fpsBoost) {
        setCreditBalance((current) => Math.max(0, current - operationCosts.fpsBoost));
      }
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
            <h1>Prepare videos for TikTok<br />with the strongest export quality possible.</h1>
            <p>We optimize your source for safer mobile upload behavior, cleaner motion, and better compatibility before publishing. TikTok still performs its own platform-side processing, but we reduce avoidable quality loss beforehand.</p>
            <div className="hero-stats">
              <div><strong>01</strong><span>Audit</span></div>
              <div><strong>02</strong><span>Optimize</span></div>
              <div><strong>03</strong><span>Publish</span></div>
            </div>

            <div className="launch-points" aria-label="Launch readiness indicators">
              <div className="launch-point">
                <span>Real export logic</span>
                <strong>FFmpeg-safe</strong>
              </div>
              <div className="launch-point">
                <span>Monetization ready</span>
                <strong>Plans + credits</strong>
              </div>
              <div className="launch-point">
                <span>Launch prep</span>
                <strong>Commercial UX</strong>
              </div>
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

        <section className="feature-strip" aria-label="Product value">
          <div className="feature-item">
            <span className="feature-kicker">Workflow</span>
            <h3>Upload-safe export</h3>
            <p>We prepare your video for a safer, cleaner publish flow before it reaches TikTok.</p>
          </div>
          <div className="feature-item">
            <span className="feature-kicker">Quality</span>
            <h3>Smarter presets</h3>
            <p>Resolution, FPS and bitrate are tuned to reduce avoidable compression damage.</p>
          </div>
          <div className="feature-item">
            <span className="feature-kicker">Monetization</span>
            <h3>Plan gating</h3>
            <p>Free access, paid upgrades and credit packs keep the product launch-ready.</p>
          </div>
          <div className="feature-item">
            <span className="feature-kicker">Operations</span>
            <h3>Usage tracking</h3>
            <p>Creators see exactly how much processing capacity remains in their active plan.</p>
          </div>
        </section>

        <section className="process-section" aria-label="How it works">
          <div className="section-heading">
            <div className="eyebrow-kicker">HOW IT WORKS</div>
            <h3>Three simple steps to a cleaner publish-ready export.</h3>
          </div>

          <div className="process-grid">
            <div className="process-card">
              <span className="step-number">01</span>
              <h4>Upload</h4>
              <p>Drop the source video and select the format you are targeting.</p>
            </div>
            <div className="process-card">
              <span className="step-number">02</span>
              <h4>Analyze</h4>
              <p>We inspect bitrate, codec, frame rate and resolution risks before processing.</p>
            </div>
            <div className="process-card">
              <span className="step-number">03</span>
              <h4>Export</h4>
              <p>Receive a cleaner, safer file optimized for mobile-first social publishing.</p>
            </div>
          </div>
        </section>

        <section className="plan-section" id="plans" aria-label="Subscription plans">
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

          <div className="launch-badges" aria-label="Commercial readiness">
            <span>Usage tracking</span>
            <span>Plan gating</span>
            <span>Payment-ready</span>
            <span>Upload-safe export</span>
          </div>

          {checkoutMessage && <div className="checkout-message">{checkoutMessage}</div>}

          <div className="plan-grid">
            {planOptions.map((plan) => (
              <button
                key={plan.key}
                type="button"
                className={`plan-card${selectedPlan === plan.key ? ' selected' : ''}${pendingPlan === plan.key ? ' pending' : ''}${plan.highlight ? ' highlight' : ''}`}
                onClick={() => openCheckout('plan', plan.key)}
              >
                <div className="plan-topline">
                  <span className="plan-name">{plan.name}</span>
                  {plan.highlight && <span className="plan-badge">Most popular</span>}
                  {selectedPlan === plan.key && !pendingPlan && <span className="plan-status">Active</span>}
                </div>
                <div className="plan-price-row">
                  <span className="plan-price">{plan.price}</span>
                  <span className="plan-cadence">/{plan.cadence}</span>
                </div>
                <div className="plan-limit">{pendingPlan === plan.key ? 'Pending activation' : plan.limit}</div>
                <p>{plan.description}</p>
                <ul className="plan-feature-list">
                  <li>Upload-safe export presets</li>
                  <li>Usage tracking and plan limits</li>
                  <li>Premium support for scaling workflows</li>
                </ul>
                <small>{pendingPlan === plan.key ? 'Awaiting payment confirmation' : plan.bestFor}</small>
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

        {pendingPlan && (
          <div className="pending-upgrade-banner" role="status" aria-live="polite">
            <span>Pending upgrade</span>
            <strong>{pendingPlan === 'pro' ? 'Pro' : 'Starter'}</strong>
            <small>Payment must be confirmed before this plan becomes active.</small>
          </div>
        )}

        <section className="upgrade-panel" aria-label="Credits and upgrade options">
          <div className="upgrade-header-row">
            <div>
              <div className="eyebrow-kicker">UPGRADE</div>
              <h3>Buy more credits or move up a plan.</h3>
            </div>
            <button type="button" className="upgrade-cta" onClick={() => openCheckout('plan', 'starter', 0)}>Checkout Starter</button>
          </div>
          <div className="credit-pack-grid">
            {creditPacks.map((pack) => (
              <button
                key={pack.amount}
                type="button"
                className={`credit-pack${creditPack === pack.amount ? ' selected' : ''}`}
                onClick={() => {
                  setCreditPack(pack.amount);
                  openCheckout('credits', selectedPlan, pack.amount);
                }}
              >
                <span className="pack-amount">{pack.amount}</span>
                <span className="pack-label">credits</span>
                <strong>{pack.price}</strong>
              </button>
            ))}
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

        <section className="story-panel" id="about" aria-label="Before and after export story">
          <div className="story-header-row">
            <div>
              <div className="eyebrow-kicker">EXPORT STORY</div>
              <h3>From a shaky upload to a healthy publish-ready export.</h3>
            </div>
          </div>
          <div className="story-grid">
            <div className="story-card before">
              <span className="story-tag">Before</span>
              <h4>Upload risk</h4>
              <ul>
                <li>High motion blur and weak mobile-optimized settings</li>
                <li>Unexpected bitrate spikes at publish time</li>
                <li>Soft quality on vertical-first formats</li>
              </ul>
            </div>
            <div className="story-card after">
              <span className="story-tag">After</span>
              <h4>Publish-safe export</h4>
              <ul>
                <li>Platform-ready resolution and bitrate matched to target</li>
                <li>Cleaner motion with balanced FPS for social-first output</li>
                <li>Conservative quality strategy without ugly compression artifacts</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="faq-section" aria-label="FAQ">
          <div className="section-heading">
            <div className="eyebrow-kicker">FAQ</div>
            <h3>Everything creators ask before they publish.</h3>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <h4>Does this guarantee zero TikTok compression?</h4>
              <p>No — TikTok still does its own platform-side processing. We reduce avoidable losses and prepare the strongest possible file before upload.</p>
            </div>
            <div className="faq-item">
              <h4>What happens after payment?</h4>
              <p>Your selected plan becomes active after confirmation, and your usage limits update immediately in the app.</p>
            </div>
            <div className="faq-item">
              <h4>Can I use this on mobile?</h4>
              <p>Yes. The access flow and upload tools are designed to work cleanly on desktop and mobile-first workflows.</p>
            </div>
          </div>
        </section>

        <section className="cta-strip" aria-label="Final call to action">
          <div>
            <div className="eyebrow-kicker">READY TO PUBLISH</div>
            <h3>Prepare better exports before your next TikTok upload.</h3>
          </div>
          <button type="button" className="btn btn-success" onClick={() => openCheckout('plan', 'starter')}>Choose Starter</button>
        </section>

        {showCheckoutModal && (
          <div className="checkout-modal-backdrop" role="dialog" aria-modal="true" aria-label="Checkout stub">
            <div className="checkout-modal">
              <div className="checkout-header-row">
                <div>
                  <div className="eyebrow-kicker">CHECKOUT</div>
                  <h3>{checkoutType === 'plan' ? `Activate ${checkoutPlan === 'pro' ? 'Pro' : 'Starter'}` : `Buy ${checkoutAmount} credits`}</h3>
                </div>
                <button type="button" className="close-button" onClick={() => setShowCheckoutModal(false)}>✕</button>
              </div>

              <div className="checkout-summary">
                <div>
                  <span>Plan</span>
                  <strong>{checkoutType === 'plan' ? (checkoutPlan === 'pro' ? 'Pro' : 'Starter') : 'Credits pack'}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{checkoutType === 'plan' ? (checkoutPlan === 'pro' ? '$39' : '$12') : `$${Math.round(checkoutAmount / 5)}`}</strong>
                </div>
              </div>

              <div className="checkout-note">
                {stripeStatusText}. This flow is ready for real checkout in production once your live Stripe or crypto credentials are connected.
              </div>

              <div className="checkout-form">
                <div className="checkout-crypto-options">
                  {cryptoPaymentOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`crypto-option${selectedCryptoMethod === option.key ? ' active' : ''}`}
                      onClick={() => setSelectedCryptoMethod(option.key)}
                    >
                      <span>{option.label}</span>
                      <small>{option.note}</small>
                    </button>
                  ))}
                </div>

                <div className="crypto-wallet-box">
                  <span className="crypto-wallet-label">Send to {activeCryptoOption.label}</span>
                  <strong>{activeCryptoOption.address}</strong>
                  <small>Use the exact wallet and network shown above. Wrong network can cause loss of funds.</small>
                </div>
              </div>

              <button type="button" className="btn btn-success checkout-submit" onClick={confirmCheckout}>
                {checkoutType === 'plan' ? 'Confirm payment & activate plan' : 'Confirm payment & add credits'}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="brand-pill footer-brand">
              <span className="brand-name">BRA<span>X</span></span>
            </div>
            <p>Smart video preparation for creators who want cleaner exports and safer TikTok uploads.</p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <a href="#workspace" className="social-link">Workspace</a>
            <a href="#tools" className="social-link">Tools</a>
            <a href="#results" className="social-link">Results</a>
          </div>
          <div className="footer-section">
            <h4>Commercial</h4>
            <a href="#plans" className="social-link">Pricing</a>
            <button type="button" className="link-button" onClick={() => openCheckout('plan', 'starter')}>Activate Starter</button>
          </div>
        </div>
        <div className="footer-bottom">Brax Video Optimizer © 2026 · For creators, teams and publishers who need cleaner exports before publish.</div>
      </footer>
    </div>
  );
}

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

const readOpenedOfferIds = () => {
  try {
    const raw = window.localStorage.getItem(openedOffersKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .filter((value) => sponsorOffers.some((offer) => offer.id === value));
  } catch {
    return [];
  }
};

const persistOpenedOfferIds = (nextOfferIds: string[]) => {
  const uniqueOfferIds = [...new Set(nextOfferIds.filter((id) => sponsorOffers.some((offer) => offer.id === id)))];
  window.localStorage.setItem(openedOffersKey, JSON.stringify(uniqueOfferIds));
  return uniqueOfferIds;
};

const isSponsorAccessUnlocked = () => {
  return Boolean(readStoredAccessToken());
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [openedOfferIds, setOpenedOfferIds] = useState<string[]>(() => readOpenedOfferIds());

  const apiBase = API_BASE_URL;
  const allOffersCompleted = sponsorOffers.every((offer) => openedOfferIds.includes(offer.id));

  useEffect(() => {
    const syncUnlockState = () => {
      const nextOpenedOfferIds = readOpenedOfferIds();
      setOpenedOfferIds(nextOpenedOfferIds);
      setIsUnlocked(isSponsorAccessUnlocked());
    };

    syncUnlockState();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || [accessTokenKey, openedOffersKey].includes(event.key)) {
        syncUnlockState();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [allOffersCompleted]);

  const accessHeaders = () => ({
    'x-access-token': readStoredAccessToken()
  });

  const unlockTools = async () => {
    if (openedOfferIds.length !== sponsorOffers.length) return;
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
      if (accessToken) {
        window.localStorage.setItem(accessTokenKey, accessToken);
      }
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
      return persistOpenedOfferIds(next);
    });
  };

  const upload = async () => {
    if (!file) return;

    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${apiBase}/api/analyze`, {
      method: 'POST',
      headers: accessHeaders(),
      body: formData
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body?.error || 'Ошибка сервера');
      return;
    }

    const data = await response.json();
    setResult(data);
  };

  const optimize = async () => {
    if (!file) return;

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
        const body = await response.json();
        setError(body?.error || 'Ошибка оптимизации');
        return;
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
        const body = await response.json();
        setError(body?.error || 'Ошибка FPS Boost');
        return;
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
              <button className="confirm-button" onClick={unlockTools} disabled={isUnlocking || openedOfferIds.length !== sponsorOffers.length}>
                {isUnlocking ? 'Checking...' : openedOfferIds.length === sponsorOffers.length ? 'I completed both offers' : `Open ${sponsorOffers.length - openedOfferIds.length} more offer`}
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
            <a href="#tools" className="eyebrow-link">VIDEO QUALITY, REFINED <span>→</span></a>
            <h1>Make every frame<br />look <em>intentional.</em></h1>
            <p>Prepare your video for TikTok with a cleaner workflow, smoother motion and confident quality.</p>
            <div className="hero-stats">
              <div><strong>01</strong><span>Analyze</span></div>
              <div><strong>02</strong><span>Enhance</span></div>
              <div><strong>03</strong><span>Publish</span></div>
            </div>
          </div>

          <section className="tool-panel" id="tools" aria-label="Video tools">
            <div className="panel-label">DROP YOUR SOURCE</div>
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

        {error && <div className="error-box"><span className="error-icon">!</span><p>{error}</p></div>}

        {result && <div className="results-section" id="results">
            <div className="metadata-card">
              <h3>📊 Параметры видео</h3>
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
              <h3>💡 Рекомендации для TikTok</h3>
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

import { useState } from 'react';
import './index.css';
import { API_BASE_URL, SITE_URL } from './config';

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

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  const apiBase = API_BASE_URL;

  const upload = async () => {
    if (!file) return;

    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${apiBase}/api/analyze`, {
      method: 'POST',
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
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div>
              <h1 className="logo">TikTok Video Optimizer</h1>
              <p className="tagline">Video quality workspace</p>
            </div>
            <nav className="site-nav" aria-label="Основная навигация">
              <a href="#workspace" className="site-nav-link active">Workspace</a>
              <a href="#results" className="site-nav-link">Results</a>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="nav-login">Open site</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="hero-section" id="workspace">
          <h2>Подготовь видео к публикации</h2>
          <p>Анализируем параметры видео и оптимизируем их для лучшего качества на TikTok, чтобы публикации выглядели аккуратно и профессионально.</p>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="social-link" style={{ marginTop: '12px', display: 'inline-flex' }}>
            Перейти к публичной странице
          </a>
        </div>

        <div className="upload-section">
          <div className="file-input-wrapper">
            <label htmlFor="file-input" className="file-label">
              <span className="file-icon" aria-hidden="true">+</span>
              <span className="file-text">Выбери видео или перетащи сюда</span>
              <span className="file-hint">{file ? file.name : 'MP4, MOV, AVI...'}</span>
            </label>
            <input
              id="file-input"
              type="file"
              accept="video/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="file-input"
            />
          </div>

          <div className="button-group">
            <button
              onClick={upload}
              disabled={!file}
              className="btn btn-primary"
            >
              Анализировать видео
            </button>
            <button
              onClick={optimize}
              disabled={!file || isOptimizing}
              className="btn btn-success"
            >
              {isOptimizing ? 'Оптимизируем...' : 'Оптимизировать и скачать'}
            </button>
            <button
              onClick={boostFps}
              disabled={!file || isBoosting}
              className="btn btn-fps"
            >
              {isBoosting ? 'Делаем плавнее...' : 'FPS BOOST'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="results-section" id="results">
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
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>TikTok Video Optimizer</h4>
            <p>Публичный инструмент для подготовки видео под TikTok с понятными рекомендациями и быстрым улучшением качества.</p>
          </div>

          <div className="footer-section">
            <h4>Мои каналы</h4>
            <div className="social-links">
              <a
                href="https://www.tiktok.com/@braxaep13"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link tiktok"
                title="TikTok @braxaep13"
              >
                <span className="social-icon">🎵</span> @braxaep13
              </a>
              <a
                href="https://www.tiktok.com/@braxelona"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link tiktok"
                title="TikTok @braxelona"
              >
                <span className="social-icon">🎵</span> @braxelona
              </a>
              <a
                href="https://youtube.com/@braxaep"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link youtube"
                title="YouTube @braxaep"
              >
                <span className="social-icon">▶️</span> @braxaep
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Информация</h4>
            <p>© 2026 TikTok Video Optimizer</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
              Open Source • MIT License
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Сделано с ❤️ для создателей контента</p>
        </div>
      </footer>
    </>
  );
}

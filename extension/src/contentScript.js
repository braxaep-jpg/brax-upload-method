const createBottomBadge = () => {
  if (document.getElementById('brax-bottom-badge')) {
    return null;
  }

  const badge = document.createElement('div');
  badge.id = 'brax-bottom-badge';
  badge.title = 'Нажмите чтобы открыть Brax';

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon-48.svg');
  icon.alt = 'Brax';

  const text = document.createElement('span');
  text.textContent = 'Brax готов';

  badge.append(icon, text);
  badge.addEventListener('click', async () => {
    const config = await getConfig();
    window.open(config.frontendUrl, '_blank');
  });

  document.body.appendChild(badge);
  return badge;
};

const optimizeVideoFile = async (file) => {
  const config = await getConfig();

  try {
    const formData = new FormData();
    formData.append('video', file, file.name);

    const response = await fetch(`${config.backendUrl}/api/optimize`, {
      method: 'POST',
      body: formData,
      mode: 'cors'
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText || 'Unknown error');
      throw new Error(`Backend error ${response.status}: ${text}`);
    }

    const optimizedBlob = await response.blob();
    const optimizedName = file.name ? file.name.replace(/\.[^\.]+$/, '') + '-optimized.mp4' : `brax-optimized-${Date.now()}.mp4`;

    return {
      success: true,
      blob: optimizedBlob,
      filename: optimizedName,
      message: 'Видео оптимизировано!'
    };
  } catch (error) {
    return { success: false, message: `Ошибка оптимизации: ${error.message}` };
  }
};

const createUploadOverlay = (target) => {
  removeUploadOverlay();

  const host = document.createElement('div');
  host.id = 'brax-upload-overlay';
  host.style.position = 'fixed';
  host.style.top = '20px';
  host.style.right = '20px';
  host.style.zIndex = '9999999999';
  host.style.width = 'min(420px, calc(100vw - 32px))';
  host.style.maxWidth = '420px';
  host.style.pointerEvents = 'none';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .brax-overlay {
      all: unset;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      min-height: 160px;
      padding: 20px;
      border-radius: 24px;
      background: rgba(0, 0, 0, 0.92);
      box-shadow: 0 32px 90px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(18px);
      color: #fff;
      font-family: Inter, 'Segoe UI', sans-serif;
      pointer-events: auto;
    }
    .brax-overlay-title {
      all: unset;
      display: block;
      font-size: 16px;
      font-weight: 800;
      color: #fff;
    }
    .brax-overlay-text {
      all: unset;
      display: block;
      font-size: 14px;
      color: rgba(255,255,255,0.92);
      line-height: 1.4;
    }
    .brax-button {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 170px;
      padding: 14px 24px;
      margin-top: 18px;
      border-radius: 999px;
      background: linear-gradient(135deg, #00d9ff, #1de9b6);
      color: #08132d;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 16px 40px rgba(0, 217, 255, 0.4);
      transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease, background 160ms ease;
      pointer-events: auto;
      position: relative;
      border: 2px solid rgba(255,255,255,0.14);
      background-clip: padding-box;
      outline: none;
    }
    .brax-button:hover { transform: translateY(-2px); box-shadow: 0 18px 42px rgba(0, 217, 255, 0.45); }
    .brax-button:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: 0 12px 28px rgba(0,0,0,0.2); }
    .brax-spinner { display: flex; justify-content: center; gap: 10px; margin-top: 14px; pointer-events: none; }
    .brax-spinner-dot { width: 8px; height: 8px; border-radius: 50%; background: #00d9ff; box-shadow: 0 0 12px rgba(0, 215, 255, 0.4); animation: brax-pulse 1s infinite ease-in-out; }
    .brax-spinner-dot:nth-child(2) { animation-delay: 0.16s; }
    .brax-spinner-dot:nth-child(3) { animation-delay: 0.32s; }
    @keyframes brax-pulse { 0%,100% { transform: scale(0.8); opacity: 0.55; } 50% { transform: scale(1.2); opacity: 1; }}
  `;

  const overlay = document.createElement('div');
  overlay.className = 'brax-overlay';

  const title = document.createElement('div');
  title.className = 'brax-overlay-title';
  title.textContent = 'Видео загружено';

  const description = document.createElement('div');
  description.className = 'brax-overlay-text';
  description.textContent = 'Без потерь качества • высокий битрейт • TikTok-ready';

  const status = document.createElement('div');
  status.className = 'brax-overlay-text';
  status.textContent = 'Нажмите «Оптимизировать», чтобы начать';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.pointerEvents = 'auto';

  const optimizeButton = document.createElement('button');
  optimizeButton.type = 'button';
  optimizeButton.className = 'brax-button';
  optimizeButton.textContent = 'Оптимизировать';

  let downloadUrl = null;
  let downloadFilename = '';

  const updateButtonAppearance = (success, text) => {
    optimizeButton.textContent = text;
    optimizeButton.disabled = false;
    optimizeButton.style.background = success ? '#1de9b6' : '#ff4444';
    optimizeButton.style.color = success ? '#08132d' : '#fff';
    optimizeButton.style.boxShadow = success
      ? '0 16px 40px rgba(28, 214, 134, 0.45)'
      : '0 16px 40px rgba(255, 68, 68, 0.4)';
  };

  const runOptimization = async () => {
    const file = target.files?.[0];
    if (!file) return;

    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
      downloadUrl = null;
      downloadFilename = '';
    }

    optimizeButton.disabled = true;
    optimizeButton.textContent = 'Оптимизируем...';
    status.textContent = 'Связываемся с Brax API...';

    const result = await optimizeVideoFile(file);

    if (result.success && result.blob) {
      status.textContent = 'Готово. Оптимизация завершена, загрузка началась.';
      downloadUrl = window.URL.createObjectURL(result.blob);
      downloadFilename = result.filename || file.name.replace(/\.[^\.]+$/, '') + '-optimized.mp4';
      updateButtonAppearance(true, 'Скачать');

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      status.textContent = result.message || 'Ошибка оптимизации';
      updateButtonAppearance(false, 'Повторить');
    }
  };

  optimizeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (optimizeButton.disabled) return;

    if (optimizeButton.textContent === 'Повторить' || optimizeButton.textContent === 'Оптимизировать') {
      void runOptimization();
      return;
    }

    if (optimizeButton.textContent === 'Скачать' && downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadFilename || 'brax-optimized.mp4';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
      }, 100);
    }
  });

  const spinner = document.createElement('div');
  spinner.className = 'brax-spinner';
  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'brax-spinner-dot';
    spinner.appendChild(dot);
  }

  buttonContainer.appendChild(optimizeButton);
  overlay.append(title, description, status, buttonContainer, spinner);
  shadow.append(style, overlay);
  document.body.appendChild(host);

  void runOptimization();
  return host;
};

const removeUploadOverlay = () => {
  const existing = document.getElementById('brax-upload-overlay');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
};

const handleFileChange = (event) => {
  const target = event.target;
  if (!target || target.type !== 'file') return;

  const input = target;
  if (!input.files?.length) {
    removeUploadOverlay();
    return;
  }

  const file = input.files[0];
  if (!file.type.startsWith('video/')) {
    removeUploadOverlay();
    return;
  }

  createUploadOverlay(input);
};

const handleDragEvents = (event) => {
  const isVideo = event.dataTransfer?.types?.contains?.('Files') || event.dataTransfer?.types?.includes?.('Files');
  if (!isVideo) return;

  const target = event.target;
  if (!target || !(target instanceof HTMLElement)) return;

  const uploadInput = document.querySelector('input[type="file"][accept*="video"]');
  if (!uploadInput) return;

  if (event.type === 'dragenter' || event.type === 'dragover') {
    createUploadOverlay(uploadInput);
  } else if (event.type === 'drop') {
    createUploadOverlay(uploadInput);
  }
};

const startWatching = () => {
  createBottomBadge();

  document.addEventListener('change', handleFileChange, true);
  document.addEventListener('dragenter', handleDragEvents, true);
  document.addEventListener('dragover', handleDragEvents, true);
  document.addEventListener('dragleave', handleDragEvents, true);
  document.addEventListener('drop', handleDragEvents, true);

  const observer = new MutationObserver(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    inputs.forEach((input) => {
      if (input.dataset.braxHandled) return;
      input.dataset.braxHandled = 'true';
      input.addEventListener('click', () => {
        if (!input.files?.length) {
          removeUploadOverlay();
        }
      }, true);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

if (window.location.host.includes('tiktok.com')) {
  startWatching();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'showBraxAlert') {
    alert('Brax Upload Method проверяет загрузку TikTok.');
  }
});

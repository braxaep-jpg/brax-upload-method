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
  if (!config.accessToken) {
    throw new Error('Сначала добавьте access token в настройках расширения.');
  }

  const formData = new FormData();
  formData.append('video', file, file.name);

  const response = await fetch(`${config.backendUrl}/api/optimize`, {
    method: 'POST',
    headers: {
      'x-access-token': config.accessToken,
      'x-user-id': config.userId,
      'x-plan': 'free',
      'x-credits': '0'
    },
    body: formData,
    mode: 'cors'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText || 'Unknown error');
    throw new Error(`Backend error ${response.status}: ${text}`);
  }

  const optimizedBlob = await response.blob();
  const optimizedName = file.name ? file.name.replace(/\.[^\.]+$/, '') + '-brax.mp4' : `brax-upload-${Date.now()}.mp4`;

  return new File([optimizedBlob], optimizedName, {
    type: 'video/mp4',
    lastModified: Date.now()
  });
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
      min-height: 120px;
      padding: 18px;
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
  title.textContent = 'Подготовка файла для TikTok';

  const description = document.createElement('div');
  description.className = 'brax-overlay-text';
  description.textContent = 'Brax подготовит выбранный файл перед передачей загрузчику.';

  const status = document.createElement('div');
  status.className = 'brax-overlay-text';
  status.textContent = 'Оригинал пока не передан загрузчику TikTok.';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.pointerEvents = 'auto';

  const optimizeButton = document.createElement('button');
  optimizeButton.type = 'button';
  optimizeButton.className = 'brax-button';
  optimizeButton.textContent = 'Подготавливаем…';
  optimizeButton.disabled = true;

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

  return { host, status, optimizeButton };
};

const removeUploadOverlay = () => {
  const existing = document.getElementById('brax-upload-overlay');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
};

const preparedFiles = new WeakSet();
const replayedInputs = new WeakSet();

const handleFileChange = (event) => {
  const target = event.target;
  if (!target || target.type !== 'file') return;

  const input = target;
  if (replayedInputs.has(input)) {
    replayedInputs.delete(input);
    return;
  }

  if (!input.files?.length) {
    removeUploadOverlay();
    return;
  }

  const file = input.files[0];
  if (!file.type.startsWith('video/') || preparedFiles.has(file)) {
    removeUploadOverlay();
    return;
  }

  event.stopImmediatePropagation();
  const overlay = createUploadOverlay(input);
  overlay.status.textContent = 'Подготавливаем выбранный файл…';

  void (async () => {
    try {
      const preparedFile = await optimizeVideoFile(file);
      const transfer = new DataTransfer();
      transfer.items.add(preparedFile);
      input.files = transfer.files;
      preparedFiles.add(preparedFile);
      replayedInputs.add(input);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      overlay.status.textContent = 'Подготовленный файл передан загрузчику TikTok. Проверьте предпросмотр перед публикацией.';
      overlay.optimizeButton.textContent = 'Файл подготовлен';
      overlay.optimizeButton.style.background = '#1de9b6';
      overlay.optimizeButton.style.color = '#08132d';
      overlay.optimizeButton.disabled = true;
    } catch (error) {
      replayedInputs.add(input);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      overlay.status.textContent = `Не удалось подготовить файл; TikTok получил оригинал. ${error.message}`;
      overlay.optimizeButton.textContent = 'Оригинал выбран';
      overlay.optimizeButton.style.background = '#ffcc66';
      overlay.optimizeButton.style.color = '#08132d';
      overlay.optimizeButton.disabled = true;
    }
  })();
};

const startWatching = () => {
  createBottomBadge();

  document.addEventListener('change', handleFileChange, true);

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

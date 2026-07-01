const createBottomBadge = () => {
  if (document.getElementById('brax-bottom-badge')) {
    return null;
  }

  const badge = document.createElement('div');
  badge.id = 'brax-bottom-badge';
  badge.title = 'Brax Upload Method активен';

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon-48.png');
  icon.alt = 'Brax';

  const text = document.createElement('span');
  text.textContent = 'Brax работает';

  badge.append(icon, text);
  badge.addEventListener('click', () => {
    window.open('https://brax-upload-method.example.com', '_blank');
  });

  document.body.appendChild(badge);
  return badge;
};

const createUploadOverlay = (target: HTMLInputElement) => {
  removeUploadOverlay();

  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'brax-upload-overlay';

  const content = document.createElement('div');
  content.className = 'brax-overlay-content';

  const title = document.createElement('div');
  title.className = 'brax-overlay-title';
  title.textContent = 'Загрузка видео обнаружена';

  const description = document.createElement('div');
  description.textContent = 'Brax оптимизирует файл для TikTok. Не закрывайте страницу.';

  const spinner = document.createElement('div');
  spinner.className = 'brax-upload-spinner';
  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'brax-upload-spinner-dot';
    spinner.appendChild(dot);
  }

  content.append(title, description, spinner);
  overlay.appendChild(content);

  overlay.style.top = `${rect.top + window.scrollY - 10}px`;
  overlay.style.left = `${rect.left + window.scrollX - 10}px`;
  overlay.style.width = `${Math.max(rect.width + 20, 280)}px`;
  overlay.style.height = `${Math.max(rect.height + 20, 120)}px`;

  document.body.appendChild(overlay);
  return overlay;
};

const removeUploadOverlay = () => {
  const existing = document.getElementById('brax-upload-overlay');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target || target.type !== 'file') return;

  if (!target.files?.length) {
    removeUploadOverlay();
    return;
  }

  const file = target.files[0];
  if (!file.type.startsWith('video/')) {
    removeUploadOverlay();
    return;
  }

  createUploadOverlay(target);
};

const startWatching = () => {
  createBottomBadge();
  document.addEventListener('change', handleFileChange, true);

  const observer = new MutationObserver(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    inputs.forEach((input) => {
      if (input.dataset.braxHandled) return;
      input.dataset.braxHandled = 'true';
      input.addEventListener('click', () => {
        removeUploadOverlay();
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

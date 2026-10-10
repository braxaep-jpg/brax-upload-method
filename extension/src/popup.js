const backendInput = document.getElementById('backend');
const tokenInput = document.getElementById('token');
const saveButton = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.local.get(['braxBackendUrl', 'braxAccessToken'], (settings) => {
  backendInput.value = settings.braxBackendUrl || 'https://brax-video-optimizer.onrender.com';
  tokenInput.value = settings.braxAccessToken || '';
});

saveButton.addEventListener('click', async () => {
  let backendUrl;
  try {
    backendUrl = new URL(backendInput.value.trim());
    if (backendUrl.protocol !== 'https:' && !(backendUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(backendUrl.hostname))) {
      throw new Error('Use HTTPS, except for localhost development.');
    }
  } catch (error) {
    status.textContent = error.message || 'Enter a valid backend URL.';
    return;
  }

  const token = tokenInput.value.trim();
  if (!token) {
    status.textContent = 'Enter the Brax access token first.';
    return;
  }

  const originPattern = `${backendUrl.origin}/*`;
  const permissionGranted = await chrome.permissions.request({ origins: [originPattern] });
  if (!permissionGranted) {
    status.textContent = 'Backend permission was not granted.';
    return;
  }

  await chrome.storage.local.set({
    braxBackendUrl: backendUrl.origin,
    braxAccessToken: token
  });
  status.textContent = 'Settings saved. Reload TikTok before uploading.';
});
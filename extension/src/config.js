const DEFAULT_CONFIG = {
  backendUrl: 'https://brax-video-optimizer.onrender.com',
  frontendUrl: 'https://tiktokvideooptimizer.com'
};

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['braxBackendUrl', 'braxFrontendUrl', 'braxAccessToken', 'braxUserId'], (result) => {
      const userId = result.braxUserId || `extension_${crypto.randomUUID()}`;
      if (!result.braxUserId) {
        chrome.storage.local.set({ braxUserId: userId });
      }
      resolve({
        backendUrl: result.braxBackendUrl || DEFAULT_CONFIG.backendUrl,
        frontendUrl: result.braxFrontendUrl || DEFAULT_CONFIG.frontendUrl,
        accessToken: result.braxAccessToken || '',
        userId
      });
    });
  });
}

async function saveConfig(backendUrl, frontendUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ braxBackendUrl: backendUrl, braxFrontendUrl: frontendUrl }, resolve);
  });
}

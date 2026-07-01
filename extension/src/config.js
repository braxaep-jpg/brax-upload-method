const DEFAULT_CONFIG = {
  backendUrl: 'https://api.tiktokvideooptimizer.com',
  frontendUrl: 'https://tiktokvideooptimizer.com'
};

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['braxBackendUrl', 'braxFrontendUrl'], (result) => {
      resolve({
        backendUrl: result.braxBackendUrl || DEFAULT_CONFIG.backendUrl,
        frontendUrl: result.braxFrontendUrl || DEFAULT_CONFIG.frontendUrl
      });
    });
  });
}

async function saveConfig(backendUrl, frontendUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ braxBackendUrl: backendUrl, braxFrontendUrl: frontendUrl }, resolve);
  });
}

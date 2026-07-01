chrome.runtime.onInstalled.addListener(() => {
  console.log('Brax Upload Method extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;

  const showAlert = () => {
    alert('Brax Upload Method проверяет загрузку TikTok.');
  };

  if (chrome.scripting && chrome.scripting.executeScript) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showAlert
    }).catch((err) => {
      console.error('chrome.scripting.executeScript failed:', err);
      chrome.tabs.sendMessage(tab.id, { action: 'showBraxAlert' }).catch(() => {
        console.warn('Failed to send message to content script');
      });
    });
  } else {
    chrome.tabs.sendMessage(tab.id, { action: 'showBraxAlert' }).catch(() => {
      console.warn('chrome.tabs.sendMessage failed: content script may not be loaded');
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'optimizeVideo') {
    handleVideoOptimization(request.backendUrl, request.videoData, request.videoType, request.videoName)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        return reject(new Error('Failed to convert blob to base64'));
      }
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function handleVideoOptimization(backendUrl, videoData, videoType, videoName) {
  const urlsToTry = [backendUrl];
  if (backendUrl.includes('localhost')) {
    urlsToTry.push(backendUrl.replace('localhost', '127.0.0.1'));
  }

  if (!videoData || !(videoData instanceof ArrayBuffer)) {
    throw new Error('Invalid video data payload');
  }

  const fileToUpload = new Blob([videoData], { type: videoType || 'video/mp4' });
  const filename = videoName || 'upload.mp4';

  let lastError = null;
  for (const url of urlsToTry) {
    try {
      const response = await fetch(`${url}/api/optimize-json`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: filename,
          fileType: fileToUpload.type,
          fileBase64: await blobToBase64(fileToUpload)
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText || 'Unknown error');
        throw new Error(`Backend error ${response.status}: ${message}`);
      }

      const optimizedBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(optimizedBlob);
      const downloadFilename = `brax-optimized-${Date.now()}.mp4`;
      await chrome.downloads.download({ url: downloadUrl, filename: downloadFilename, saveAs: false });
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);

      return { message: `Оптимизация завершена; файл загружается как ${downloadFilename}` };
    } catch (error) {
      lastError = error;
      console.error(`Video optimization failed for ${url}:`, error);
      if (url === urlsToTry[urlsToTry.length - 1]) {
        throw new Error(`Failed to connect to backend ${url}: ${error.message}`);
      }
    }
  }

  throw lastError || new Error('Unknown backend optimization failure');
}

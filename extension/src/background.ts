chrome.runtime.onInstalled.addListener(() => {
  console.log('Brax Upload Method extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        alert('Brax Upload Method is ready to optimize TikTok uploads.');
      }
    });
  }
});

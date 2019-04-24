
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === 'getConfig') {
    const configUrl = chrome.runtime.getURL('config.json');

    fetch(configUrl)
      .then(response => response.json())
      .then((config) => {
        chrome.management.getSelf((info) => {
          let environment = 'development';
          if (info.installType === 'normal') {
            environment = 'production';
          }
          const defaultConfig = config.development;
          const environmentConfig = config[environment];
          const configMerged = Object.assign(defaultConfig, environmentConfig);
          sendResponse(configMerged);
        });
      });
  }
  return true;
});

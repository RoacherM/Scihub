// 维护一个可用域名列表
const SCIHUB_DOMAINS = [
  'https://sci-hub.se',
  'https://sci-hub.st',
  'https://sci-hub.ru'
];

// 检查论文是否可用的函数
async function checkPaperAvailability(url, domain) {
  try {
    const response = await fetch(`${domain}/${url}`, {
      method: 'HEAD'  // 使用HEAD请求更快
    });
    return response.status === 200;
  } catch (error) {
    console.error(`检查失败 ${domain}:`, error);
    return false;
  }
}

// 检查哪个镜像站点可用
async function findAvailableMirror() {
  for (const domain of SCIHUB_DOMAINS) {
    try {
      const response = await fetch(domain, {
        method: 'HEAD'
      });
      if (response.status === 200) {
        return domain;
      }
    } catch (error) {
      console.error(`镜像站点 ${domain} 不可用:`, error);
    }
  }
  return null;
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkAvailability") {
    (async () => {
      try {
        // 首先找到可用的镜像站点
        const availableMirror = await findAvailableMirror();
        
        if (!availableMirror) {
          sendResponse({ isAvailable: false, error: "No available mirrors" });
          return;
        }

        // 检查论文是否可用
        const isAvailable = await checkPaperAvailability(request.url, availableMirror);
        
        sendResponse({
          isAvailable: isAvailable,
          mirror: isAvailable ? availableMirror : null
        });
      } catch (error) {
        console.error('检查可用性时出错:', error);
        sendResponse({ isAvailable: false, error: error.message });
      }
    })();
    
    return true; // 保持消息通道开启，等待异步响应
  }
});
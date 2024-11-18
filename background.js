chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'checkSciHubAvailability') {
        // 添加自定义请求头以模拟浏览器请求
        fetch(request.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1'
            },
            redirect: 'follow'  // 自动跟随重定向
        })
        .then(async response => {
            // 处理重定向
            if (response.redirected) {
                console.log('Redirected to:', response.url);
                // 如果重定向到 library.lol，说明文章可用
                if (response.url.includes('library.lol')) {
                    sendResponse({ 
                        isAvailable: true,
                        redirectUrl: response.url
                    });
                    return;
                }
            }
            
            const text = await response.text();
            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].toLowerCase() : '';
            
            // 更宽松的标题检查：只要包含 sci-hub 即可
            const isSciHubPage = title.includes('sci-hub');
            
            // 更准确的错误检测
            const errorIndicators = [
                'article not found',
                'page not found',
                'requested page was not found',
                'sci-hub could not fetch requested document',
                '未找到文章',
                '找不到该文章',
                '无法访问',
                'error 404',
                'bot detected'
            ];

            const hasError = errorIndicators.some(indicator => 
                text.toLowerCase().includes(indicator.toLowerCase())
            );

            // 检查是否包含 PDF 或嵌入的文档内容
            const hasContent = text.includes('iframe') || 
                             text.includes('pdf') || 
                             text.includes('embed') ||
                             text.includes('download') ||
                             text.includes('.pdf');

            // 新的可用性判断逻辑
            const isAvailable = isSciHubPage && !hasError;

            console.log('Availability check details:', {
                url: request.url,
                title: title,
                isSciHubPage: isSciHubPage,
                hasError: hasError,
                hasContent: hasContent
            });

            sendResponse({ 
                isAvailable: isAvailable,
                debug: {
                    title: title,
                    isSciHubPage: isSciHubPage,
                    hasError: hasError,
                    hasContent: hasContent,
                    snippet: text.substring(0, 500)
                }
            });
        })
        .catch(error => {
            console.error('Error checking availability:', error);
            sendResponse({ 
                isAvailable: false,
                error: error.message 
            });
        });
        return true; // 保持消息通道开放
    }
});
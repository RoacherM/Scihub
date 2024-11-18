chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'checkSciHubAvailability') {
        fetch(request.url)
            .then(response => response.text())
            .then(text => {
                const titleMatch = text.match(/<title>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1].toLowerCase() : '';
                
                // 1. 更宽松的标题检查：只要包含 sci-hub 即可
                const isSciHubPage = title.includes('sci-hub');
                
                // 2. 更准确的错误检测
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

                // 3. 检查是否包含 PDF 或嵌入的文档内容
                const hasContent = text.includes('iframe') || 
                                 text.includes('pdf') || 
                                 text.includes('embed') ||
                                 text.includes('download') ||
                                 text.includes('.pdf');

                // 4. 新的可用性判断逻辑
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
                        // 添加页面内容片段用于调试
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
        return true;
    }
});
// Global state management
const processedResults = new WeakSet();

/**
 * Extract DOI from citation text or URL
 * @param {string} text - Text to search for DOI
 * @returns {string|null} - Found DOI or null
 */
function extractDOI(text) {
    if (!text) return null;
    // DOI regex pattern
    const doiPattern = /\b(10\.\d{4,}(?:\.\d+)*\/(?:(?!["&\'<>])\S)+)\b/i;
    const match = text.match(doiPattern);
    return match ? match[1] : null;
}

/**
 * Extract PMID from citation text
 * @param {string} text - Text to search for PMID
 * @returns {string|null} - Found PMID or null
 */
function extractPMID(text) {
    if (!text) return null;
    // Look for PMID in the citation text
    const pmidPattern = /PMID:\s*(\d+)|PMC(\d+)/i;
    const match = text.match(pmidPattern);
    return match ? match[1] || match[2] : null;
}

/**
 * Construct Sci-Hub URL based on paper identifiers
 * @param {Element} result - Search result element
 * @returns {string} - Sci-Hub URL
 */
function constructSciHubUrl(result) {
    // Try to find paper identifiers
    const linkElement = result.querySelector('h3.gs_rt a');
    const citationText = result.textContent;
    
    // 1. First try to find DOI
    const doi = extractDOI(citationText);
    if (doi) {
        return `https://sci-hub.ru/${doi}`;
    }
    
    // 2. Then try to find PMID
    const pmid = extractPMID(citationText);
    if (pmid) {
        return `https://sci-hub.ru/pmid${pmid}`;
    }
    
    // 3. Finally, use the full URL if available
    if (linkElement) {
        const originalUrl = linkElement.href;
        return `https://sci-hub.ru/${originalUrl}`;
    }
    
    return null;
}

/**
 * Check if article is available on Sci-Hub
 * @param {string} url - Sci-Hub URL to check
 * @returns {Promise<boolean>} - Whether article is available
 */
async function checkSciHubAvailability(url) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'checkSciHubAvailability',
            url: url
        });
        return response.isAvailable;
    } catch (error) {
        console.error('Error checking Sci-Hub availability:', error);
        return false;
    }
}

/**
 * Updates button state based on availability
 * @param {Element} button - Button element to update
 * @param {boolean} isAvailable - Whether article is available
 */
function updateButtonState(button, isAvailable) {
    if (isAvailable) {
        button.style.backgroundColor = '#4CAF50';
        button.innerHTML = `<span style="margin-right: 4px;">🌐</span>通过Sci-Hub访问`;
        button.disabled = false;
    } else {
        button.style.backgroundColor = '#9E9E9E';
        button.innerHTML = `<span style="margin-right: 4px;">❌</span>在Sci-Hub中未找到`;
        button.disabled = true;
    }
}

/**
 * Creates buttons for accessing papers
 * @param {Element} result - Result element to append button to
 * @returns {Element} - Button container
 */
function createButtons(result) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'sci-hub-button-container';
    buttonContainer.style.marginTop = '10px';
    
    const linkElement = result.querySelector('h3.gs_rt a');
    const pdfLinkElement = result.querySelector('.gs_or_ggsm a');

    if (pdfLinkElement) {
        // Create preview button
        const previewButton = document.createElement('button');
        previewButton.className = 'sci-hub-button';
        previewButton.style.backgroundColor = '#2196F3';
        previewButton.style.marginRight = '8px';
        previewButton.innerHTML = `<span style="margin-right: 4px;">👁️</span>预览PDF`;
        
        previewButton.onclick = () => {
            // Create modal for PDF preview
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '关闭预览';
            closeButton.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                padding: 8px 16px;
                background: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            
            const iframe = document.createElement('iframe');
            iframe.src = pdfLinkElement.href;
            iframe.style.cssText = `
                width: 90%;
                height: 90%;
                border: none;
                background: white;
            `;
            
            closeButton.onclick = () => document.body.removeChild(modal);
            modal.appendChild(closeButton);
            modal.appendChild(iframe);
            document.body.appendChild(modal);
        };
        
        const accessButton = document.createElement('button');
        accessButton.className = 'sci-hub-button';
        accessButton.style.backgroundColor = '#4CAF50';
        accessButton.innerHTML = `<span style="margin-right: 4px;">🔑</span>下载PDF`;
        accessButton.onclick = () => {
            window.open(pdfLinkElement.href, '_blank');
        };
        
        buttonContainer.appendChild(previewButton);
        buttonContainer.appendChild(accessButton);
        
    } else {
        // Create Sci-Hub access button
        const scihubButton = document.createElement('button');
        scihubButton.className = 'sci-hub-button';
        scihubButton.style.backgroundColor = '#4CAF50';
        scihubButton.innerHTML = `<span style="margin-right: 4px;">🔍</span>检查Sci-Hub可用性...`;
        scihubButton.disabled = true;
        
        const sciHubUrl = constructSciHubUrl(result);
        if (sciHubUrl) {
            // Check availability and update button
            checkSciHubAvailability(sciHubUrl).then(isAvailable => {
                updateButtonState(scihubButton, isAvailable);
                if (isAvailable) {
                    scihubButton.onclick = () => {
                        window.open(sciHubUrl, '_blank');
                    };
                }
            });
        } else {
            updateButtonState(scihubButton, false);
        }
        
        buttonContainer.appendChild(scihubButton);
    }

    return buttonContainer;
}

// Add styles
const styles = document.createElement('style');
styles.textContent = `
    .sci-hub-button {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        transition: all 0.2s;
    }
    
    .sci-hub-button:hover:not(:disabled) {
        opacity: 0.9;
    }
    
    .sci-hub-button:disabled {
        cursor: not-allowed;
        opacity: 0.7;
    }
`;
document.head.appendChild(styles);

/**
 * Adds access buttons to the page
 */
function addAccessButtons() {
    try {
        const results = document.querySelectorAll('.gs_r');
        results.forEach(result => {
            if (!processedResults.has(result)) {
                const buttonContainer = createButtons(result);
                if (buttonContainer) {
                    const rightColumn = result.querySelector('.gs_ri');
                    if (rightColumn && !rightColumn.querySelector('.sci-hub-button-container')) {
                        rightColumn.appendChild(buttonContainer);
                    }
                }
                processedResults.add(result);
            }
        });
    } catch (error) {
        console.error('添加按钮时出错:', error);
    }
}

// Initialize everything
function initialize() {
    addAccessButtons();
    const observer = new MutationObserver(() => {
        addAccessButtons();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Start the script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
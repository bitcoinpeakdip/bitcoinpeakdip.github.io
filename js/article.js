// article.js - Xử lý markdown và hiển thị bài viết
// Version: 1.5.4 - Removed all toast and notification code

const ARTICLE_CONFIG = {
    version: '1.5.4',
    articlesPath: '/learn/articles/',
    metadataPath: '/learn/articles.json',
    cacheKey: 'peakdip_articles',
    cacheTimeKey: 'peakdip_articles_time',
    cacheDuration: 3600000 // 1 giờ
};
// TẮT HOÀN TOÀN TÍNH NĂNG NOTIFICATION
//window.NOTIFICATIONS_DISABLED = true;

// ========== MARKDOWN CONVERTER NÂNG CẤP ==========
class MarkdownConverter {
    static convert(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        // Xử lý code blocks trước
        html = this.processCodeBlocks(html);
        
        // Xử lý headings
        html = this.processHeadings(html);
        
        // Xử lý tables
        html = this.processTables(html);
        
        // Xử lý lists
        html = this.processLists(html);
        
        // Xử lý blockquotes
        html = this.processBlockquotes(html);
        
        // Xử lý horizontal rules
        html = html.replace(/^---$/gim, '<hr>');
        
        // Xử lý images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" loading="lazy" class="article-image">');
        
        // Xử lý links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Xử lý bold và italic
        html = this.processTextFormatting(html);
        
        // Xử lý special boxes
        html = this.processSpecialBoxes(html);
        
        // Xử lý paragraphs (cho các dòng còn lại)
        html = this.processParagraphs(html);
        
        return html;
    }
    
    // Xử lý code blocks
    static processCodeBlocks(html) {
        // Code blocks với ```language
        html = html.replace(/```(\w*)\n([\s\S]*?)```/gim, function(match, language, code) {
            const lang = language || 'plaintext';
            return `<pre><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>`;
        }.bind(this));
        
        // Inline code
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
        
        return html;
    }
    
    // Xử lý headings
    static processHeadings(html) {
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
        html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
        return html;
    }
    
    // Xử lý tables
    static processTables(html) {
        const lines = html.split('\n');
        let inTable = false;
        let tableHtml = [];
        let tableRows = [];
        let headers = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Phát hiện bắt đầu bảng (có | và ---)
            if (line.includes('|') && lines[i+1] && lines[i+1].includes('|---')) {
                inTable = true;
                
                // Xử lý headers
                headers = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
                
                // Xử lý dòng separator
                i++; // Bỏ qua dòng separator
                continue;
            }
            
            if (inTable && line.includes('|')) {
                // Xử lý dòng dữ liệu
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
                tableRows.push(cells);
            } else if (inTable) {
                // Kết thúc bảng
                inTable = false;
                
                // Tạo HTML table
                let table = '<div class="table-responsive"><table class="markdown-table">';
                
                // Headers
                if (headers.length > 0) {
                    table += '<thead><tr>';
                    headers.forEach(header => {
                        table += `<th>${header}</th>`;
                    });
                    table += '</tr></thead>';
                }
                
                // Body
                if (tableRows.length > 0) {
                    table += '<tbody>';
                    tableRows.forEach(row => {
                        table += '<tr>';
                        row.forEach(cell => {
                            table += `<td>${cell}</td>`;
                        });
                        table += '</tr>';
                    });
                    table += '</tbody>';
                }
                
                table += '</table></div>';
                tableHtml.push(table);
                
                // Reset
                headers = [];
                tableRows = [];
            }
            
            if (!inTable) {
                tableHtml.push(line);
            }
        }
        
        return tableHtml.join('\n');
    }
    
    // Xử lý lists
    static processLists(html) {
        // Unordered lists
        html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^\+ (.*$)/gim, '<ul><li>$1</li></ul>');
        
        // Ordered lists
        html = html.replace(/^[0-9]+\. (.*$)/gim, '<ol><li>$1</li></ol>');
        
        // Ghép các list items liên tiếp
        html = html.replace(/<\/ul>\n<ul>/g, '');
        html = html.replace(/<\/ol>\n<ol>/g, '');
        
        return html;
    }
    
    // Xử lý blockquotes
    static processBlockquotes(html) {
        html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Ghép các blockquotes liên tiếp
        let inBlockquote = false;
        const lines = html.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('<blockquote>')) {
                if (!inBlockquote) {
                    result.push('<blockquote>');
                    inBlockquote = true;
                }
                result.push(line.replace('<blockquote>', '').replace('</blockquote>', ''));
            } else if (inBlockquote && line === '</blockquote>') {
                // Skip
            } else {
                if (inBlockquote) {
                    result.push('</blockquote>');
                    inBlockquote = false;
                }
                result.push(line);
            }
        }
        
        return result.join('\n');
    }
    
    // Xử lý text formatting
    static processTextFormatting(html) {
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
        
        // Strikethrough
        html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');
        
        // Highlight
        html = html.replace(/==(.*?)==/gim, '<mark>$1</mark>');
        
        return html;
    }
    
    // Xử lý special boxes
    static processSpecialBoxes(html) {
        html = html.replace(/:::info\s*([^:]+):::/gim, '<div class="info-box"><i class="fas fa-info-circle"></i><div class="box-content">$1</div></div>');
        html = html.replace(/:::tip\s*([^:]+):::/gim, '<div class="tip-box"><i class="fas fa-lightbulb"></i><div class="box-content">$1</div></div>');
        html = html.replace(/:::warning\s*([^:]+):::/gim, '<div class="warning-box"><i class="fas fa-exclamation-triangle"></i><div class="box-content">$1</div></div>');
        html = html.replace(/:::success\s*([^:]+):::/gim, '<div class="success-box"><i class="fas fa-check-circle"></i><div class="box-content">$1</div></div>');
        return html;
    }
    
    // Xử lý paragraphs
    static processParagraphs(html) {
        const lines = html.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Bỏ qua dòng trống
            if (line === '') continue;
            
            // Nếu không phải HTML tag, bọc trong <p>
            if (!line.startsWith('<') && !line.endsWith('>')) {
                result.push(`<p>${line}</p>`);
            } else {
                result.push(line);
            }
        }
        
        return result.join('\n');
    }
    
    // Escape HTML entities
    static escapeHtml(text) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return String(text).replace(/[&<>"'`=/]/g, function(s) {
            return entityMap[s];
        });
    }
}
// ========== ARTICLE MANAGER ==========
class ArticleManager {
    constructor() {
        this.articles = [];
        this.currentArticle = null;
        this.lastCheck = null;
    }
    
    async loadArticles() {
        try {
            const cached = this.loadFromCache();
            if (cached && !this.isCacheExpired()) {
                console.log('📚 Using cached articles');
                this.articles = cached;
                return cached;
            }
            
            const response = await fetch(`${ARTICLE_CONFIG.metadataPath}?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load articles');
            
            const data = await response.json();
            this.articles = data.articles;
            this.lastCheck = new Date(data.last_updated);
            
            this.saveToCache();
            
            return this.articles;
        } catch (error) {
            console.error('❌ Failed to load articles:', error);
            return this.articles;
        }
    }
    
    loadFromCache() {
        try {
            const cached = localStorage.getItem(ARTICLE_CONFIG.cacheKey);
            const cacheTime = localStorage.getItem(ARTICLE_CONFIG.cacheTimeKey);
            
            if (cached && cacheTime) {
                return JSON.parse(cached);
            }
        } catch (e) {}
        return null;
    }
    
    saveToCache() {
        try {
            localStorage.setItem(ARTICLE_CONFIG.cacheKey, JSON.stringify(this.articles));
            localStorage.setItem(ARTICLE_CONFIG.cacheTimeKey, Date.now().toString());
        } catch (e) {}
    }
    
    isCacheExpired() {
        const cacheTime = localStorage.getItem(ARTICLE_CONFIG.cacheTimeKey);
        if (!cacheTime) return true;
        
        const age = Date.now() - parseInt(cacheTime);
        return age > ARTICLE_CONFIG.cacheDuration;
    }
    
    async loadArticle(slug) {
        try {
            const response = await fetch(`${ARTICLE_CONFIG.articlesPath}${slug}.md?t=${Date.now()}`);
            if (!response.ok) throw new Error('Article not found');
            
            const markdown = await response.text();
            const articleMeta = this.articles.find(a => a.slug === slug);
            
            return {
                meta: articleMeta,
                content: MarkdownConverter.convert(markdown),
                raw: markdown
            };
        } catch (error) {
            console.error('❌ Failed to load article:', error);
            return null;
        }
    }
    
    renderArticleList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.articles.length === 0) {
            container.innerHTML = '<div class="loading">Loading articles...</div>';
            return;
        }
        
        let html = '';
        this.articles.forEach(article => {
            const isNew = this.isNewArticle(article);
            const date = new Date(article.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            
            html += `
                <a href="/learn/article.html?id=${article.slug}" class="article-card ${article.level.toLowerCase()}">
                    ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    <div class="article-meta">
                        <span class="article-category">${article.category}</span>
                        <span class="article-date"><i class="fas fa-calendar-alt"></i> ${date}</span>
                    </div>
                    <h3>${article.title}</h3>
                    <p>${article.description}</p>
                    <div class="article-footer">
                        <span class="reading-time"><i class="fas fa-clock"></i> ${article.reading_time} min</span>
                        <span class="difficulty ${article.level.toLowerCase()}">${article.level}</span>
                    </div>
                </a>
            `;
        });
        
        container.innerHTML = html;
    }
    
    isNewArticle(article) {
        const articleDate = new Date(article.date);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return articleDate >= threeDaysAgo;
    }
}

// ========== INITIALIZATION ==========
const articleManager = new ArticleManager();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📚 Article System v' + ARTICLE_CONFIG.version);
    
    await articleManager.loadArticles();
    
    setInterval(async () => {
        await articleManager.loadArticles();
    }, 3 * 60 * 1000);
    
    if (document.getElementById('articlesList')) {
        articleManager.renderArticleList('articlesList');
    }
    
    if (document.getElementById('articleContent')) {
        await loadArticlePage();
    }
});

async function loadArticlePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('id');
    
    if (!slug) {
        window.location.href = '/learn/';
        return;
    }
    
    const article = await articleManager.loadArticle(slug);
    if (!article) {
        document.getElementById('articleContent').innerHTML = `
            <div class="error-404">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Article Not Found</h2>
                <p>The article you're looking for doesn't exist.</p>
                <a href="/learn/" class="back-btn">Back to Knowledge Base</a>
            </div>
        `;
        return;
    }
    
    document.title = `${article.meta.title} - Bitcoin PeakDip Learn`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = article.meta.description;
    
    document.getElementById('articleTitle').textContent = article.meta.title;
    document.getElementById('articleMeta').innerHTML = `
        <span class="article-author"><i class="fas fa-user"></i> ${article.meta.author}</span>
        <span class="article-date"><i class="fas fa-calendar-alt"></i> ${new Date(article.meta.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        <span class="reading-time"><i class="fas fa-clock"></i> ${article.meta.reading_time} min read</span>
        <span class="difficulty ${article.meta.level.toLowerCase()}">${article.meta.level}</span>
    `;
    
    document.getElementById('articleContent').innerHTML = article.content;
    
    addReadingProgress();
    addTableOfContents();
}

function addReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    progressBar.innerHTML = '<div class="progress-bar" id="readingProgress"></div>';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        const progress = document.getElementById('readingProgress');
        if (progress) {
            progress.style.width = scrolled + '%';
        }
    });
}

function addTableOfContents() {
    if (!document.querySelector('.learn-article')) return;
    
    const headings = document.querySelectorAll('.article-content h2, .article-content h3');
    if (headings.length < 3) return;
    
    const toc = document.createElement('div');
    toc.className = 'table-of-contents';
    toc.innerHTML = '<h3><i class="fas fa-list"></i> Contents</h3><ul></ul>';
    
    const tocList = toc.querySelector('ul');
    
    headings.forEach((heading, index) => {
        if (!heading.id) {
            heading.id = `section-${index}`;
        }
        
        const li = document.createElement('li');
        li.className = heading.tagName === 'H2' ? 'toc-h2' : 'toc-h3';
        li.innerHTML = `<a href="#${heading.id}">${heading.textContent}</a>`;
        tocList.appendChild(li);
    });
    
    const article = document.querySelector('.learn-article');
    article.insertBefore(toc, article.querySelector('.article-content'));
}

// Styles (giữ nguyên)
// Add styles
const articleStyle = document.createElement('style');
articleStyle.textContent = `
    .toast-notification {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, var(--wave-trough), var(--wave-mid));
        color: white;
        padding: 12px 25px;
        border-radius: 30px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        border: 2px solid white;
        animation: slideUp 0.3s ease;
        max-width: 90%;
    }
    
    .toast-notification.fade-out {
        animation: fadeOut 0.3s ease forwards;
    }
    
    .toast-success {
        background: linear-gradient(135deg, #4CAF50, #45a049);
    }
    
    .toast-warning {
        background: linear-gradient(135deg, #ff9800, #f57c00);
    }
    
    .toast-error {
        background: linear-gradient(135deg, #f44336, #d32f2f);
    }
    
    .article-card {
        position: relative;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 15px;
        padding: 25px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
        text-decoration: none;
        display: block;
        overflow: hidden;
    }
    
    .article-card:hover {
        transform: translateY(-5px);
        border-color: var(--wave-trough);
        box-shadow: 0 10px 25px rgba(0, 212, 255, 0.2);
    }
    
    .new-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: linear-gradient(135deg, var(--wave-peak), #ff6b00);
        color: white;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 0.8em;
        font-weight: bold;
        animation: pulse 2s infinite;
    }
    
    .article-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        color: var(--text-glow);
        font-size: 0.9em;
    }
    
    .article-category {
        background: rgba(0, 212, 255, 0.15);
        padding: 4px 12px;
        border-radius: 20px;
        color: var(--wave-trough);
        text-transform: uppercase;
        font-size: 0.8em;
        font-weight: bold;
    }
    
    .article-card h3 {
        color: white;
        margin-bottom: 10px;
        font-size: 1.3em;
    }
    
    .article-card p {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.6;
        margin-bottom: 15px;
    }
    
    .article-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .reading-time {
        color: var(--text-glow);
        font-size: 0.9em;
    }
    
    .reading-time i {
        color: var(--wave-mid);
        margin-right: 5px;
    }
    
    .difficulty {
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 0.8em;
        font-weight: bold;
    }
    
    .difficulty.beginner {
        background: rgba(76, 175, 80, 0.15);
        color: #4CAF50;
        border: 1px solid rgba(76, 175, 80, 0.3);
    }
    
    .difficulty.intermediate {
        background: rgba(255, 193, 7, 0.15);
        color: #FFC107;
        border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .difficulty.advanced {
        background: rgba(244, 67, 54, 0.15);
        color: #F44336;
        border: 1px solid rgba(244, 67, 54, 0.3);
    }
    
    /* ===== CSS MỚI CHO BẢNG ===== */
    .markdown-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        overflow: hidden;
    }

    .markdown-table th {
        background: linear-gradient(135deg, var(--wave-trough), var(--wave-mid));
        color: white;
        font-weight: bold;
        padding: 12px 15px;
        text-align: left;
        font-size: 0.95em;
    }

    .markdown-table td {
        padding: 10px 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-glow);
        font-size: 0.9em;
        line-height: 1.5;
    }

    .markdown-table tr:hover {
        background: rgba(0, 212, 255, 0.05);
    }

    .markdown-table th:first-child {
        border-top-left-radius: 10px;
    }

    .markdown-table th:last-child {
        border-top-right-radius: 10px;
    }

    .table-responsive {
        overflow-x: auto;
        margin: 20px 0;
        border-radius: 10px;
        -webkit-overflow-scrolling: touch;
    }

    /* Responsive cho mobile */
    @media (max-width: 768px) {
        .markdown-table {
            font-size: 0.85em;
        }
        
        .markdown-table th,
        .markdown-table td {
            padding: 8px 10px;
            white-space: nowrap;
        }
        
        .table-responsive {
            margin: 15px -20px;
            width: calc(100% + 40px);
            border-radius: 0;
        }
        
        .table-responsive .markdown-table {
            border-radius: 0;
        }
    }
    
    /* ===== BOX STYLES MỚI ===== */
    .info-box, .tip-box, .warning-box, .success-box {
        display: flex;
        gap: 15px;
        padding: 20px;
        margin: 20px 0;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 4px solid;
        align-items: flex-start;
    }

    .info-box {
        border-left-color: var(--wave-trough);
        background: rgba(0, 212, 255, 0.1);
    }

    .tip-box {
        border-left-color: var(--wave-mid);
        background: rgba(247, 147, 26, 0.1);
    }

    .warning-box {
        border-left-color: var(--wave-peak);
        background: rgba(255, 46, 99, 0.1);
    }

    .success-box {
        border-left-color: #4CAF50;
        background: rgba(76, 175, 80, 0.1);
    }

    .box-content {
        flex: 1;
        color: var(--text-glow);
        line-height: 1.6;
    }

    .info-box i, .tip-box i, .warning-box i, .success-box i {
        font-size: 1.5em;
        margin-top: 2px;
    }

    .info-box i { color: var(--wave-trough); }
    .tip-box i { color: var(--wave-mid); }
    .warning-box i { color: var(--wave-peak); }
    .success-box i { color: #4CAF50; }
    
    .info-box p, .tip-box p, .warning-box p, .success-box p {
        margin: 0;
    }
    
    /* ===== CÁC STYLE CŨ GIỮ NGUYÊN ===== */
    .info-box, .tip-box, .warning-box {
        background: rgba(0, 212, 255, 0.1);
        border-left: 4px solid var(--wave-trough);
        padding: 20px;
        margin: 20px 0;
        border-radius: 0 10px 10px 0;
        display: flex;
        gap: 15px;
        align-items: flex-start;
    }
    
    .tip-box {
        background: rgba(247, 147, 26, 0.1);
        border-left-color: var(--wave-mid);
    }
    
    .warning-box {
        background: rgba(255, 46, 99, 0.1);
        border-left-color: var(--wave-peak);
    }
    
    .info-box i, .tip-box i, .warning-box i {
        font-size: 1.5em;
        color: inherit;
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 10px currentColor;
        }
        50% {
            transform: scale(1.05);
            box-shadow: 0 0 20px currentColor;
        }
    }
`;

document.head.appendChild(articleStyle);

// ========== READING LIST MANAGER ==========
class ReadingListManager {
    constructor() {
        this.badgeElement = null;
        this.mobileBadgeElement = null;
        this.init();
    }
    
    init() {
        this.updateBadgeElements();
        this.updateAllBadges();
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'reading_list') {
                this.updateAllBadges();
            }
        });
        
        const observer = new MutationObserver(() => {
            this.updateBadgeElements();
            this.updateAllBadges();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    updateBadgeElements() {
        this.badgeElement = document.getElementById('readingListBadge');
        this.mobileBadgeElement = document.querySelector('.reading-list-badge-mobile');
        if (!this.mobileBadgeElement) {
            this.createMobileBadge();
        }
    }
    
    createMobileBadge() {
        const link = document.getElementById('readingListLink');
        if (link) {
            const mobileBadge = document.createElement('span');
            mobileBadge.className = 'reading-list-badge-mobile';
            mobileBadge.id = 'readingListBadgeMobile';
            link.appendChild(mobileBadge);
            this.mobileBadgeElement = mobileBadge;
        }
    }
    
    getReadingListCount() {
        try {
            const list = JSON.parse(localStorage.getItem('reading_list') || '[]');
            return list.length;
        } catch (e) {
            return 0;
        }
    }
    
    updateAllBadges() {
        const count = this.getReadingListCount();
        
        if (this.badgeElement) {
            this.badgeElement.textContent = count;
            this.badgeElement.style.display = count > 0 ? 'inline' : 'none';
        }
        
        if (this.mobileBadgeElement) {
            this.mobileBadgeElement.textContent = count > 9 ? '9+' : count;
            this.mobileBadgeElement.style.display = count > 0 ? 'flex' : 'none';
        }
        
        this.updatePWABadge(count);
    }
    
    updatePWABadge(count) {
        if (navigator.setAppBadge) {
            navigator.setAppBadge(count).catch(e => console.log('Badge error:', e));
        } else if (navigator.setExperimentalAppBadge) {
            navigator.setExperimentalAppBadge(count).catch(e => console.log('Badge error:', e));
        }
    }
    
    addToReadingList(article) {
        try {
            const readingList = JSON.parse(localStorage.getItem('reading_list') || '[]');
            const exists = readingList.some(item => item.id === article.id);
            
            if (!exists) {
                readingList.push({
                    id: article.id,
                    title: article.title,
                    url: article.url || `/learn/article.html?id=${article.slug || article.id}`,
                    savedAt: new Date().toISOString(),
                    publishedDate: article.date || new Date().toISOString().split('T')[0]
                });
                
                localStorage.setItem('reading_list', JSON.stringify(readingList));
                this.updateAllBadges();
                
                // 👉 Gọi toast từ notifications.js nếu có
                if (window.articleNotifications && typeof window.articleNotifications.showToast === 'function') {
                    window.articleNotifications.showToast('✅ Added to reading list', 'success');
                }
                
                return true;
            } else {
                if (window.articleNotifications && typeof window.articleNotifications.showToast === 'function') {
                    window.articleNotifications.showToast('📚 Already in reading list', 'info');
                }
                return false;
            }
        } catch (e) {
            console.error('Error adding to reading list:', e);
            return false;
        }
    }
}

const readingListManager = new ReadingListManager();

// Export global functions
window.addToReadingListFromNotification = function(articleData) {
    readingListManager.addToReadingList(articleData);
};
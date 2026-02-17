// article.js - Xử lý markdown và hiển thị bài viết
// Version: 1.5.0

const ARTICLE_CONFIG = {
    version: '1.5.0',
    articlesPath: '/learn/articles/',
    metadataPath: '/learn/articles.json',
    cacheKey: 'peakdip_articles',
    cacheTimeKey: 'peakdip_articles_time',
    cacheDuration: 3600000, // 1 giờ
    notificationKey: 'peakdip_notified_articles'
};

// ========== MARKDOWN CONVERTER ==========
class MarkdownConverter {
    static convert(markdown) {
        // Xử lý headings
        let html = markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        
        // Xử lý bold và italic
        html = html
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>');
        
        // Xử lý code blocks
        html = html.replace(/```([^`]+)```/gim, function(match, p1) {
            return '<pre><code>' + p1.trim() + '</code></pre>';
        });
        
        // Xử lý inline code
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
        
        // Xử lý lists
        html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^[0-9]+\. (.*$)/gim, '<ol><li>$1</li></ol>');
        
        // Xử lý links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
        
        // Xử lý images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" loading="lazy">');
        
        // Xử lý blockquotes
        html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Xử lý horizontal rules
        html = html.replace(/^---$/gim, '<hr>');
        
        // Xử lý paragraphs
        html = html.replace(/^(?!<[h|p|ul|ol|li|pre|blockquote|hr|img])(.*$)/gim, '<p>$1</p>');
        
        // Xử lý special boxes
        html = html.replace(/:::info\s*([^:]+):::/gim, '<div class="info-box"><i class="fas fa-info-circle"></i><p>$1</p></div>');
        html = html.replace(/:::tip\s*([^:]+):::/gim, '<div class="tip-box"><i class="fas fa-lightbulb"></i><p>$1</p></div>');
        html = html.replace(/:::warning\s*([^:]+):::/gim, '<div class="warning-box"><i class="fas fa-exclamation-triangle"></i><p>$1</p></div>');
        
        return html;
    }
}

// ========== ARTICLE MANAGER ==========
class ArticleManager {
    constructor() {
        this.articles = [];
        this.currentArticle = null;
        this.lastCheck = null;
        this.notifiedArticles = this.getNotifiedArticles();
    }
    
    // Lấy danh sách bài viết đã thông báo
    getNotifiedArticles() {
        try {
            const stored = localStorage.getItem(ARTICLE_CONFIG.notificationKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }
    
    // Lưu bài viết đã thông báo
    saveNotifiedArticles() {
        localStorage.setItem(ARTICLE_CONFIG.notificationKey, 
            JSON.stringify(this.notifiedArticles));
    }
    
    // Tải metadata articles
    async loadArticles() {
        try {
            // Kiểm tra cache
            const cached = this.loadFromCache();
            if (cached && !this.isCacheExpired()) {
                console.log('📚 Using cached articles');
                this.articles = cached;
                return cached;
            }
            
            // Fetch từ server
            const response = await fetch(`${ARTICLE_CONFIG.metadataPath}?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load articles');
            
            const data = await response.json();
            this.articles = data.articles;
            this.lastCheck = new Date(data.last_updated);
            
            // Lưu cache
            this.saveToCache();
            
            // Kiểm tra bài viết mới
            this.checkNewArticles();
            
            return this.articles;
        } catch (error) {
            console.error('❌ Failed to load articles:', error);
            return this.articles;
        }
    }
    
    // Kiểm tra cache
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
    
    // Lưu cache
    saveToCache() {
        try {
            localStorage.setItem(ARTICLE_CONFIG.cacheKey, 
                JSON.stringify(this.articles));
            localStorage.setItem(ARTICLE_CONFIG.cacheTimeKey, 
                Date.now().toString());
        } catch (e) {}
    }
    
    // Kiểm tra cache hết hạn
    isCacheExpired() {
        const cacheTime = localStorage.getItem(ARTICLE_CONFIG.cacheTimeKey);
        if (!cacheTime) return true;
        
        const age = Date.now() - parseInt(cacheTime);
        return age > ARTICLE_CONFIG.cacheDuration;
    }
    
    // Kiểm tra bài viết mới
    checkNewArticles() {
        if (!this.articles || this.articles.length === 0) return;
        
        const newArticles = this.articles.filter(article => {
            // Chưa được thông báo
            if (this.notifiedArticles.includes(article.id)) return false;
            
            // Bài viết trong 7 ngày qua
            const articleDate = new Date(article.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            return articleDate >= weekAgo;
        });
        
        if (newArticles.length > 0) {
            this.notifyNewArticles(newArticles);
        }
    }
    
    // Thông báo bài viết mới
    notifyNewArticles(newArticles) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        
        newArticles.forEach(article => {
            // Đánh dấu đã thông báo
            this.notifiedArticles.push(article.id);
            
            // Tạo notification
            const notification = new Notification('📚 New Article from Bitcoin PeakDip', {
                body: `${article.title}\n${article.reading_time} min read • ${article.level}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: `article-${article.id}`,
                renotify: true,
                data: {
                    url: `/learn/article.html?id=${article.slug}`,
                    articleId: article.id
                },
                actions: [
                    { action: 'read', title: 'Read Now' },
                    { action: 'later', title: 'Read Later' }
                ]
            });
            
            notification.onclick = function(event) {
                event.preventDefault();
                window.focus();
                
                if (event.action === 'read') {
                    window.location.href = event.target.data.url;
                } else if (event.action === 'later') {
                    // Lưu vào danh sách đọc sau
                    const readingList = JSON.parse(localStorage.getItem('reading_list') || '[]');
                    readingList.push({
                        id: article.id,
                        title: article.title,
                        url: event.target.data.url,
                        added: new Date().toISOString()
                    });
                    localStorage.setItem('reading_list', JSON.stringify(readingList));
                    
                    // Hiển thị thông báo nhỏ
                    showToast('Added to reading list', 'info');
                } else {
                    window.location.href = event.target.data.url;
                }
            };
        });
        
        this.saveNotifiedArticles();
    }
    
    // Tải nội dung bài viết
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
    
    // Render article list
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
    
    // Kiểm tra bài viết mới (dưới 3 ngày)
    isNewArticle(article) {
        const articleDate = new Date(article.date);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return articleDate >= threeDaysAgo;
    }
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'info' ? 'fa-info-circle' : 
                       type === 'success' ? 'fa-check-circle' : 
                       type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========== INITIALIZATION ==========
const articleManager = new ArticleManager();

// Request notification permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }
    
    if (Notification.permission === 'granted') {
        return;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📚 Article System v' + ARTICLE_CONFIG.version);
    
    // Request notification permission
    requestNotificationPermission();
    
    // Load articles
    await articleManager.loadArticles();
    
    // Check periodically for new articles (every 30 minutes)
    setInterval(async () => {
        await articleManager.loadArticles();
    }, 30 * 60 * 1000);
    
    // Render article list if on learn page
    if (document.getElementById('articlesList')) {
        articleManager.renderArticleList('articlesList');
    }
    
    // Load single article if on article page
    if (document.getElementById('articleContent')) {
        await loadArticlePage();
    }
});

// Load article page
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
    
    // Update meta tags
    document.title = `${article.meta.title} - Bitcoin PeakDip Learn`;
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = article.meta.description;
    
    // Render article
    document.getElementById('articleTitle').textContent = article.meta.title;
    document.getElementById('articleMeta').innerHTML = `
        <span class="article-author"><i class="fas fa-user"></i> ${article.meta.author}</span>
        <span class="article-date"><i class="fas fa-calendar-alt"></i> ${new Date(article.meta.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        <span class="reading-time"><i class="fas fa-clock"></i> ${article.meta.reading_time} min read</span>
        <span class="difficulty ${article.meta.level.toLowerCase()}">${article.meta.level}</span>
    `;
    
    document.getElementById('articleContent').innerHTML = article.content;
    
    // Add reading progress
    addReadingProgress();
    
    // Add table of contents
    addTableOfContents();
}

// Add styles
const style = document.createElement('style');
style.textContent = `
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

document.head.appendChild(style);
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

// ========== PUSH NOTIFICATION SIMPLE (POLLING) ==========
class ArticlePushSimple {
    constructor() {
        this.checkInterval = 5 * 60 * 1000; // 30 phút kiểm tra 1 lần
        this.lastCheckKey = 'article_last_check';
        this.savedArticlesKey = 'article_saved_ids';
        this.init();
    }
    
    init() {
        // Kiểm tra browser có hỗ trợ notification không
        if (!('Notification' in window)) {
            console.log('❌ Browser không hỗ trợ notifications');
            return;
        }
        
        console.log('📢 Article Push System (Simple) initialized');
        
        // Nếu đã cấp quyền thì bắt đầu polling
        if (Notification.permission === 'granted') {
            this.startPolling();
            this.addNotificationButton('enabled');
        } 
        // Nếu chưa hỏi thì thêm nút
        else if (Notification.permission !== 'denied') {
            this.addNotificationButton();
        }
    }
    
    // Thêm nút bật/tắt notification
    addNotificationButton(status = 'prompt') {
        // Chờ DOM load xong
        if (!document.getElementById('statusIndicator')) {
            setTimeout(() => this.addNotificationButton(status), 500);
            return;
        }
        
        // Xóa nút cũ nếu có
        const oldBtn = document.querySelector('.push-simple-btn');
        if (oldBtn) oldBtn.remove();
        
        // Tạo nút mới
        const btn = document.createElement('button');
        btn.className = `push-simple-btn ${status}`;
        
        if (status === 'enabled') {
            btn.innerHTML = '<i class="fas fa-bell"></i><span>Notifications ON</span>';
            btn.onclick = () => this.disableNotifications();
        } else {
            btn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Enable Notifications</span>';
            btn.onclick = () => this.requestPermission();
        }
        
        // Thêm vào status indicator
        const statusIndicator = document.getElementById('statusIndicator');
        statusIndicator.appendChild(btn);
    }
    
    // Xin quyền thông báo
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                this.startPolling();
                this.addNotificationButton('enabled');
                this.showTestNotification();
                
                // Lưu trạng thái
                localStorage.setItem('notifications_enabled', 'true');
            } else {
                console.log('❌ Notification permission denied');
                showToast('Please enable notifications to get article updates', 'warning');
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    }
    
    // Tắt notifications
    disableNotifications() {
        localStorage.setItem('notifications_enabled', 'false');
        this.addNotificationButton('prompt');
        showToast('Notifications disabled', 'info');
    }
    
    // Bắt đầu kiểm tra định kỳ
    startPolling() {
        console.log('🔄 Starting article polling (every 30 minutes)');
        
        // Kiểm tra ngay lập tức
        this.checkForNewArticles();
        
        // Lặp lại mỗi 30 phút
        setInterval(() => {
            console.log('🔄 Polling: Checking for new articles...');
            this.checkForNewArticles();
        }, this.checkInterval);
    }
    
    // Kiểm tra bài viết mới
    async checkForNewArticles() {
        try {
            // Fetch articles.json mới nhất (thêm timestamp để tránh cache)
            const response = await fetch(`/learn/articles.json?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch articles');
            
            const data = await response.json();
            
            // Lấy danh sách bài viết đã lưu
            const savedArticles = this.getSavedArticles();
            
            // Lấy thời gian kiểm tra lần cuối
            const lastCheck = this.getLastCheckTime();
            
            console.log(`📊 Last check: ${new Date(lastCheck).toLocaleString()}`);
            console.log(`📚 Total articles: ${data.articles.length}`);
            
            // Tìm bài viết mới (trong 7 ngày qua)
            const newArticles = data.articles.filter(article => {
                // Nếu đã lưu rồi thì bỏ qua
                if (savedArticles.includes(article.id)) return false;
                
                const articleDate = new Date(article.date).getTime();
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                
                // Bài viết phải mới hơn 7 ngày
                return articleDate > sevenDaysAgo;
            });
            
            if (newArticles.length > 0) {
                console.log(`🎉 Found ${newArticles.length} new articles!`);
                this.showNotifications(newArticles);
                this.saveArticles(data.articles.map(a => a.id));
            } else {
                console.log('📭 No new articles found');
            }
            
            // Cập nhật thời gian kiểm tra
            this.updateLastCheckTime();
            
        } catch (error) {
            console.error('❌ Error checking articles:', error);
        }
    }
    
    // Hiển thị notifications
    showNotifications(articles) {
        if (Notification.permission !== 'granted') return;
        
        if (articles.length === 1) {
            // 1 bài viết mới
            const article = articles[0];
            const notification = new Notification('📚 Bitcoin PeakDip: New Article', {
                body: `${article.title}\n⏱️ ${article.reading_time} min read • ${article.level}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: `article-${article.id}`,
                renotify: true,
                requireInteraction: true,
                data: {
                    url: `/learn/article.html?id=${article.slug}`,
                    articleId: article.id
                },
                actions: [
                    { action: 'read', title: '📖 Read Now' },
                    { action: 'later', title: '⏰ Read Later' }
                ]
            });
            
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                
                if (event.action === 'read') {
                    window.location.href = event.target.data.url;
                } else if (event.action === 'later') {
                    this.saveForLater(article);
                } else {
                    window.location.href = event.target.data.url;
                }
            };
            
        } else {
            // Nhiều bài viết mới
            const notification = new Notification(`📚 Bitcoin PeakDip: ${articles.length} New Articles`, {
                body: articles.map(a => `• ${a.title}`).join('\n').substring(0, 150) + '...',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'multiple-articles',
                data: {
                    url: '/learn/'
                },
                actions: [
                    { action: 'view', title: '👀 View All' }
                ]
            });
            
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                window.location.href = '/learn/';
            };
        }
    }
    
    // Lưu để đọc sau
    // Trong class ArticlePushSimple
    saveForLater(article) {
        // Sử dụng ReadingListManager đã được tạo
        if (window.readingList) {
            // Đảm bảo article có đủ thông tin
            const articleData = {
                id: article.id,
                title: article.title,
                slug: article.slug,
                url: article.url || `/learn/article.html?id=${article.slug}`,
                date: article.date || new Date().toISOString().split('T')[0]
            };
            
            // Thêm vào reading list
            window.readingList.add(articleData);
            
        } else {
            // Fallback nếu readingList chưa được load
            console.warn('readingList not available, using fallback');
            
            const readingList = JSON.parse(localStorage.getItem('reading_list') || '[]');
            const exists = readingList.some(item => item.id === article.id);
            
            if (!exists) {
                readingList.push({
                    id: article.id,
                    title: article.title,
                    url: `/learn/article.html?id=${article.slug}`,
                    savedAt: new Date().toISOString(),
                    publishedDate: article.date || new Date().toISOString().split('T')[0]
                });
                
                localStorage.setItem('reading_list', JSON.stringify(readingList));
                
                // Cập nhật badge thủ công
                if (typeof updateReadingListBadge === 'function') {
                    updateReadingListBadge();
                }
                
                // Hiển thị toast
                if (typeof showToast === 'function') {
                    showToast('✅ Added to reading list (fallback)', 'success');
                }
            }
        }
    }
    
    // Lấy danh sách bài viết đã lưu
    getSavedArticles() {
        try {
            return JSON.parse(localStorage.getItem(this.savedArticlesKey) || '[]');
        } catch {
            return [];
        }
    }
    
    // Lưu danh sách bài viết
    saveArticles(articleIds) {
        localStorage.setItem(this.savedArticlesKey, JSON.stringify(articleIds));
    }
    
    // Lấy thời gian kiểm tra lần cuối
    getLastCheckTime() {
        return parseInt(localStorage.getItem(this.lastCheckKey) || '0');
    }
    
    // Cập nhật thời gian kiểm tra
    updateLastCheckTime() {
        localStorage.setItem(this.lastCheckKey, Date.now().toString());
    }
    
    // Gửi notification test
    showTestNotification() {
        new Notification('✅ Notifications Enabled', {
            body: 'You will be notified when new articles are published',
            icon: '/icons/icon-192x192.png',
            silent: false,
            tag: 'test-notification'
        });
    }
}

// ========== INITIALIZATION ==========
const articleManager = new ArticleManager();
// THÊM DÒNG NÀY
const articlePush = new ArticlePushSimple(); // Khởi tạo push notifications
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
    }, 5 * 60 * 1000);
    
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

// Thêm vào cuối file article.js, trước dòng cuối cùng

// ========== READING LIST BADGE MANAGEMENT ==========
class ReadingListManager {
    constructor() {
        this.badgeElement = null;
        this.mobileBadgeElement = null;
        this.init();
    }
    
    init() {
        // Tìm các phần tử badge
        this.updateBadgeElements();
        
        // Cập nhật badge khi load trang
        this.updateAllBadges();
        
        // Lắng nghe sự thay đổi của localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'reading_list') {
                this.updateAllBadges();
            }
        });
        
        // Tạo mutation observer để theo dõi khi DOM thay đổi
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
        // Badge trên menu desktop
        this.badgeElement = document.getElementById('readingListBadge');
        
        // Badge trên mobile app (icon)
        this.mobileBadgeElement = document.querySelector('.reading-list-badge-mobile');
        if (!this.mobileBadgeElement) {
            this.createMobileBadge();
        }
    }
    
    createMobileBadge() {
        // Tạo badge cho mobile app (PWA)
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
        
        // Update desktop badge
        if (this.badgeElement) {
            this.badgeElement.textContent = count;
            this.badgeElement.style.display = count > 0 ? 'inline' : 'none';
        }
        
        // Update mobile badge
        if (this.mobileBadgeElement) {
            this.mobileBadgeElement.textContent = count > 9 ? '9+' : count;
            this.mobileBadgeElement.style.display = count > 0 ? 'flex' : 'none';
        }
        
        // Update PWA app badge nếu hỗ trợ
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
            
            // Kiểm tra trùng lặp
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
                
                // Hiển thị toast thông báo
                this.showToast('✅ Added to reading list', 'success');
                
                return true;
            } else {
                this.showToast('📚 Already in reading list', 'info');
                return false;
            }
        } catch (e) {
            console.error('Error adding to reading list:', e);
            return false;
        }
    }
    
    showToast(message, type = 'info') {
        // Kiểm tra hàm showToast đã tồn tại
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Tạo toast tạm thời
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Style cho toast
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, ${type === 'success' ? '#4CAF50' : '#00d4ff'}, ${type === 'success' ? '#45a049' : '#0088cc'});
            color: white;
            padding: 12px 25px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            border: 2px solid white;
            animation: slideUp 0.3s ease;
            max-width: 90%;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Khởi tạo ReadingListManager
const readingListManager = new ReadingListManager();

// Ghi đè hàm saveForLater trong ArticlePushSimple
ArticlePushSimple.prototype.saveForLater = function(article) {
    readingListManager.addToReadingList({
        id: article.id,
        title: article.title,
        slug: article.slug,
        date: article.date
    });
};

// Thêm hàm global để sử dụng từ service worker
window.addToReadingListFromNotification = function(articleData) {
    readingListManager.addToReadingList(articleData);
};
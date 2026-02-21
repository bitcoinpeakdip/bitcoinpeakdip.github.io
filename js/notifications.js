// notifications.js - Hệ thống thông báo bài viết mới tập trung
// Version: 2.0.0

const NOTIFICATION_CONFIG = {
    version: '2.0.0',
    checkInterval: 3 * 60 * 1000, // 30 phút
    articleMetadataPath: '/learn/articles.json',
    notifiedKey: 'peakdip_notified_articles_v2',
    enabledKey: 'peakdip_notifications_enabled',
    cacheKey: 'peakdip_articles_cache',
    cacheTimeKey: 'peakdip_articles_cache_time',
    cacheDuration: 3600000, // 1 giờ
    newArticleDays: 7 // Bài viết trong 7 ngày qua được coi là mới
};

class ArticleNotificationSystem {
    constructor() {
        this.articles = [];
        this.notifiedIds = this.getNotifiedIds();
        this.checkInterval = null;
        this.isEnabled = this.getNotificationStatus();
        this.lastCheckTime = null;
        
        this.init();
    }

    // ===== KHỞI TẠO =====
    init() {
        console.log('🔔 Article Notification System v' + NOTIFICATION_CONFIG.version);
        
        if (!('Notification' in window)) {
            console.log('❌ Trình duyệt không hỗ trợ notifications');
            return;
        }

        // Kiểm tra trạng thái đã được bật chưa
        if (this.isEnabled && Notification.permission === 'granted') {
            this.startPolling();
            this.addNotificationButton('enabled');
        } else {
            this.addNotificationButton();
        }

        // Load articles ngay lập tức
        this.loadArticles();
    }

    // ===== QUẢN LÝ TRẠNG THÁI =====
    getNotificationStatus() {
        try {
            return localStorage.getItem(NOTIFICATION_CONFIG.enabledKey) === 'true';
        } catch (e) {
            return false;
        }
    }

    setNotificationStatus(enabled) {
        try {
            localStorage.setItem(NOTIFICATION_CONFIG.enabledKey, enabled ? 'true' : 'false');
            this.isEnabled = enabled;
        } catch (e) {}
    }

    getNotifiedIds() {
        try {
            return JSON.parse(localStorage.getItem(NOTIFICATION_CONFIG.notifiedKey) || '[]');
        } catch (e) {
            return [];
        }
    }

    saveNotifiedIds(ids) {
        try {
            localStorage.setItem(NOTIFICATION_CONFIG.notifiedKey, JSON.stringify(ids));
            this.notifiedIds = ids;
        } catch (e) {}
    }

    // ===== TẢI DỮ LIỆU BÀI VIẾT =====
    async loadArticles(force = false) {
        try {
            // Kiểm tra cache nếu không force
            if (!force) {
                const cached = this.getCachedArticles();
                if (cached && !this.isCacheExpired()) {
                    this.articles = cached;
                    return cached;
                }
            }

            // Fetch từ server
            const response = await fetch(`${NOTIFICATION_CONFIG.articleMetadataPath}?t=${Date.now()}`);
            if (!response.ok) throw new Error('Không thể tải articles');

            const data = await response.json();
            this.articles = data.articles || [];
            
            // Lưu cache
            this.cacheArticles(this.articles);
            
            // Kiểm tra bài viết mới
            if (this.isEnabled && Notification.permission === 'granted') {
                this.checkNewArticles();
            }
            
            return this.articles;
        } catch (error) {
            console.error('❌ Lỗi tải articles:', error);
            return this.articles;
        }
    }

    getCachedArticles() {
        try {
            const cached = localStorage.getItem(NOTIFICATION_CONFIG.cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            return null;
        }
    }

    cacheArticles(articles) {
        try {
            localStorage.setItem(NOTIFICATION_CONFIG.cacheKey, JSON.stringify(articles));
            localStorage.setItem(NOTIFICATION_CONFIG.cacheTimeKey, Date.now().toString());
        } catch (e) {}
    }

    isCacheExpired() {
        try {
            const cacheTime = localStorage.getItem(NOTIFICATION_CONFIG.cacheTimeKey);
            if (!cacheTime) return true;
            
            const age = Date.now() - parseInt(cacheTime);
            return age > NOTIFICATION_CONFIG.cacheDuration;
        } catch (e) {
            return true;
        }
    }

    // ===== KIỂM TRA BÀI VIẾT MỚI =====
    checkNewArticles() {
        if (!this.articles || this.articles.length === 0) return;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_CONFIG.newArticleDays);

        const newArticles = this.articles.filter(article => {
            // Đã thông báo rồi thì bỏ qua
            if (this.notifiedIds.includes(article.id)) return false;

            // Kiểm tra ngày tháng
            const articleDate = new Date(article.date);
            return articleDate >= cutoffDate;
        });

        if (newArticles.length > 0) {
            this.sendNotifications(newArticles);
            
            // Cập nhật danh sách đã thông báo
            const allIds = this.articles.map(a => a.id);
            this.saveNotifiedIds(allIds);
        }

        this.lastCheckTime = Date.now();
    }

    // ===== GỬI NOTIFICATION =====
    sendNotifications(articles) {
        if (Notification.permission !== 'granted') return;

        if (articles.length === 1) {
            // 1 bài viết
            const article = articles[0];
            
            const notification = new Notification('📚 Bài viết mới từ Bitcoin PeakDip', {
                body: `${article.title}\n⏱️ ${article.reading_time} phút đọc • ${article.level}`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: `article-${article.id}`,
                renotify: true,
                requireInteraction: true,
                silent: false,
                data: {
                    url: `/learn/article.html?id=${article.slug}`,
                    articleId: article.id,
                    title: article.title,
                    slug: article.slug,
                    date: article.date,
                    readingTime: article.reading_time,
                    level: article.level
                },
                actions: [
                    { action: 'read', title: '📖 Đọc ngay' },
                    { action: 'later', title: '⏰ Đọc sau' }
                ]
            });

            notification.onclick = (event) => {
                event.preventDefault();
                this.handleNotificationClick(event);
            };

        } else {
            // Nhiều bài viết
            const titles = articles.map(a => `• ${a.title}`).join('\n').substring(0, 150);
            
            const notification = new Notification(`📚 ${articles.length} bài viết mới từ Bitcoin PeakDip`, {
                body: titles + (titles.length >= 150 ? '...' : ''),
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'multiple-articles',
                requireInteraction: true,
                data: {
                    url: '/learn/',
                    articles: articles.map(a => ({ id: a.id, slug: a.slug, title: a.title }))
                },
                actions: [
                    { action: 'view', title: '👀 Xem tất cả' }
                ]
            });

            notification.onclick = (event) => {
                event.preventDefault();
                this.handleNotificationClick(event);
            };
        }

        console.log(`✅ Đã gửi ${articles.length} thông báo`);
    }

    // ===== XỬ LÝ CLICK NOTIFICATION =====
    handleNotificationClick(event) {
        event.preventDefault();
        window.focus();

        const notification = event.target;
        const action = event.action;
        const data = notification.data;

        console.log('🔔 Notification clicked:', { action, data });

        // Xử lý theo action
        if (action === 'later') {
            // Đọc sau - thêm vào reading list
            this.addToReadingList(data);
            notification.close();
            
        } else if (action === 'read' && data.url) {
            // Đọc ngay
            notification.close();
            window.location.href = data.url;
            
        } else if (action === 'view' && data.url) {
            // Xem tất cả
            notification.close();
            window.location.href = data.url;
            
        } else if (data.url) {
            // Mặc định: click vào notification
            notification.close();
            window.location.href = data.url;
        }
    }

    // ===== THÊM VÀO READING LIST =====
    addToReadingList(articleData) {
        // Sử dụng readingList toàn cục nếu có
        if (window.readingList && typeof window.readingList.add === 'function') {
            window.readingList.add({
                id: articleData.articleId || articleData.id,
                title: articleData.title,
                slug: articleData.slug,
                date: articleData.date,
                url: articleData.url
            });
            return;
        }

        // Fallback nếu chưa có readingList
        try {
            const readingList = JSON.parse(localStorage.getItem('reading_list') || '[]');
            const exists = readingList.some(item => item.id === (articleData.articleId || articleData.id));

            if (!exists) {
                readingList.push({
                    id: articleData.articleId || articleData.id,
                    title: articleData.title,
                    url: articleData.url || `/learn/article.html?id=${articleData.slug}`,
                    savedAt: new Date().toISOString(),
                    publishedDate: articleData.date
                });

                localStorage.setItem('reading_list', JSON.stringify(readingList));
                this.showToast('✅ Đã thêm vào danh sách đọc sau', 'success');
                
                // Cập nhật badge nếu có hàm
                if (typeof window.updateReadingListBadge === 'function') {
                    window.updateReadingListBadge();
                }
            } else {
                this.showToast('📚 Bài viết đã có trong danh sách đọc', 'info');
            }
        } catch (e) {
            console.error('Lỗi thêm vào reading list:', e);
        }
    }

    // ===== NÚT BẬT/TẮT THÔNG BÁO =====
    addNotificationButton(status = 'prompt') {
        // Chờ DOM load xong
        if (!document.getElementById('statusIndicator')) {
            setTimeout(() => this.addNotificationButton(status), 500);
            return;
        }

        // Xóa nút cũ nếu có
        const oldBtn = document.querySelector('.notification-toggle-btn');
        if (oldBtn) oldBtn.remove();

        // Tạo nút mới
        const btn = document.createElement('button');
        btn.className = `notification-toggle-btn ${status}`;
        
        if (status === 'enabled') {
            btn.innerHTML = '<i class="fas fa-bell"></i><span>Thông báo BẬT</span>';
            btn.onclick = () => this.disableNotifications();
        } else {
            btn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Bật thông báo bài viết mới</span>';
            btn.onclick = () => this.requestPermission();
        }

        // Thêm vào status indicator
        const statusIndicator = document.getElementById('statusIndicator');
        statusIndicator.appendChild(btn);
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.setNotificationStatus(true);
                this.addNotificationButton('enabled');
                this.startPolling();
                this.showTestNotification();
                this.showToast('✅ Đã bật thông báo bài viết mới', 'success');
                
                // Kiểm tra bài viết mới ngay lập tức
                this.loadArticles(true).then(() => this.checkNewArticles());
            } else {
                this.showToast('❌ Cần bật thông báo để nhận bài viết mới', 'warning');
            }
        } catch (error) {
            console.error('Lỗi yêu cầu quyền:', error);
        }
    }

    disableNotifications() {
        this.setNotificationStatus(false);
        this.stopPolling();
        this.addNotificationButton('prompt');
        this.showToast('🔕 Đã tắt thông báo bài viết mới', 'info');
    }

    // ===== POLLING =====
    startPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        console.log('🔄 Bắt đầu kiểm tra bài viết mới mỗi 30 phút');
        this.checkInterval = setInterval(() => {
            console.log('🔄 Đang kiểm tra bài viết mới...');
            this.loadArticles(true).then(() => this.checkNewArticles());
        }, NOTIFICATION_CONFIG.checkInterval);
    }

    stopPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏹️ Đã dừng kiểm tra bài viết');
        }
    }

    // ===== NOTIFICATION TEST =====
    showTestNotification() {
        if (Notification.permission !== 'granted') return;

        new Notification('✅ Đã bật thông báo thành công', {
            body: 'Bạn sẽ nhận được thông báo khi có bài viết mới',
            icon: '/icons/icon-192x192.png',
            tag: 'test-notification',
            silent: false
        });
    }

    // ===== TOAST NOTIFICATION =====
    showToast(message, type = 'info', duration = 3000) {
        // Xóa toast cũ nếu có
        const oldToast = document.querySelector('.notification-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Animation hiện
        setTimeout(() => toast.classList.add('show'), 10);

        // Tự động ẩn
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ===== PUBLIC METHODS =====
    async refresh() {
        await this.loadArticles(true);
        if (this.isEnabled && Notification.permission === 'granted') {
            this.checkNewArticles();
        }
        return this.articles;
    }

    getNewArticlesCount() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_CONFIG.newArticleDays);
        
        return this.articles.filter(article => {
            if (this.notifiedIds.includes(article.id)) return false;
            const articleDate = new Date(article.date);
            return articleDate >= cutoffDate;
        }).length;
    }
}

// ===== CSS CHO NOTIFICATION =====
(function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        /* Nút bật/tắt thông báo */
        .notification-toggle-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #00d4ff, #f7931a);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,212,255,0.4);
            border: 2px solid rgba(255,255,255,0.3);
            transition: all 0.3s ease;
            animation: slideInRight 0.5s ease;
        }

        .notification-toggle-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,212,255,0.6);
            border-color: white;
        }

        .notification-toggle-btn.enabled {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }

        .notification-toggle-btn i {
            font-size: 16px;
        }

        @media (max-width: 768px) {
            .notification-toggle-btn {
                bottom: 20px;
                right: 20px;
                padding: 10px 18px;
            }
            .notification-toggle-btn span {
                display: none;
            }
            .notification-toggle-btn i {
                font-size: 20px;
            }
        }

        /* Toast notification */
        .notification-toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100%);
            background: linear-gradient(135deg, #00d4ff, #0088cc);
            color: white;
            padding: 12px 25px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            border: 2px solid white;
            transition: transform 0.3s ease;
            max-width: 90%;
            font-weight: 500;
            pointer-events: none;
        }

        .notification-toast.show {
            transform: translateX(-50%) translateY(0);
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

        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;

    document.head.appendChild(style);
})();

// ===== KHỞI TẠO =====
let notificationSystem = null;

// Khởi tạo khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        notificationSystem = new ArticleNotificationSystem();
        window.articleNotifications = notificationSystem;
    });
} else {
    notificationSystem = new ArticleNotificationSystem();
    window.articleNotifications = notificationSystem;
}

// Export
window.ArticleNotificationSystem = ArticleNotificationSystem;
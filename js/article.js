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
window.NOTIFICATIONS_DISABLED = true;
// ========== MARKDOWN CONVERTER ==========
class MarkdownConverter {
    static convert(markdown) {
        let html = markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        
        html = html
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>');
        
        html = html.replace(/```([^`]+)```/gim, function(match, p1) {
            return '<pre><code>' + p1.trim() + '</code></pre>';
        });
        
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
        
        html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^[0-9]+\. (.*$)/gim, '<ol><li>$1</li></ol>');
        
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" loading="lazy">');
        
        html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
        html = html.replace(/^---$/gim, '<hr>');
        
        html = html.replace(/^(?!<[h|p|ul|ol|li|pre|blockquote|hr|img])(.*$)/gim, '<p>$1</p>');
        
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
const articleStyle = document.createElement('style');
articleStyle.textContent = ` ... `; // Giữ nguyên styles
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
// Main JavaScript - Shared between all pages

document.addEventListener('DOMContentLoaded', function() {
    console.log('Bitcoin PeakDip Early Warning System Initialized');
    
    // Common elements
    const navigation = document.getElementById('navigation');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const pageFooter = document.getElementById('pageFooter');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    // Mobile menu toggle
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const icon = this.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
    
    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu) {
                navMenu.classList.remove('active');
                if (mobileMenuBtn) {
                    mobileMenuBtn.querySelector('i').classList.remove('fa-times');
                    mobileMenuBtn.querySelector('i').classList.add('fa-bars');
                }
            }
            
            // Update active state
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
        });
    });

   // ===== THÊM CODE XỬ LÝ DROPDOWN MOBILE TỪ ĐÂY =====
    // Handle dropdown for mobile
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const dropdown = this.closest('.dropdown');
                
                // Close other dropdowns
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('active');
                        // Reset arrow for other dropdowns
                        const otherArrow = d.querySelector('.dropdown-arrow');
                        if (otherArrow) {
                            otherArrow.style.transform = '';
                        }
                    }
                });
                
                // Toggle current dropdown
                dropdown.classList.toggle('active');
                
                // Update arrow
                const arrow = this.querySelector('.dropdown-arrow');
                if (arrow) {
                    arrow.style.transform = dropdown.classList.contains('active') ? 'rotate(180deg)' : '';
                }
            }
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown').forEach(d => {
                    d.classList.remove('active');
                });
                
                document.querySelectorAll('.dropdown-arrow').forEach(arrow => {
                    arrow.style.transform = '';
                });
            }
        }
    });
        
    // Navigation scroll effect
    window.addEventListener('scroll', function() {
        if (navigation) {
            if (window.scrollY > 50) {
                navigation.classList.add('scrolled');
            } else {
                navigation.classList.remove('scrolled');
            }
        }
        
        // Hide status indicator when near footer
        updateStatusVisibility();
    });
    
    // Function to update status visibility
    function updateStatusVisibility() {
        if (!pageFooter || !statusIndicator) return;
        
        const scrollPosition = window.scrollY + window.innerHeight;
        const footerPosition = pageFooter.offsetTop;
        const distanceToFooter = footerPosition - scrollPosition;
        
        // If we're within 200px of the footer, hide the status indicator
        if (distanceToFooter < 200) {
            statusIndicator.classList.add('hidden');
        } else {
            statusIndicator.classList.remove('hidden');
        }
        
        // On mobile, also hide when scrolling
        if (window.innerWidth <= 768) {
            statusIndicator.style.transition = 'all 0.3s ease';
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#" or external links
            if (href === '#' || href.startsWith('http')) return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Update status text periodically (if statusText exists)
    if (statusText) {
        setInterval(() => {
            const statusMessages = [
                'ANALYSING BITCOIN WAVES',
                'MONITORING BITCOIN PATTERNS',
                'ANALYZING SENSOR DATA',
                'FILTERING MARKET NOISE',
                'DETECTING LOCAL EXTREMES',
                'EARLY WARNING SYSTEM ACTIVE'
            ];
            
            const randomStatus = statusMessages[Math.floor(Math.random() * statusMessages.length)];
            statusText.textContent = randomStatus;
        }, 12000);
    }
    
    // Create energy particles
    createEnergyParticles();
    
    // Initial update of status visibility
    updateStatusVisibility();
});

// Create floating energy particles
function createEnergyParticles() {
    const energyParticles = document.getElementById('energyParticles');
    if (!energyParticles) return;
    
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random size
        const size = 1 + Math.random() * 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random animation
        const duration = 3 + Math.random() * 5;
        const delay = Math.random() * 5;
        const particleX = -50 + Math.random() * 100;
        particle.style.setProperty('--particle-x', `${particleX}px`);
        
        particle.style.animation = `
            particleFloat ${duration}s infinite ${delay}s,
            particleFade ${duration}s infinite ${delay}s
        `;
        
        energyParticles.appendChild(particle);
    }
}

// Feature cards animation on scroll
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 1.5s ease, transform 1.5s ease';
        observer.observe(card);
    });
    
    // Observe process cards on about page
    document.querySelectorAll('.process-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 1s ease, transform 1s ease';
        observer.observe(card);
    });
    
    // Observe tech cards on about page
    document.querySelectorAll('.tech-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 1s ease, transform 1s ease';
        observer.observe(card);
    });
});
// Thêm vào main.js (nếu file tồn tại)

// Global error handler for CSV loading
window.addEventListener('error', function(e) {
    if (e.message.includes('CSV') || e.message.includes('signals')) {
        console.error('Global error caught:', e);
        
        // Show user-friendly message
        const banner = document.getElementById('dataStatusBanner');
        if (banner) {
            banner.style.display = 'block';
            document.getElementById('statusMessage').textContent = 
                'Error loading data: ' + e.message.substring(0, 100);
        }
    }
});

// Handle offline/online status
window.addEventListener('offline', function() {
    showNotification('You are offline. Some features may not work.', 'warning');
});

window.addEventListener('online', function() {
    showNotification('Back online. Reloading data...', 'info');
    setTimeout(() => location.reload(), 2000);
});

// Mobile Menu Enhancement
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuBtn && navMenu) {
        // Tạo overlay
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        document.body.appendChild(overlay);
        
        // Xử lý click menu button
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Đóng menu khi click overlay
        overlay.addEventListener('click', function() {
            mobileMenuBtn.classList.remove('active');
            navMenu.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Đóng menu khi click vào link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Xử lý resize window
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Swipe to close trên mobile
        let touchStartY = 0;
        navMenu.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        navMenu.addEventListener('touchmove', function(e) {
            if (!navMenu.classList.contains('active')) return;
            
            const touchY = e.touches[0].clientY;
            const diff = touchY - touchStartY;
            
            // Nếu vuốt xuống từ đầu menu
            if (diff > 50 && touchStartY < 100) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }, { passive: true });
    }
});
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
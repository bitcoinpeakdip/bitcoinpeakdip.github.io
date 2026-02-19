// Interactive JavaScript - For home page interactions only

document.addEventListener('DOMContentLoaded', function() {
    if (window.IS_MOBILE) {
        console.log('📱 Running on mobile: All effects disabled.');
        
        // Set trạng thái tĩnh cho các phần tử
        const peakMessage = document.getElementById('peakMessage');
        const dipMessage = document.getElementById('dipMessage');
        const statusLight = document.getElementById('statusLight');
        const statusText = document.getElementById('statusText');
        const aiBadge = document.getElementById('aiBadge');
        
        if (peakMessage) peakMessage.style.opacity = '0.2';
        if (dipMessage) dipMessage.style.opacity = '0.2';
        if (statusLight) {
            statusLight.style.background = 'var(--wave-mid)';
            statusLight.style.animation = 'none'; // Tắt pulse animation
        }
        if (statusText) {
            statusText.textContent = 'MOBILE MODE ACTIVE';
            statusText.style.color = 'var(--wave-mid)';
        }
        if (aiBadge) {
            aiBadge.textContent = 'MOBILE OPTIMIZED';
            aiBadge.style.background = 'linear-gradient(to right, var(--wave-trough), var(--wave-mid))';
        }
        return; // Thoát, không chạy code bên dưới
    }
    
    // Chỉ chạy trên desktop
    console.log('🖥️ Desktop detected: Interactive System Active');    
    // Only run on home page
    if (!document.getElementById('peakMessage')) return;
    
    console.log('Interactive System Active');
    console.log('Sensor Network Monitoring');
    
    const peakMessage = document.getElementById('peakMessage');
    const dipMessage = document.getElementById('dipMessage');
    const statusLight = document.getElementById('statusLight');
    const statusText = document.getElementById('statusText');
    const aiBadge = document.getElementById('aiBadge');
    const logoContainer = document.querySelector('.logo-container');
    const logoWaveSync = document.getElementById('logoWaveSync');
    const interactiveBackground = document.getElementById('interactiveBackground');
    const sensorAlert = document.getElementById('sensorAlert');
    
    let wavePhase = 0;
    let lastUpdate = 0;
    const waveFrequency = 0.125/3;
    const updateInterval = 1000 / 60;
    let lastInteractionTime = 0;
    
    // Initialize wave state
    updateWaveState();
    
    // Create sensor alert effect
    function createSensorAlert(x, y, intensity = 1) {
        const currentTime = Date.now();
        
        // Check cooldown
        const mobileCooldown = window.innerWidth <= 768 ? 200 : 500;
        if (currentTime - lastInteractionTime < mobileCooldown) {
            return;
        }
        
        lastInteractionTime = currentTime;
        
        console.log(`Sensor alert at x: ${x}, y: ${y}, intensity: ${intensity}`);
        
        // Create multiple rings for stronger effect
        const ringCount = 3;
        const colors = [
            'rgba(255, 46, 99, 0.8)',    // Red
            'rgba(0, 212, 255, 0.8)',    // Blue
            'rgba(247, 147, 26, 0.8)'    // Orange
        ];
        
        for (let i = 0; i < ringCount; i++) {
            const ring = document.createElement('div');
            ring.className = 'alert-ring';
            
            // Position at click/touch point
            ring.style.left = `${x}px`;
            ring.style.top = `${y}px`;
            
            // Color based on index
            ring.style.borderColor = colors[i % colors.length];
            
            // Size and delay based on intensity and index
            const delay = i * 0.2;
            const sizeMultiplier = 1 + (i * 0.3) * intensity;
            
            ring.style.animation = `alertExpand ${1.5 * sizeMultiplier}s ease-out ${delay}s forwards`;
            
            // Add glow effect
            ring.style.boxShadow = `0 0 30px ${colors[i % colors.length]}`;
            
            sensorAlert.appendChild(ring);
            
            // Remove element after animation completes
            setTimeout(() => {
                if (ring.parentNode === sensorAlert) {
                    sensorAlert.removeChild(ring);
                }
            }, (1.5 * sizeMultiplier + delay) * 1000);
        }
        
        // Create particle burst effect
        createParticleBurst(x, y, intensity);
        
        // Intensify existing background waves
        intensifyBackgroundWaves(x, y, intensity);
        
        // Update status text temporarily
        const originalText = statusText.textContent;
        statusText.textContent = 'SENSOR TRIGGERED!';
        statusText.style.color = colors[0];
        statusText.style.textShadow = `0 0 20px ${colors[0]}`;
        
        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
            statusText.style.textShadow = '';
        }, 2000);
        
        // Update ai-badge to show interaction
        const originalBadgeText = aiBadge.textContent;
        aiBadge.textContent = 'SENSOR ACTIVATED!';
        aiBadge.style.background = 'linear-gradient(to right, var(--wave-peak), var(--wave-mid))';
        aiBadge.style.boxShadow = '0 0 25px rgba(255, 46, 99, 0.8)';
        
        setTimeout(() => {
            aiBadge.textContent = originalBadgeText;
            aiBadge.style.background = 'linear-gradient(to right, var(--wave-trough), var(--wave-mid))';
            aiBadge.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)';
        }, 1500);
    }
    
    // Create particle burst at interaction point
    function createParticleBurst(x, y, intensity) {
        const particleCount = Math.floor(30 * intensity);
        const burstContainer = document.createElement('div');
        burstContainer.style.position = 'fixed';
        burstContainer.style.left = `${x}px`;
        burstContainer.style.top = `${y}px`;
        burstContainer.style.transform = 'translate(-50%, -50%)';
        burstContainer.style.pointerEvents = 'none';
        burstContainer.style.zIndex = '3';
        
        document.body.appendChild(burstContainer);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            const size = 2 + Math.random() * 4;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = Math.random() > 0.5 ? 'var(--wave-peak)' : 'var(--wave-trough)';
            particle.style.opacity = '0.8';
            
            // Random direction and speed
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const distance = speed * (1 + intensity);
            
            // Animation
            const animation = particle.animate([
                {
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 0.8
                },
                {
                    transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 800 + Math.random() * 400,
                easing: 'cubic-bezier(0.215, 0.610, 0.355, 1)'
            });
            
            burstContainer.appendChild(particle);
            
            // Remove after animation
            animation.onfinish = () => {
                if (particle.parentNode === burstContainer) {
                    burstContainer.removeChild(particle);
                }
            };
        }
        
        // Remove container after all particles are gone
        setTimeout(() => {
            if (burstContainer.parentNode === document.body) {
                document.body.removeChild(burstContainer);
            }
        }, 2000);
    }
    
    // Intensify existing background waves
    function intensifyBackgroundWaves(x, y, intensity) {
        const waves = document.querySelectorAll('.bitcoin-wave');
        const rings = document.querySelectorAll('.sensor-ring');
        
        // Intensify waves
        waves.forEach((wave, index) => {
            const originalOpacity = wave.style.opacity;
            wave.style.opacity = (parseFloat(wave.style.opacity || 0.1) * (1 + intensity * 2)).toString();
            wave.style.filter = `blur(${intensity * 5}px) brightness(${1 + intensity})`;
            
            // Reset after delay
            setTimeout(() => {
                wave.style.opacity = originalOpacity || '0.1';
                wave.style.filter = '';
            }, 1000 * intensity);
        });
        
        // Intensify sensor rings
        rings.forEach((ring, index) => {
            const originalBorderColor = ring.style.borderColor;
            ring.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            ring.style.borderWidth = '2px';
            ring.style.filter = `blur(${intensity}px) brightness(${1 + intensity})`;
            
            // Reset after delay
            setTimeout(() => {
                ring.style.borderColor = originalBorderColor;
                ring.style.borderWidth = '';
                ring.style.filter = '';
            }, 1500 * intensity);
        });
        
        // Intensify logo wave effect
        const logoWave = document.querySelector('.logo-wave-effect');
        if (logoWave) {
            const originalOpacity = logoWave.style.opacity;
            logoWave.style.opacity = (parseFloat(logoWave.style.opacity || 0.05) * 3).toString();
            logoWave.style.filter = `blur(${intensity * 2}px) brightness(${1 + intensity})`;
            
            setTimeout(() => {
                logoWave.style.opacity = originalOpacity || '0.05';
                logoWave.style.filter = '';
            }, 1000 * intensity);
        }
    }
    
    // Handle interaction events
    function handleInteraction(x, y, intensity = 1) {
        createSensorAlert(x, y, intensity);
    }
    
    // Desktop click
    interactiveBackground.addEventListener('click', function(e) {
        handleInteraction(e.clientX, e.clientY, 1);
    });
    
    // Mobile touch
    interactiveBackground.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        // Get the first touch point
        const touch = e.touches[0];
        if (touch) {
            handleInteraction(touch.clientX, touch.clientY, 0.8);
        }
        
        // Add visual feedback for mobile
        interactiveBackground.style.setProperty('--touch-x', `${touch.clientX}px`);
        interactiveBackground.style.setProperty('--touch-y', `${touch.clientY}px`);
        interactiveBackground.classList.add('touch-active');
        
        setTimeout(() => {
            interactiveBackground.classList.remove('touch-active');
        }, 300);
    }, { passive: false });
    
    // For mobile touch move
    interactiveBackground.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
            handleInteraction(touch.clientX, touch.clientY, 0.3);
        }
    }, { passive: false });
    
    // For desktop mouse drag
    let isDragging = false;
    interactiveBackground.addEventListener('mousedown', function(e) {
        isDragging = true;
        handleInteraction(e.clientX, e.clientY, 0.5);
    });
    
    interactiveBackground.addEventListener('mousemove', function(e) {
        if (isDragging) {
            handleInteraction(e.clientX, e.clientY, 0.3);
        }
    });
    
    interactiveBackground.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    interactiveBackground.addEventListener('mouseleave', function() {
        isDragging = false;
    });
    
    // Animation loop for smooth wave updates
    function animate(currentTime) {
        if (!lastUpdate) lastUpdate = currentTime;
        
        const deltaTime = currentTime - lastUpdate;
        
        if (deltaTime >= updateInterval) {
            wavePhase += (deltaTime / 1000) * waveFrequency;
            wavePhase %= 1;
            
            updateWaveState();
            lastUpdate = currentTime;
        }
        
        requestAnimationFrame(animate);
    }
    
    // Update wave visual state based on phase
    function updateWaveState() {
        // Calculate wave position
        const wavePosition = Math.sin(wavePhase * Math.PI * 4);
        const absoluteWavePosition = Math.abs(wavePosition);
        
        // Peak phase
        if (wavePosition > 0.95) {
            // Show peak detection
            peakMessage.style.opacity = '1';
            dipMessage.style.opacity = '0';
            
            // Add pulse animation to peak message
            peakMessage.style.animation = 'detectionPulse 9s infinite alternate';
            dipMessage.style.animation = 'none';
            
            // Update status indicator
            statusLight.className = 'status-light status-peak';
            statusText.textContent = 'BITCOIN PEAK DETECTED';
            statusText.style.color = 'var(--wave-peak)';
            
            // Update logo container border color
            logoContainer.style.borderColor = 'rgba(255, 46, 99, 0.4)';
            
            // Update badge text and color
            aiBadge.textContent = 'PEAK DETECTED - SELL SIGNAL';
            aiBadge.style.background = 'linear-gradient(to right, var(--wave-peak), #ff6b00)';
            aiBadge.style.boxShadow = '0 0 25px rgba(255, 46, 99, 0.6)';
            aiBadge.style.color = '#ffffff';
            
            // Update logo wave sync
            logoWaveSync.style.opacity = '0.8';
            logoWaveSync.style.background = 'linear-gradient(90deg, var(--wave-mid), var(--wave-peak))';
            
            // Add gentle background glow to logo container
            logoContainer.style.boxShadow = 
                '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(255, 46, 99, 0.15)';
        } 
        // Dip phase
        else if (wavePosition < -0.95) {
            // Show dip detection
            peakMessage.style.opacity = '0';
            dipMessage.style.opacity = '1';
            
            // Add pulse animation to dip message
            dipMessage.style.animation = 'detectionPulse 9s infinite alternate';
            peakMessage.style.animation = 'none';
            
            // Update status indicator
            statusLight.className = 'status-light status-dip';
            statusText.textContent = 'BITCOIN DIP DETECTED';
            statusText.style.color = 'var(--wave-trough)';
            
            // Update logo container border color
            logoContainer.style.borderColor = 'rgba(0, 212, 255, 0.4)';
            
            // Update badge text and color
            aiBadge.textContent = 'DIP DETECTED - BUY SIGNAL';
            aiBadge.style.background = 'linear-gradient(to right, var(--wave-trough), #0088cc)';
            aiBadge.style.boxShadow = '0 0 25px rgba(0, 212, 255, 0.6)';
            aiBadge.style.color = '#ffffff';
            
            // Update logo wave sync
            logoWaveSync.style.opacity = '0.8';
            logoWaveSync.style.background = 'linear-gradient(90deg, var(--wave-trough), var(--wave-mid))';
            
            // Add gentle background glow to logo container
            logoContainer.style.boxShadow = 
                '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 212, 255, 0.15)';
        }
        // Transition phase
        else {
            // Fade out both messages based on wave position
            const fadeAmount = absoluteWavePosition * 0.5;
            peakMessage.style.opacity = `${fadeAmount}`;
            dipMessage.style.opacity = `${fadeAmount}`;
            
            // Gentle pulse animation for both
            const pulseSpeed = 12 + absoluteWavePosition * 6;
            peakMessage.style.animation = `detectionPulse ${pulseSpeed}s infinite alternate`;
            dipMessage.style.animation = `detectionPulse ${pulseSpeed}s infinite alternate`;
            
            // Update status indicator
            statusLight.className = 'status-light';
            statusLight.style.background = 'var(--wave-mid)';
            statusText.textContent = 'ANALYSING BITCOIN WAVES';
            statusText.style.color = 'var(--wave-mid)';
            
            // Update logo container border color
            logoContainer.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            
            // Update badge text and color
            aiBadge.textContent = 'ANALYSING BITCOIN WAVES';
            aiBadge.style.background = 'linear-gradient(to right, var(--wave-trough), var(--wave-mid))';
            aiBadge.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)';
            aiBadge.style.color = '#ffffff';
            
            // Update logo wave sync
            const syncOpacity = 0.2 + absoluteWavePosition * 0.2;
            logoWaveSync.style.opacity = `${syncOpacity}`;
            logoWaveSync.style.background = 'linear-gradient(90deg, var(--wave-trough), var(--wave-mid), var(--wave-peak))';
            
            // Reset logo container shadow
            logoContainer.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.5)';
        }
        
        // Sync logo wave effect with background waves
        const logoWave = document.querySelector('.logo-wave-effect');
        if (logoWave) {
            const waveOffset = wavePhase * 50;
            logoWave.style.transform = `translateX(${-waveOffset}%) translateY(${Math.sin(wavePhase * Math.PI * 8) * 3}px)`;
            logoWave.style.opacity = `${0.02 + absoluteWavePosition * 0.04}`;
        }
        
        // Move wave sync indicator
        const syncPosition = wavePhase * 50;
        logoWaveSync.style.transform = `translateX(${syncPosition}%)`;
    }
    
    // Start animation loop
    requestAnimationFrame(animate);
    
    // Add wave sync effect to badge
    setInterval(() => {
        const waveIntensity = Math.abs(Math.sin(wavePhase * Math.PI * 2));
        aiBadge.style.transform = `translateY(${Math.sin(wavePhase * Math.PI * 8) * 1}px)`;
    }, 100);
    
    // Console instructions
    setTimeout(() => {
        console.log('%c💡 TIP: Click or touch anywhere to test the Early Warning System sensors!', 'color: #00d4ff; font-size: 14px;');
        
        // Show mobile-specific instructions
        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            console.log('%c📱 MOBILE: Touch and drag to simulate sensor network activity!', 'color: #f7931a; font-size: 14px;');
        }
    }, 3000);
    
    // Test mobile touch immediately
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        console.log('Mobile touch support detected');
        
        // Add a test alert after page load to confirm functionality
        setTimeout(() => {
            console.log('Testing sensor network...');
            // Create a test alert at center
            createSensorAlert(window.innerWidth / 2, window.innerHeight / 2, 0.5);
        }, 1000);
    }
});
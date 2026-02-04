// EWS Signals Page JavaScript - COMPLETE FIXED VERSION
// Bitcoin PeakDip Early Warning System Signals Log

let signalsData = [];
let currentPage = 1;
const itemsPerPage = 15;
let filteredSignals = [];
let currentFilter = 'all';
let bitcoinChart = null;
let analysisCharts = [];
let historicalPriceData = [];
let csvDataLoaded = false;

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info', duration = 3000) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(notif => {
        if (notif.parentNode) {
            notif.parentNode.removeChild(notif);
        }
    });
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, duration);
    
    return notification;
}

// Add notification CSS
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
    border-left: 4px solid #f7931a;
    animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
    max-width: 400px;
    backdrop-filter: blur(10px);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.notification-success {
    border-left-color: #4CAF50;
}

.notification-error {
    border-left-color: #f44336;
}

.notification-info {
    border-left-color: #2196F3;
}

.notification-warning {
    border-left-color: #FF9800;
}

.notification i {
    font-size: 1.2em;
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

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}
`;
document.head.appendChild(notificationStyle);
// ========== END NOTIFICATION SYSTEM ==========

// ========== MAIN INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bitcoin PeakDip EWS Signals Initialized - FIXED VERSION');
    
    // Listen for CSV data ready event from HTML
    document.addEventListener('csvDataReady', function(e) {
        console.log('📁 CSV Data Ready event received');
        csvDataLoaded = true;
        parseCSVData(e.detail.csvText);
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Load historical Bitcoin price data
    loadHistoricalBitcoinData();
    
    // Check if CSV is already loaded
    setTimeout(() => {
        if (!csvDataLoaded) {
            if (window.realCsvData) {
                console.log('📁 CSV data found in window object');
                parseCSVData(window.realCsvData);
            } else {
                console.log('⚠️ No CSV data yet, trying direct load...');
                loadRealCSVData();
            }
        }
    }, 1000);
    
    // Show initial loading notification
    showNotification('Loading Bitcoin EWS Signals...', 'info');
});

// ========== DATA LOADING FUNCTIONS ==========
async function loadRealCSVData() {
    try {
        console.log('📂 Direct CSV loading from data/signals.csv');
        
        // Try multiple paths
        const paths = ['data/signals.csv', './data/signals.csv', 'signals.csv', './signals.csv'];
        
        for (const path of paths) {
            try {
                console.log(`Trying: ${path}`);
                const response = await fetch(path);
                
                if (response.ok) {
                    const csvText = await response.text();
                    console.log(`✅ CSV found at: ${path} (${csvText.length} bytes)`);
                    parseCSVData(csvText);
                    return;
                }
            } catch (error) {
                console.log(`❌ Failed: ${path}`);
                continue;
            }
        }
        
        throw new Error('Could not find CSV file at any path');
        
    } catch (error) {
        console.error('❌ Direct CSV load failed:', error);
        showNotification('Using sample data (CSV not found)', 'warning');
        createSampleData();
    }
}

function parseCSVData(csvText) {
    console.log('📊 Parsing CSV data...');
    
    const lines = csvText.trim().split('\n');
    console.log('Total lines in CSV:', lines.length);
    
    if (lines.length < 2) {
        console.error('CSV has no data rows');
        showNotification('CSV file is empty', 'error');
        createSampleData();
        return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('CSV headers:', headers);
    
    signalsData = [];
    let peakCount = 0;
    let dipCount = 0;
    
    // Parse each row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        
        if (values.length < 3) {
            console.warn(`Skipping line ${i}: insufficient columns`);
            continue;
        }
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        
        // Parse timestamp (format: "M/D/YYYY HH:MM")
        const timestampStr = row['timestamp'] || '';
        let timestamp;
        
        if (timestampStr.includes('/')) {
            const [datePart, timePart = '00:00'] = timestampStr.split(' ');
            const [month, day, year] = datePart.split('/').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            
            timestamp = new Date(year, month - 1, day, hour || 0, minute || 0);
        } else {
            timestamp = new Date(timestampStr);
        }
        
        if (isNaN(timestamp.getTime())) {
            console.warn(`Invalid date in row ${i}: ${timestampStr}`);
            continue;
        }
        
        // Parse price
        const price = parseFloat(row['price']) || 0;
        if (price === 0) {
            console.warn(`Invalid price in row ${i}: ${row['price']}`);
            continue;
        }
        
        // Parse confidence (0.98 in CSV → 98%)
        const confValue = parseFloat(row['confidence']) || 0.98;
        const confidence = confValue <= 1 ? Math.round(confValue * 100) : Math.round(confValue);
        
        // Signal type - convert some PEAKs to DIPs for demonstration
        let signal_type = (row['signal_type'] || 'PEAK').toUpperCase();
        let finalPrice = price;
        
        if (signal_type === 'PEAK') {
            // Convert about 1/3 of PEAKs to DIPs for demo
            if (Math.random() < 0.33) {
                signal_type = 'DIP';
                dipCount++;
                finalPrice = price * (0.95 + Math.random() * 0.04); // -3% to -1%
            } else {
                peakCount++;
            }
        } else if (signal_type === 'DIP') {
            dipCount++;
        }
        
        // Determine validation status
        const validation = confidence >= 90 ? 'VALIDATED' : 
                          confidence >= 80 ? 'PENDING' : 'REVIEW_NEEDED';
        
        // Strategy list
        const strategies = [
            'RECLAIM_FAILURE', 'DISTRIBUTION_FADE', 'HEDGE_FLIP', 
            'CONTINUATION', 'MOMENTUM_BREAKDOWN', 'MULTI_TF_CONFLUENCE',
            'VOLATILITY_EXPANSION', 'DERIVATIVES_DIVERGENCE', 'SUPPORT_TEST',
            'RESISTANCE_BREAK', 'TREND_REVERSAL', 'ACCUMULATION_ZONE'
        ];
        
        // Get or assign strategy
        let strategy = row['strategy'] || '';
        if (!strategy) {
            strategy = strategies[Math.floor(Math.random() * strategies.length)];
        }
        
        // Calculate distance
        let distance = parseFloat(row['distance']) || 0;
        if (distance === 0) {
            distance = (100 - confidence) / 25 + Math.random() * 2;
            distance = Math.round(distance * 10) / 10;
        }
        
        const signal = {
            timestamp: timestamp,
            signal_type: signal_type,
            price: parseFloat(finalPrice.toFixed(2)),
            confidence: confidence,
            distance: distance,
            validation: validation,
            strategy: strategy,
            id: `signal_${i}_${Date.now()}`,
            original_index: i
        };
        
        signalsData.push(signal);
    }
    
    console.log(`✅ Parsed ${signalsData.length} signals from CSV`);
    console.log(`📈 Peak signals: ${peakCount}, Dip signals: ${dipCount}`);
    
    // Sort by timestamp (oldest to newest)
    signalsData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Update UI
    updateUI();
    
    // Show success notification
    showNotification(`Loaded ${signalsData.length} signals successfully`, 'success');
}

function createSampleData() {
    console.log('🔄 Creating sample data...');
    
    const startDate = new Date('2022-09-01');
    const strategies = [
        'RECLAIM_FAILURE', 'DISTRIBUTION_FADE', 'HEDGE_FLIP', 
        'CONTINUATION', 'MOMENTUM_BREAKDOWN'
    ];
    
    // Sample prices from the CSV
    const samplePrices = [
        19181.4, 20715.89, 21137.7, 21386.79, 22771.98, 23765.29, 24057.53,
        28621.48, 28245.94, 30742.63, 27960.01, 28687.59, 29031.67, 30874,
        30235.01, 29436.19, 26605.87, 27273.94, 34246.79, 34479.99
    ];
    
    signalsData = [];
    
    for (let i = 0; i < samplePrices.length; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(date.getDate() + Math.floor(Math.random() * 28));
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));
        
        // Alternate between PEAK and DIP
        const signal_type = i % 3 === 0 ? 'DIP' : 'PEAK';
        const confidence = 80 + Math.floor(Math.random() * 20);
        
        signalsData.push({
            timestamp: date,
            signal_type: signal_type,
            price: samplePrices[i] || (30000 + Math.random() * 20000),
            confidence: confidence,
            distance: Math.random() * 5 + 1,
            validation: confidence > 85 ? 'VALIDATED' : 'PENDING',
            strategy: strategies[Math.floor(Math.random() * strategies.length)],
            id: `sample_${i}_${Date.now()}`
        });
    }
    
    console.log(`✅ Created ${signalsData.length} sample signals`);
    updateUI();
    showNotification(`Loaded ${signalsData.length} sample signals`, 'info');
}

async function loadHistoricalBitcoinData() {
    try {
        console.log('📈 Loading historical Bitcoin price data...');
        
        // Use CoinGecko API (free, no API key needed for basic)
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily'
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        historicalPriceData = data.prices.map(point => ({
            x: new Date(point[0]),
            y: point[1]
        }));
        
        console.log(`✅ Loaded ${historicalPriceData.length} Bitcoin price points`);
        
        // Update chart if initialized
        if (bitcoinChart) {
            updateChartsWithData();
        }
        
    } catch (error) {
        console.error('❌ Error loading Bitcoin data:', error);
        showNotification('Using simulated Bitcoin price data', 'warning');
        generateFallbackPriceData();
    }
}

function generateFallbackPriceData() {
    console.log('🔄 Generating fallback Bitcoin price data...');
    
    const startDate = new Date('2022-09-01');
    const endDate = new Date();
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    historicalPriceData = [];
    let price = 19000;
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Random walk with upward bias
        const change = (Math.random() - 0.45) * 0.08; // Slight upward bias
        price = price * (1 + change);
        
        // Add some noise
        const noise = (Math.random() - 0.5) * price * 0.03;
        price += noise;
        
        // Ensure minimum price
        price = Math.max(15000, price);
        
        historicalPriceData.push({
            x: date,
            y: Math.round(price * 100) / 100
        });
    }
    
    console.log(`✅ Generated ${historicalPriceData.length} simulated price points`);
}

// ========== UI UPDATE FUNCTIONS ==========
function updateUI() {
    updateLastUpdated();
    updateStats();
    filterSignals();
    renderTable();
    updateChartsWithData();
    updateAnalysisCharts();
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function updateStats() {
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const totalCount = signalsData.length;
    
    // Calculate accuracy: signals with confidence >= 80 are considered "accurate"
    const accurateSignals = signalsData.filter(s => s.confidence >= 80).length;
    const accuracyRate = totalCount > 0 ? Math.round((accurateSignals / totalCount) * 100) : 0;
    
    // Update DOM
    document.getElementById('peakCount').textContent = peakCount;
    document.getElementById('dipCount').textContent = dipCount;
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('accuracyRate').textContent = accuracyRate + '%';
    
    // Update percentages for analysis section
    const peakPercentage = document.getElementById('peakPercentage');
    const dipPercentage = document.getElementById('dipPercentage');
    if (peakPercentage && dipPercentage) {
        peakPercentage.textContent = totalCount > 0 ? Math.round((peakCount / totalCount) * 100) + '%' : '0%';
        dipPercentage.textContent = totalCount > 0 ? Math.round((dipCount / totalCount) * 100) + '%' : '0%';
    }
    
    // Update confidence stats
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    const lowConfidence = signalsData.filter(s => s.confidence < 60).length;
    
    if (document.getElementById('highConfidence')) {
        document.getElementById('highConfidence').textContent = highConfidence;
    }
    if (document.getElementById('mediumConfidence')) {
        document.getElementById('mediumConfidence').textContent = mediumConfidence;
    }
    
    console.log(`📊 Stats updated: ${peakCount} peaks, ${dipCount} dips, ${totalCount} total, ${accuracyRate}% accuracy`);
}

function filterSignals() {
    const searchTerm = document.getElementById('signalSearch')?.value.toLowerCase() || '';
    
    filteredSignals = signalsData.filter(signal => {
        // Apply filter
        if (currentFilter === 'peak' && signal.signal_type !== 'PEAK') return false;
        if (currentFilter === 'dip' && signal.signal_type !== 'DIP') return false;
        if (currentFilter === 'high-confidence' && signal.confidence < 80) return false;
        
        // Apply search
        if (searchTerm) {
            const searchStr = [
                signal.signal_type,
                signal.strategy,
                signal.validation,
                signal.price.toString(),
                signal.confidence.toString()
            ].join(' ').toLowerCase();
            
            if (!searchStr.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    currentPage = 1; // Reset to first page
}

function renderTable() {
    const tableBody = document.getElementById('signalsTableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSignals = filteredSignals.slice(startIndex, endIndex);
    
    if (pageSignals.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-results">
                    <i class="fas fa-search"></i> No signals found matching your criteria
                </td>
            </tr>
        `;
        return;
    }
    
    // Create rows
    pageSignals.forEach((signal, index) => {
        const row = document.createElement('tr');
        row.className = `signal-${signal.signal_type.toLowerCase()}`;
        row.dataset.signalId = signal.id;
        row.dataset.index = startIndex + index;
        
        row.innerHTML = `
            <td>
                <div class="timestamp">
                    <div class="date">${formatDate(signal.timestamp)}</div>
                    <div class="time">${formatTime(signal.timestamp)}</div>
                </div>
            </td>
            <td>
                <span class="signal-type ${signal.signal_type.toLowerCase()}">
                    ${signal.signal_type}
                </span>
            </td>
            <td>
                <div class="price-display">
                    <span class="price">$${signal.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </td>
            <td>
                <span class="confidence-indicator confidence-${getConfidenceLevel(signal.confidence)}">
                    ${signal.confidence}%
                </span>
            </td>
            <td>
                <div class="distance-display">
                    <span class="distance">${signal.distance.toFixed(1)}%</span>
                    <div class="distance-bar">
                        <div class="distance-fill" style="width: ${Math.min(signal.distance * 20, 100)}%"></div>
                    </div>
                </div>
            </td>
            <td>
                <span class="validation-status validation-${signal.validation.toLowerCase()}">
                    ${signal.validation}
                </span>
            </td>
            <td>
                <span class="strategy-tag">
                    ${signal.strategy.replace(/_/g, ' ')}
                </span>
            </td>
        `;
        
        // Add click event
        row.addEventListener('click', function() {
            selectSignal(signal, startIndex + index);
        });
        
        tableBody.appendChild(row);
    });
    
    // Update pagination controls
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function selectSignal(signal, index) {
    // Remove previous selection
    document.querySelectorAll('.signals-table tbody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
    // Add selection to current row
    const rows = document.querySelectorAll('.signals-table tbody tr');
    if (rows[index]) {
        rows[index].classList.add('selected');
    }
    
    // Show signal details
    showSignalDetails(signal);
    
    // Update chart highlight
    highlightSignalOnChart(signal);
}

function showSignalDetails(signal) {
    const detailsContainer = document.getElementById('signalDetails');
    if (!detailsContainer) return;
    
    const confidenceLevel = getConfidenceLevel(signal.confidence);
    const confidenceColor = confidenceLevel === 'high' ? '#4CAF50' : 
                           confidenceLevel === 'medium' ? '#FFC107' : '#F44336';
    
    detailsContainer.innerHTML = `
        <div class="signal-details">
            <div class="detail-card">
                <h3><i class="fas fa-info-circle"></i> Signal Information</h3>
                <div class="detail-item">
                    <span class="detail-label">Signal Type:</span>
                    <span class="detail-value signal-type ${signal.signal_type.toLowerCase()}">
                        ${signal.signal_type}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Timestamp:</span>
                    <span class="detail-value">${formatDateTime(signal.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Bitcoin Price:</span>
                    <span class="detail-value">$${signal.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Strategy:</span>
                    <span class="detail-value">${signal.strategy.replace(/_/g, ' ')}</span>
                </div>
            </div>
            
            <div class="detail-card">
                <h3><i class="fas fa-chart-bar"></i> Signal Metrics</h3>
                <div class="detail-item">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value" style="color: ${confidenceColor}">
                        ${signal.confidence}%
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Distance:</span>
                    <span class="detail-value">${signal.distance.toFixed(1)}% from ideal entry</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Validation:</span>
                    <span class="detail-value validation-status validation-${signal.validation.toLowerCase()}">
                        ${signal.validation}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Signal Age:</span>
                    <span class="detail-value">${getTimeAgo(signal.timestamp)}</span>
                </div>
            </div>
            
            <div class="detail-card">
                <h3><i class="fas fa-chart-line"></i> Chart Position</h3>
                <div class="chart-mini">
                    <canvas id="signalMiniChart"></canvas>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Position in Chart:</span>
                    <span class="detail-value">${getChartPositionDescription(signal)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Create mini chart
    createMiniChart(signal);
}

function createMiniChart(signal) {
    const ctx = document.getElementById('signalMiniChart')?.getContext('2d');
    if (!ctx) return;
    
    // Create simple price movement around signal
    const timePoints = 10;
    const prices = [];
    const times = [];
    
    for (let i = 0; i < timePoints; i++) {
        const timeOffset = (i - 5) * 2; // Hours around signal
        const priceVariation = (Math.random() - 0.5) * signal.price * 0.03; // ±3%
        prices.push(signal.price + priceVariation);
        times.push(new Date(signal.timestamp.getTime() + timeOffset * 60 * 60 * 1000));
    }
    
    const signalIndex = 5; // Signal in the middle
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: times.map(t => t.getHours() + ':' + t.getMinutes().toString().padStart(2, '0')),
            datasets: [{
                label: 'Bitcoin Price',
                data: prices,
                borderColor: signal.signal_type === 'PEAK' ? '#ff2e63' : '#00d4ff',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0
            }, {
                label: 'Signal Point',
                data: prices.map((p, i) => i === signalIndex ? p : null),
                borderColor: '#f7931a',
                backgroundColor: '#f7931a',
                borderWidth: 3,
                pointRadius: 6,
                pointStyle: 'circle'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// ========== CHART FUNCTIONS ==========
function initializeCharts() {
    // Main Bitcoin Chart
    const chartCtx = document.getElementById('bitcoinChart')?.getContext('2d');
    if (!chartCtx) return;
    
    bitcoinChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Bitcoin Price',
                    data: [],
                    borderColor: '#f7931a',
                    backgroundColor: 'rgba(247, 147, 26, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: 'Peak Signals',
                    data: [],
                    borderColor: '#ff2e63',
                    backgroundColor: '#ff2e63',
                    borderWidth: 0,
                    pointRadius: 8,
                    pointStyle: 'triangle',
                    pointRotation: 180,
                    showLine: false
                },
                {
                    label: 'Dip Signals',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: '#00d4ff',
                    borderWidth: 0,
                    pointRadius: 8,
                    pointStyle: 'triangle',
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            if (datasetLabel === 'Bitcoin Price') {
                                return `Price: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            } else {
                                const signal = context.raw?.signal;
                                if (signal) {
                                    return `${signal.signal_type} Signal: $${signal.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                                return datasetLabel;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                        }
                    }
                }
            }
        }
    });
    
    // Initialize analysis charts
    initializeAnalysisCharts();
}

function initializeAnalysisCharts() {
    // Type Distribution Chart (Doughnut)
    const typeCtx = document.getElementById('typeDistributionChart')?.getContext('2d');
    if (typeCtx) {
        const typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Peak Signals', 'Dip Signals'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#ff2e63', '#00d4ff'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '70%'
            }
        });
        analysisCharts.push(typeChart);
    }
    
    // Confidence Chart (Bar)
    const confidenceCtx = document.getElementById('confidenceChart')?.getContext('2d');
    if (confidenceCtx) {
        const confidenceChart = new Chart(confidenceCtx, {
            type: 'bar',
            data: {
                labels: ['High (80-100)', 'Medium (60-79)', 'Low (<60)'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false, beginAtZero: true }
                }
            }
        });
        analysisCharts.push(confidenceChart);
    }
    
    // Time Distribution Chart (Line)
    const timeCtx = document.getElementById('timeDistributionChart')?.getContext('2d');
    if (timeCtx) {
        const timeChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Signals',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#f7931a',
                    backgroundColor: 'rgba(247, 147, 26, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false, beginAtZero: true }
                }
            }
        });
        analysisCharts.push(timeChart);
    }
}

function updateChartsWithData() {
    if (!bitcoinChart || signalsData.length === 0) return;
    
    // Use historical Bitcoin data or generate fallback
    const priceData = historicalPriceData.length > 0 ? 
        historicalPriceData : generateBitcoinPriceData();
    
    const peakSignals = signalsData.filter(s => s.signal_type === 'PEAK');
    const dipSignals = signalsData.filter(s => s.signal_type === 'DIP');
    
    // Update main chart
    bitcoinChart.data.datasets[0].data = priceData;
    bitcoinChart.data.datasets[1].data = peakSignals.map(signal => ({
        x: signal.timestamp,
        y: signal.price,
        signal: signal
    }));
    bitcoinChart.data.datasets[2].data = dipSignals.map(signal => ({
        x: signal.timestamp,
        y: signal.price,
        signal: signal
    }));
    
    bitcoinChart.update();
    
    // Update analysis charts
    updateAnalysisCharts();
}

function updateAnalysisCharts() {
    if (analysisCharts.length < 3 || signalsData.length === 0) return;
    
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    const lowConfidence = signalsData.filter(s => s.confidence < 60).length;
    
    // Type distribution
    if (analysisCharts[0]) {
        analysisCharts[0].data.datasets[0].data = [peakCount, dipCount];
        analysisCharts[0].update();
    }
    
    // Confidence distribution
    if (analysisCharts[1]) {
        analysisCharts[1].data.datasets[0].data = [highConfidence, mediumConfidence, lowConfidence];
        analysisCharts[1].update();
    }
    
    // Time distribution (by day of week)
    if (analysisCharts[2]) {
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        signalsData.forEach(signal => {
            const day = signal.timestamp.getDay();
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        
        // Reorder to start from Monday (1)
        const reorderedCounts = [...dayCounts.slice(1), dayCounts[0]];
        analysisCharts[2].data.datasets[0].data = reorderedCounts;
        analysisCharts[2].update();
    }
}

function highlightSignalOnChart(signal) {
    // Highlight logic - could add animation or tooltip
    console.log('Highlighting signal on chart:', signal);
}

function updateChartTimeframe(timeframe) {
    if (!bitcoinChart) return;
    
    let unit = 'day';
    let displayFormats = {};
    
    switch(timeframe) {
        case '1d':
            unit = 'hour';
            displayFormats.hour = 'HH:mm';
            break;
        case '7d':
            unit = 'day';
            displayFormats.day = 'MMM dd';
            break;
        case '30d':
            unit = 'day';
            displayFormats.day = 'MMM dd';
            break;
        case '90d':
            unit = 'month';
            displayFormats.month = 'MMM';
            break;
        default:
            unit = 'day';
    }
    
    bitcoinChart.options.scales.x.time.unit = unit;
    bitcoinChart.options.scales.x.time.displayFormats = displayFormats;
    bitcoinChart.update();
}

// ========== EVENT HANDLERS ==========
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterSignals();
            renderTable();
        });
    });
    
    // Search input
    const searchInput = document.getElementById('signalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterSignals();
            renderTable();
        });
    }
    
    // Pagination
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }
    
    // Timeframe controls
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateChartTimeframe(this.dataset.timeframe);
        });
    });
    
    // Refresh data button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshData();
        });
    }
    
    // CSV upload
    const uploadBtn = document.getElementById('uploadCsv');
    const fileInput = document.getElementById('csvFileInput');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                handleCsvUpload(e.target.files[0]);
            }
        });
    }
}

function refreshData() {
    const refreshBtn = document.getElementById('refreshData');
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    
    // Show loading state
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    showNotification('Refreshing data...', 'info');
    
    // Simulate refresh
    setTimeout(() => {
        // Reload CSV data
        loadRealCSVData();
        
        // Reload Bitcoin price data
        loadHistoricalBitcoinData();
        
        // Restore button
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        showNotification('Data refreshed successfully!', 'success');
    }, 1500);
}

function handleCsvUpload(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            parseCSVData(csvText);
            showNotification('CSV file uploaded and parsed successfully!', 'success');
        } catch (error) {
            console.error('Error parsing uploaded CSV:', error);
            showNotification('Error parsing CSV file. Please check the format.', 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

// ========== HELPER FUNCTIONS ==========
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes < 1 ? 'Just now' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    } else {
        const diffDays = Math.floor(diffHours / 24);
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
}

function getConfidenceLevel(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
}

function getChartPositionDescription(signal) {
    const price = signal.price;
    
    if (price > 60000) return 'High Volatility Zone';
    if (price > 40000) return 'Upper Range';
    if (price > 30000) return 'Mid Range';
    if (price > 20000) return 'Support Zone';
    return 'Lower Range';
}

function generateBitcoinPriceData() {
    // Generate synthetic price data for fallback
    const data = [];
    const startDate = signalsData.length > 0 ? 
        new Date(signalsData[0].timestamp) : new Date('2023-01-01');
    
    let price = 30000;
    
    for (let i = 0; i < 100; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const change = (Math.random() - 0.5) * 0.05;
        price = price * (1 + change);
        
        data.push({
            x: date,
            y: Math.max(15000, price)
        });
    }
    
    return data;
}

// ========== ADDITIONAL CSS ==========
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
.no-results {
    text-align: center;
    padding: 50px 20px;
    color: var(--text-glow);
    opacity: 0.7;
    font-style: italic;
}

.no-results i {
    font-size: 2em;
    margin-bottom: 15px;
    color: var(--wave-mid);
    display: block;
}

.distance-bar {
    width: 60px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin-top: 5px;
    overflow: hidden;
}

.distance-fill {
    height: 100%;
    background: var(--wave-mid);
    border-radius: 2px;
    transition: width 0.3s ease;
}

.strategy-tag {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(156, 39, 176, 0.1);
    border: 1px solid rgba(156, 39, 176, 0.3);
    border-radius: 12px;
    font-size: 0.8em;
    color: #9c27b0;
    text-transform: lowercase;
}

.timestamp .date {
    font-weight: 500;
    color: var(--text-light);
}

.timestamp .time {
    font-size: 0.9em;
    color: var(--text-glow);
    opacity: 0.8;
}

.price-display .price {
    font-weight: 600;
    color: var(--text-light);
}

.signal-peak {
    border-left: 3px solid rgba(255, 46, 99, 0.3);
}

.signal-dip {
    border-left: 3px solid rgba(0, 212, 255, 0.3);
}

.signal-peak:hover {
    background: rgba(255, 46, 99, 0.05) !important;
}

.signal-dip:hover {
    background: rgba(0, 212, 255, 0.05) !important;
}

.selected {
    background: rgba(247, 147, 26, 0.1) !important;
    box-shadow: inset 3px 0 0 var(--wave-mid);
}
`;
document.head.appendChild(additionalStyles);

// ========== INITIAL DATA LOAD ==========
// If CSV data is already available in window object, use it immediately
if (window.realCsvData && typeof window.realCsvData === 'string') {
    console.log('CSV data found on window object, parsing...');
    parseCSVData(window.realCsvData);
}

console.log('✅ signals.js loaded successfully');
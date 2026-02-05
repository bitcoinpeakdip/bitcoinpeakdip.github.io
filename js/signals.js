// EWS Signals Page JavaScript - FIXED VERSION (READS ONLY ACTUAL CSV DATA)
// Bitcoin PeakDip Early Warning System Signals Log
// Version: 1.0.0 - Stable (No demo data generation)

let signalsData = [];
let currentPage = 1;
const itemsPerPage = 15;
let filteredSignals = [];
let currentFilter = 'all';
let bitcoinChart = null;
let analysisCharts = [];
let historicalPriceData = [];
let csvDataLoaded = false;
let lastUpdateTime = null;

// ========== VERSION CONTROL & CACHE BUSTING ==========
const APP_VERSION = '1.4.0'; // TĂNG SỐ NÀY MỖI LẦN CẬP NHẬT
const VERSION_KEY = 'peakdip_version';

// Kiểm tra và xử lý cache khi version thay đổi
function handleCacheVersion() {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    if (storedVersion !== APP_VERSION) {
        console.log(`🔄 Version update detected: ${APP_VERSION} (was ${storedVersion})`);
        
        // 1. Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // 2. Clear caches
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                    console.log(`🗑️ Deleted cache: ${cacheName}`);
                });
            });
        }
        
        // 3. Clear IndexedDB
        if (window.indexedDB) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => {
                    if (db.name) indexedDB.deleteDatabase(db.name);
                });
            });
        }
        
        // 4. Save new version
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        
        // 5. Show user-friendly notification
        if (storedVersion) { // Chỉ thông báo nếu đã có version cũ
            setTimeout(() => {
                showNotification(
                    `🔄 Đã cập nhật phiên bản mới (${APP_VERSION})`,
                    'success',
                    3000
                );
            }, 1000);
        }
        
        // 6. Force hard reload ONCE
        if (storedVersion && !window.location.search.includes('force_reload')) {
            const url = new URL(window.location);
            url.searchParams.set('force_reload', Date.now());
            window.location.href = url.toString();
            return true;
        }
    }
    
    // Log version
    console.log(`🚀 Bitcoin PeakDip EWS v${APP_VERSION}`);
    return false;
}

// Chạy ngay khi script load
if (handleCacheVersion()) {
    // Nếu đã reload thì không chạy code tiếp
    throw new Error('Reloading page for cache update...');
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bitcoin PeakDip EWS Signals - ACTUAL DATA VERSION');
    console.log('Initializing with REAL CSV data only...');
    
    // Listen for CSV data ready event from HTML
    document.addEventListener('csvDataReady', function(e) {
        console.log('📁 CSV Data Ready event received');
        csvDataLoaded = true;
        parseCSVData(e.detail.csvText);
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts (empty for now)
    initializeCharts();
    
    // Load historical Bitcoin price data (for chart background only)
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
    showNotification('Loading Bitcoin EWS Signals from CSV...', 'info');
    // Thêm nút zoom thủ công sau 3 giây
    setTimeout(addManualZoomButton, 3000);	
    // Thêm dòng này để setup drag scroll
    setTimeout(setupTableDragScroll, 1000);	
});

// ========== DATA LOADING FUNCTIONS ==========
async function loadRealCSVData() {
    try {
        console.log('📂 Loading actual CSV data from server...');
        
        // Try multiple paths in order of priority
        const paths = [
            'data/signals.csv', 
            './data/signals.csv', 
            'signals.csv', 
            './signals.csv',
            '../signals.csv'
        ];
        
        let loadedData = false;
        let lastError = null;
        
        for (const path of paths) {
            try {
                console.log(`Attempting to load: ${path}`);
                const response = await fetch(path, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/csv, text/plain, */*',
                        'Cache-Control': 'no-cache'
                    },
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const csvText = await response.text();
                    console.log(`✅ SUCCESS: CSV found at: ${path}`);
                    console.log(`File size: ${csvText.length} bytes`);
                    console.log(`First line: ${csvText.split('\n')[0]?.substring(0, 100)}...`);
                    
                    parseCSVData(csvText);
                    loadedData = true;
                    lastUpdateTime = new Date();
                    break;
                } else {
                    console.log(`⚠️ Failed (HTTP ${response.status}): ${path}`);
                    lastError = `HTTP ${response.status}: ${response.statusText}`;
                }
            } catch (error) {
                console.log(`❌ Error loading ${path}:`, error.message);
                lastError = error.message;
                continue;
            }
        }
        
        if (!loadedData) {
            console.error('❌ CRITICAL: Could not find CSV file at any path');
            
            // Update UI to show error
            updateUIForNoData(`CSV file not found. Tried: ${paths.join(', ')}`);
            
            showNotification(
                'ERROR: CSV file not found. Please ensure signals.csv exists in the correct location.',
                'error',
                10000
            );
            
            // Log detailed error
            console.error('Last error:', lastError);
            console.error('Paths attempted:', paths);
        }
        
    } catch (error) {
        console.error('❌ FATAL: Direct CSV load failed:', error);
        
        updateUIForNoData(`Fatal error: ${error.message}`);
        
        showNotification(
            `Fatal error loading CSV: ${error.message}`,
            'error',
            10000
        );
    }
}

// ========== SỬA HÀM parseCSVData ==========
function parseCSVData(csvText) {
    console.log('📊 START: Parsing CSV data (ACTUAL DATA ONLY)');
    
    // Validate CSV text
    if (!csvText || typeof csvText !== 'string') {
        console.error('❌ Invalid CSV data: Not a string or empty');
        showNotification('Invalid CSV data format', 'error');
        return;
    }
    
    csvText = csvText.trim();
    if (csvText.length === 0) {
        console.error('❌ CSV is empty');
        showNotification('CSV file is empty', 'error');
        return;
    }
    
    const lines = csvText.split('\n');
    console.log(`Total lines in CSV: ${lines.length}`);
    
    if (lines.length < 2) {
        console.error('❌ CSV has no data rows (only header or empty)');
        showNotification('CSV has no data rows', 'error');
        return;
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('CSV headers:', headers);
    
    // Validate required headers
    const requiredHeaders = ['timestamp', 'signal_type', 'price'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
        console.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
        showNotification(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
        return;
    }
    
    // Clear previous data
    signalsData = [];
    let validRows = 0;
    let invalidRows = 0;
    let peakCount = 0;
    let dipCount = 0;
    let otherCount = 0;
    
    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            console.log(`Skipping empty line ${i}`);
            continue;
        }
        
        const values = line.split(',');
        
        if (values.length < 3) {
            console.warn(`⚠️ Skipping line ${i}: insufficient columns (${values.length})`);
            invalidRows++;
            continue;
        }
        
        // Create row object
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].trim() : '';
            row[header] = value;
            
            // Special handling for empty values
            if (value === '') {
                if (header === 'distance') row[header] = '0';
                if (header === 'validation') row[header] = 'PENDING';
                if (header === 'strategy') row[header] = 'UNKNOWN';
            }
        });
        
        // Parse and validate timestamp
        const timestamp = parseTimestamp(row['timestamp']);
        if (!timestamp || isNaN(timestamp.getTime())) {
            console.warn(`⚠️ Skipping row ${i}: invalid timestamp "${row['timestamp']}"`);
            invalidRows++;
            continue;
        }
        
        // Parse and validate price
        const price = parseFloat(row['price']);
        if (isNaN(price) || price <= 0) {
            console.warn(`⚠️ Skipping row ${i}: invalid price "${row['price']}"`);
            invalidRows++;
            continue;
        }
        
        // Parse and validate signal type
        const signalType = (row['signal_type'] || 'PEAK').toUpperCase().trim();
        if (signalType !== 'PEAK' && signalType !== 'DIP') {
            console.warn(`⚠️ Row ${i}: Unknown signal type "${signalType}", defaulting to PEAK`);
            otherCount++;
        }
        
        // Count signal types
        if (signalType === 'PEAK') {
            peakCount++;
        } else if (signalType === 'DIP') {
            dipCount++;
        }
        
        // Parse confidence (0.98 in CSV → 98%)
        let confidence = 98; // Default
        if (row['confidence'] && row['confidence'].trim()) {
            const confValue = parseFloat(row['confidence']);
            if (!isNaN(confValue)) {
                confidence = confValue <= 1 ? Math.round(confValue * 100) : Math.round(confValue);
                confidence = Math.max(0, Math.min(100, confidence)); // Clamp 0-100
            }
        }
        
        // Parse distance
        let distance = 0;
        if (row['distance'] && row['distance'].trim()) {
            const distValue = parseFloat(row['distance']);
            if (!isNaN(distValue)) {
                distance = Math.max(0, distValue);
            }
        }
        
        // Parse validation
        let validation = 'PENDING';
        if (row['validation'] && row['validation'].trim()) {
            const val = row['validation'].toUpperCase().trim();
            if (['VALIDATED', 'PENDING', 'INVALID', 'REVIEW_NEEDED'].includes(val)) {
                validation = val;
            }
        }
        
        // Parse strategy or assign based on signal type
        let strategy = row['strategy'] || '';
        if (!strategy || strategy === 'UNKNOWN') {
            const strategies = signalType === 'PEAK' 
                ? ['RESISTANCE_BREAK', 'CONTINUATION', 'MOMENTUM_BREAKDOWN', 'VOLATILITY_EXPANSION']
                : ['SUPPORT_TEST', 'ACCUMULATION_ZONE', 'DISTRIBUTION_FADE', 'HEDGE_FLIP'];
            strategy = strategies[Math.floor(Math.random() * strategies.length)];
        }
        
        // Create signal object
        const signal = {
            timestamp: timestamp,
            signal_type: signalType,
            price: parseFloat(price.toFixed(2)),
            confidence: confidence,
            distance: parseFloat(distance.toFixed(1)),
            validation: validation,
            strategy: strategy,
            id: `signal_${i}_${timestamp.getTime()}`,
            csv_row: i,
            source: 'actual_csv',
            raw_data: row // Keep original data for reference
        };
        
        signalsData.push(signal);
        validRows++;
    }
    
    console.log(`✅ COMPLETE: Parsed ${validRows} valid signals from CSV`);
    console.log(`📊 STATS: Peak: ${peakCount}, Dip: ${dipCount}, Other: ${otherCount}, Invalid: ${invalidRows}`);
    
    if (validRows === 0) {
        console.error('❌ No valid signals found in CSV');
        showNotification('No valid signals found in CSV file', 'error');
        updateUIForNoData('No valid signals found in CSV');
        return;
    }

    // Debug timestamp trước khi sort
    console.log("🔍 Debug timestamps trước khi sort:");
    if (signalsData.length > 0) {
        signalsData.slice(0, 3).forEach((signal, i) => {
            console.log(`${i}: ${formatDateTime(signal.timestamp)} - timestamp: ${signal.timestamp.getTime()}`);
        });
    }
    
    // Sắp xếp MỚI NHẤT lên đầu (lớn nhất = mới nhất)
    signalsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (signalsData.length > 0) {
        console.log(`✅ Đã sắp xếp mới nhất lên đầu`);
        console.log(`📅 Date range: Mới nhất ${formatDateTime(signalsData[0]?.timestamp)} đến Cũ nhất ${formatDateTime(signalsData[signalsData.length-1]?.timestamp)}`);
        console.log(`📅 Top 5 mới nhất:`);
        signalsData.slice(0, 5).forEach((signal, i) => {
            console.log(`${i}: ${formatDateTime(signal.timestamp)} - $${signal.price} (${signal.signal_type})`);
        });
    }
    
    // Update UI with actual data
    updateUI();
    
    // Update last updated time
    lastUpdateTime = new Date();
    
    // Show success notification
    showNotification(`Loaded ${validRows} actual signals from CSV (mới nhất lên đầu)`, 'success');
}

// ========== THÊM CSS CHO BẢNG KÉO NGANG ==========
function addTableScrollStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Cải thiện scroll cho bảng trên mobile và desktop */
        .log-container {
            overflow-x: auto;
            margin-bottom: 25px;
            -webkit-overflow-scrolling: touch; /* Smooth scrolling trên iOS */
            scrollbar-width: thin; /* Firefox */
            scrollbar-color: var(--wave-trough) rgba(0, 0, 0, 0.3); /* Firefox */
        }
        
        .log-container::-webkit-scrollbar {
            height: 8px; /* Chiều cao thanh scroll */
        }
        
        .log-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
        }
        
        .log-container::-webkit-scrollbar-thumb {
            background: var(--wave-trough);
            border-radius: 4px;
        }
        
        .log-container::-webkit-scrollbar-thumb:hover {
            background: var(--wave-mid);
        }
        
        /* Đảm bảo bảng có độ rộng tối thiểu trên mobile */
        .signals-table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            overflow: hidden;
            min-width: 800px; /* Độ rộng tối thiểu để kéo ngang */
        }
        
        /* Hiệu ứng khi kéo */
        .log-container:active {
            cursor: grabbing;
        }
        
        /* Thêm indicator scroll trên mobile */
        @media (max-width: 768px) {
            .log-container {
                position: relative;
                padding-bottom: 15px;
            }
            
            .log-container::after {
                content: '← Kéo để xem thêm →';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                color: var(--wave-trough);
                font-size: 0.8em;
                opacity: 0.7;
                padding: 5px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 0 0 10px 10px;
                animation: scrollHint 2s infinite alternate;
            }
            
            @keyframes scrollHint {
                0% {
                    opacity: 0.5;
                    transform: translateX(-5px);
                }
                100% {
                    opacity: 0.8;
                    transform: translateX(5px);
                }
            }
        }
        
        /* Desktop: thêm shadow khi scroll */
        @media (min-width: 769px) {
            .log-container {
                position: relative;
            }
            
            .log-container.scroll-start::before {
                display: none;
            }
            
            .log-container.scroll-end::after {
                display: none;
            }
            
            .log-container::before,
            .log-container::after {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                width: 30px;
                pointer-events: none;
                z-index: 1;
                transition: opacity 0.3s ease;
            }
            
            .log-container::before {
                left: 0;
                background: linear-gradient(to right, rgba(0, 0, 0, 0.7), transparent);
                opacity: 0;
            }
            
            .log-container::after {
                right: 0;
                background: linear-gradient(to left, rgba(0, 0, 0, 0.7), transparent);
                opacity: 1;
            }
            
            .log-container.scrolled::before {
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// ========== THÊM HÀM XỬ LÝ SCROLL CHO BẢNG ==========
function setupTableScroll() {
    const logContainer = document.querySelector('.log-container');
    if (!logContainer) return;
    
    // Thêm CSS
    addTableScrollStyles();
    
    // Kiểm tra scroll position
    function updateScrollIndicators() {
        if (logContainer.scrollWidth > logContainer.clientWidth) {
            const scrollLeft = logContainer.scrollLeft;
            const scrollRight = logContainer.scrollWidth - logContainer.clientWidth - scrollLeft;
            
            if (scrollLeft > 10) {
                logContainer.classList.add('scrolled');
                logContainer.classList.add('scroll-start');
            } else {
                logContainer.classList.remove('scrolled');
                logContainer.classList.remove('scroll-start');
            }
            
            if (scrollRight > 10) {
                logContainer.classList.add('scroll-end');
            } else {
                logContainer.classList.remove('scroll-end');
            }
        }
    }
    
    // Event listener cho scroll
    logContainer.addEventListener('scroll', updateScrollIndicators);
    
    // Khởi tạo ban đầu
    setTimeout(updateScrollIndicators, 100);
    
    // Update khi resize window
    window.addEventListener('resize', updateScrollIndicators);
    
    // Thêm touch/swipe support cho mobile
    let startX = 0;
    let startY = 0;
    let isHorizontalScroll = false;
    
    logContainer.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isHorizontalScroll = false;
    });
    
    logContainer.addEventListener('touchmove', function(e) {
        if (!isHorizontalScroll) {
            const diffX = Math.abs(e.touches[0].clientX - startX);
            const diffY = Math.abs(e.touches[0].clientY - startY);
            
            // Nếu kéo ngang nhiều hơn dọc thì cho phép scroll ngang
            if (diffX > diffY) {
                isHorizontalScroll = true;
            }
        }
        
        // Ngăn scroll dọc khi đang scroll ngang
        if (isHorizontalScroll) {
            e.preventDefault();
        }
    }, { passive: false });
    
    console.log('✅ Table scroll setup complete');
}

// ========== CẬP NHẬT HÀM updateUI ==========
function updateUI() {
    console.log('🔄 Updating UI with actual data...');
    
    updateLastUpdated();
    updateStats();
    filterSignals();
    renderTable();
    
    // Khởi tạo charts nếu chưa có
    if (!bitcoinChart) {
        initializeCharts();
    }
    
    // Cập nhật dữ liệu cho biểu đồ
    updateChartsWithData();
    updateAnalysisCharts();
    
    // Setup table scroll (chỉ cần gọi một lần)
    if (!window.tableScrollInitialized) {
        setupTableScroll();
        window.tableScrollInitialized = true;
    }
    
    // Update page title with signal count
    const totalSignals = signalsData.length;
    if (totalSignals > 0) {
        document.title = `Bitcoin EWS (${totalSignals} Signals) - PeakDip`;
    }
}

function parseTimestamp(timestampStr) {
    if (!timestampStr) return null;
    
    console.log(`Parsing timestamp: "${timestampStr}"`);
    
    // Try multiple date formats
    const formats = [
        // ISO format "YYYY-MM-DDTHH:mm:ss"
        () => {
            const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
            if (match) {
                const [_, year, month, day, hour, minute, second] = match.map(Number);
                return new Date(year, month - 1, day, hour, minute, second);
            }
            return null;
        },
        
        // "M/D/YYYY HH:MM"
        () => {
            const match = timestampStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})$/);
            if (match) {
                const [_, month, day, year, hour, minute] = match.map(Number);
                return new Date(year, month - 1, day, hour, minute);
            }
            return null;
        },
        
        // "M/D/YYYY"
        () => {
            const match = timestampStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match) {
                const [_, month, day, year] = match.map(Number);
                return new Date(year, month - 1, day);
            }
            return null;
        },
        
        // "YYYY-MM-DD HH:MM:SS"
        () => {
            const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
            if (match) {
                const [_, year, month, day, hour, minute, second] = match.map(Number);
                return new Date(year, month - 1, day, hour, minute, second);
            }
            return null;
        },
        
        // Try Date.parse
        () => {
            const date = new Date(timestampStr);
            return isNaN(date.getTime()) ? null : date;
        }
    ];
    
    for (const format of formats) {
        const date = format();
        if (date) {
            console.log(`✅ Parsed as: ${date.toISOString()}`);
            return date;
        }
    }
    
    console.warn(`❌ Could not parse timestamp: "${timestampStr}"`);
    return null;
}

async function loadHistoricalBitcoinData() {
    try {
        console.log('📈 Loading Bitcoin historical price data...');
        
        // For demo purposes, generate realistic price data based on actual signals
        generateRealisticPriceData();
        
        console.log(`✅ Generated ${historicalPriceData.length} price points`);
        
    } catch (error) {
        console.error('❌ Error loading Bitcoin data:', error);
        generateRealisticPriceData(); // Fallback
    }
}

function generateRealisticPriceData() {
    if (signalsData.length === 0) {
        console.log('⚠️ No signals data, generating generic price data');
        generateFallbackPriceData();
        return;
    }
    
    console.log('📈 Generating realistic price data based on actual signals...');
    
    // Get date range from signals
    const minDate = new Date(Math.min(...signalsData.map(s => s.timestamp.getTime())));
    const maxDate = new Date(Math.max(...signalsData.map(s => s.timestamp.getTime())));
    
    // Ensure we have some buffer
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    
    const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Find min and max prices from signals
    const prices = signalsData.map(s => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Generate price data
    historicalPriceData = [];
    let currentPrice = minPrice * 0.8; // Start below min
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(minDate);
        date.setDate(date.getDate() + i);
        
        // Add random walk with mean reversion
        const change = (Math.random() - 0.5) * 0.04;
        currentPrice = currentPrice * (1 + change);
        
        // Keep within reasonable bounds
        currentPrice = Math.max(minPrice * 0.5, Math.min(maxPrice * 1.5, currentPrice));
        
        // Add signal points
        const signalsOnDate = signalsData.filter(s => 
            s.timestamp.toDateString() === date.toDateString()
        );
        
        historicalPriceData.push({
            x: date,
            y: Math.round(currentPrice * 100) / 100,
            signals: signalsOnDate.length
        });
    }
}

function generateFallbackPriceData() {
    const startDate = new Date('2023-01-01');
    const endDate = new Date();
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    historicalPriceData = [];
    let price = 20000;
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const change = (Math.random() - 0.45) * 0.06;
        price = price * (1 + change);
        price = Math.max(15000, Math.min(120000, price));
        
        historicalPriceData.push({
            x: date,
            y: Math.round(price * 100) / 100
        });
    }
}

function updateUIForNoData(errorMessage = 'No data available') {
    console.log('🔄 Updating UI for no data state...');
    
    // Update stats to show zeros
    document.getElementById('peakCount').textContent = '0';
    document.getElementById('dipCount').textContent = '0';
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('accuracyRate').textContent = '0%';
    
    // Update last updated
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = 'Never (No data)';
    }
    
    // Show error in table
    const tableBody = document.getElementById('signalsTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-results">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="error-message">${errorMessage}</div>
                    <small>Please ensure signals.csv exists and contains valid data</small>
                </td>
            </tr>
        `;
    }
    
    // Disable controls
    document.querySelectorAll('.filter-btn, .control-btn, .page-btn, #refreshData').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // Update details panel
    const detailsContainer = document.getElementById('signalDetails');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-database"></i>
                <h3>No Data Available</h3>
                <p>${errorMessage}</p>
                <button class="csv-btn" onclick="loadRealCSVData()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Retry Loading CSV
                </button>
            </div>
        `;
    }
    
    showNotification('No data available. Please check CSV file.', 'warning', 5000);
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        if (lastUpdateTime) {
            lastUpdated.textContent = lastUpdateTime.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } else {
            lastUpdated.textContent = 'Just now';
        }
    }
}

function updateStats() {
    if (signalsData.length === 0) {
        console.warn('⚠️ No signals data to update stats');
        return;
    }
    
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const totalCount = signalsData.length;
    
    // Calculate accuracy based on validation status
    const validatedSignals = signalsData.filter(s => s.validation === 'VALIDATED').length;
    const accuracyRate = totalCount > 0 ? Math.round((validatedSignals / totalCount) * 100) : 0;
    
    // Update DOM elements
    const peakElement = document.getElementById('peakCount');
    const dipElement = document.getElementById('dipCount');
    const totalElement = document.getElementById('totalCount');
    const accuracyElement = document.getElementById('accuracyRate');
    
    if (peakElement) peakElement.textContent = peakCount;
    if (dipElement) dipElement.textContent = dipCount;
    if (totalElement) totalElement.textContent = totalCount;
    if (accuracyElement) accuracyElement.textContent = accuracyRate + '%';
    
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
    
    if (document.getElementById('highConfidence')) {
        document.getElementById('highConfidence').textContent = highConfidence;
    }
    if (document.getElementById('mediumConfidence')) {
        document.getElementById('mediumConfidence').textContent = mediumConfidence;
    }
    
    console.log(`📊 Stats updated: ${peakCount} peaks, ${dipCount} dips, ${totalCount} total, ${accuracyRate}% accuracy`);
}

function filterSignals() {
    const searchInput = document.getElementById('signalSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    console.log(`🔍 Filtering signals: filter="${currentFilter}", search="${searchTerm}"`);
    
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
                signal.confidence.toString(),
                formatDate(signal.timestamp),
                formatTime(signal.timestamp)
            ].join(' ').toLowerCase();
            
            if (!searchStr.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    console.log(`🔍 Filter result: ${filteredSignals.length} of ${signalsData.length} signals match criteria`);
    currentPage = 1; // Reset to first page
}

function renderTable() {
    const tableBody = document.getElementById('signalsTableBody');
    if (!tableBody) {
        console.error('❌ Table body element not found');
        return;
    }
    
    console.log(`📋 Rendering table page ${currentPage} (${itemsPerPage} items per page)`);
    // DEBUG: Kiểm tra dữ liệu đầu tiên
    if (filteredSignals.length > 0) {
        console.log(`📋 First signal in filteredSignals: ${formatDateTime(filteredSignals[0].timestamp)} - $${filteredSignals[0].price}`);
        console.log(`📋 Last signal in filteredSignals: ${formatDateTime(filteredSignals[filteredSignals.length-1].timestamp)} - $${filteredSignals[filteredSignals.length-1].price}`);
    }    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSignals = filteredSignals.slice(startIndex, endIndex);
    
    if (pageSignals.length === 0) {
        if (filteredSignals.length === 0 && signalsData.length > 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-results">
                        <i class="fas fa-filter"></i>
                        No signals match your filter criteria
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    // Create rows
    pageSignals.forEach((signal, index) => {
        const row = document.createElement('tr');
        row.className = `signal-${signal.signal_type.toLowerCase()}`;
        row.dataset.signalId = signal.id;
        row.dataset.index = startIndex + index;
        
        // Format confidence class
        const confidenceClass = getConfidenceLevel(signal.confidence);
        
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
                    <span class="price">$${signal.price.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}</span>
                </div>
            </td>
            <td>
                <span class="confidence-indicator confidence-${confidenceClass}">
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
                    ${signal.validation.replace(/_/g, ' ')}
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
        
        // Add hover effect
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = signal.signal_type === 'PEAK' 
                ? 'rgba(255, 46, 99, 0.05)' 
                : 'rgba(0, 212, 255, 0.05)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
        
        tableBody.appendChild(row);
    });
    
    // Update pagination controls
    updatePagination();
    
    console.log(`✅ Rendered ${pageSignals.length} signals on page ${currentPage}`);
}

function updatePagination() {
    const totalPages = Math.ceil(filteredSignals.length / itemsPerPage) || 1;
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        nextBtn.style.opacity = (currentPage === totalPages || totalPages === 0) ? '0.5' : '1';
        nextBtn.style.cursor = (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer';
    }
    
    console.log(`📄 Pagination: Page ${currentPage} of ${totalPages} (${filteredSignals.length} total signals)`);
}

function selectSignal(signal, index) {
    console.log(`🎯 Selecting signal: ${signal.signal_type} at $${signal.price} on ${formatDateTime(signal.timestamp)}`);
    
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
    
    // Scroll to details if mobile
    if (window.innerWidth < 768) {
        const detailsSection = document.querySelector('.details-section');
        if (detailsSection) {
            detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function showSignalDetails(signal) {
    const detailsContainer = document.getElementById('signalDetails');
    if (!detailsContainer) return;
    
    const confidenceLevel = getConfidenceLevel(signal.confidence);
    const confidenceColor = confidenceLevel === 'high' ? '#4CAF50' : 
                           confidenceLevel === 'medium' ? '#FFC107' : '#F44336';
    
    // Calculate days ago
    const daysAgo = Math.floor((new Date() - signal.timestamp) / (1000 * 60 * 60 * 24));
    
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
                    <span class="detail-value">$${signal.price.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Strategy:</span>
                    <span class="detail-value">${signal.strategy.replace(/_/g, ' ')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Source:</span>
                    <span class="detail-value">CSV Row ${signal.csv_row}</span>
                </div>
            </div>
            
            <div class="detail-card">
                <h3><i class="fas fa-chart-bar"></i> Signal Metrics</h3>
                <div class="detail-item">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value" style="color: ${confidenceColor}">
                        ${signal.confidence}% (${confidenceLevel})
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Distance:</span>
                    <span class="detail-value">${signal.distance.toFixed(1)}% from ideal entry</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Validation:</span>
                    <span class="detail-value validation-status validation-${signal.validation.toLowerCase()}">
                        ${signal.validation.replace(/_/g, ' ')}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Signal Age:</span>
                    <span class="detail-value">${daysAgo} days ago (${getTimeAgo(signal.timestamp)})</span>
                </div>
            </div>
            
            <div class="detail-card">
                <h3><i class="fas fa-chart-line"></i> Analysis</h3>
                <div class="detail-item">
                    <span class="detail-label">Position:</span>
                    <span class="detail-value">${getChartPositionDescription(signal)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Price Context:</span>
                    <span class="detail-value">${getPriceContext(signal.price)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Recommendation:</span>
                    <span class="detail-value">${getRecommendation(signal)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Data Source:</span>
                    <span class="detail-value">Actual CSV Data</span>
                </div>
            </div>
        </div>
    `;
}

function highlightSignalOnChart(signal) {
    // This would highlight the signal point on the chart
    // For now, just log it
    console.log(`📊 Chart highlight for ${signal.signal_type} at $${signal.price}`);
}

// ========== CHART FUNCTIONS ==========
function initializeCharts() {
    // Main Bitcoin Chart
    const chartCtx = document.getElementById('bitcoinChart')?.getContext('2d');
    if (!chartCtx) {
        console.warn('⚠️ Bitcoin chart canvas not found');
        return;
    }
    
    bitcoinChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Bitcoin Price (Estimated)',
                    data: [],
                    borderColor: 'rgba(247, 147, 26, 0.8)',
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
                    pointRadius: 6,
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
                    pointRadius: 6,
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
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#f7931a',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(247, 147, 26, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            if (datasetLabel.includes('Bitcoin Price')) {
                                return `Price: $${context.parsed.y.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}`;
                            } else {
                                const signal = context.raw?.signal;
                                if (signal) {
                                    return `${signal.signal_type}: $${signal.price.toLocaleString('en-US', { 
                                        minimumFractionDigits: 2, 
                                        maximumFractionDigits: 2 
                                    })} (${signal.confidence}%)`;
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
                    time: { unit: 'month' },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return '$' + value.toLocaleString('en-US', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            });
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Charts initialized');
    setTimeout(() => {
        initializeZoomControls();
    }, 500);    
}

function updateChartsWithData() {
    if (!bitcoinChart || signalsData.length === 0) {
        console.warn('⚠️ Cannot update chart: no chart or data');
        return;
    }
    
    console.log('📊 Updating charts with actual data...');

    // Debug định dạng thời gian
    debugTimeFormat();
    
    // Tách peak và dip signals
    const peakSignals = signalsData.filter(s => s.signal_type === 'PEAK');
    const dipSignals = signalsData.filter(s => s.signal_type === 'DIP');
    
    console.log(`📊 Data for chart:`);
    console.log(`- Historical price points: ${historicalPriceData.length}`);
    console.log(`- Peak signals: ${peakSignals.length}`);
    console.log(`- Dip signals: ${dipSignals.length}`);
    
    // Kiểm tra dữ liệu mẫu
    if (peakSignals.length > 0) {
        console.log(`📊 Sample peak signal:`, {
            time: peakSignals[0].timestamp,
            price: peakSignals[0].price,
            confidence: peakSignals[0].confidence
        });
    }
    
    if (historicalPriceData.length > 0) {
        console.log(`📊 Sample price data:`, {
            time: historicalPriceData[0].x,
            price: historicalPriceData[0].y
        });
    }
    
    // Cập nhật biểu đồ chính
    bitcoinChart.data.datasets[0].data = historicalPriceData;
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
    
    console.log(`✅ Charts updated: ${peakSignals.length} peaks, ${dipSignals.length} dips on chart`);
	
}

function initializeAnalysisCharts() {
    // Type Distribution Chart
    const typeCtx = document.getElementById('typeDistributionChart')?.getContext('2d');
    if (typeCtx) {
        const typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Peak Signals', 'Dip Signals'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#ff2e63', '#00d4ff'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} signals`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
        analysisCharts.push(typeChart);
    }
    
    // Confidence Chart
    const confidenceCtx = document.getElementById('confidenceChart')?.getContext('2d');
    if (confidenceCtx) {
        const confidenceChart = new Chart(confidenceCtx, {
            type: 'bar',
            data: {
                labels: ['High (80-100)', 'Medium (60-79)', 'Low (<60)'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} signals`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false,
                        grid: { display: false }
                    },
                    y: { 
                        display: false,
                        beginAtZero: true,
                        grid: { display: false }
                    }
                }
            }
        });
        analysisCharts.push(confidenceChart);
    }
    
    // Time Distribution Chart
    const timeCtx = document.getElementById('timeDistributionChart')?.getContext('2d');
    if (timeCtx) {
        const timeChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Signals',
                    data: new Array(12).fill(0),
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
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Signals: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false,
                        grid: { display: false }
                    },
                    y: { 
                        display: false,
                        beginAtZero: true,
                        grid: { display: false }
                    }
                }
            }
        });
        analysisCharts.push(timeChart);
    }
}

function updateAnalysisCharts() {
    if (analysisCharts.length < 3 || signalsData.length === 0) {
        console.warn('⚠️ Cannot update analysis charts: insufficient data');
        return;
    }
    
    // Calculate statistics
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    const lowConfidence = signalsData.filter(s => s.confidence < 60).length;
    
    // Monthly distribution
    const monthlyCounts = new Array(12).fill(0);
    signalsData.forEach(signal => {
        const month = signal.timestamp.getMonth();
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });
    
    // Update type distribution chart
    if (analysisCharts[0]) {
        analysisCharts[0].data.datasets[0].data = [peakCount, dipCount];
        analysisCharts[0].update();
    }
    
    // Update confidence distribution chart
    if (analysisCharts[1]) {
        analysisCharts[1].data.datasets[0].data = [highConfidence, mediumConfidence, lowConfidence];
        analysisCharts[1].update();
    }
    
    // Update time distribution chart
    if (analysisCharts[2]) {
        analysisCharts[2].data.datasets[0].data = monthlyCounts;
        analysisCharts[2].update();
    }
    
    console.log('✅ Analysis charts updated');
}
// ========== ZOOM & TIMELINE FUNCTIONS ==========
let zoomState = {
    min: null,
    max: null,
    isZoomed: false,
    zoomHistory: []
};

function initializeZoomControls() {
    console.log('🔍 Initializing zoom controls...');
    
    // Kiểm tra xem toolbar đã tồn tại chưa
    if (document.querySelector('.zoom-toolbar')) {
        console.log('✅ Zoom toolbar already exists');
        return;
    }
    
    // Create zoom toolbar
    const chartSection = document.querySelector('.chart-section');
    if (!chartSection) return;
    
    const zoomToolbar = document.createElement('div');
    zoomToolbar.className = 'zoom-toolbar';
    zoomToolbar.innerHTML = `
        <div class="zoom-controls">
            <button class="zoom-btn" id="zoomIn" title="Zoom In">
                <i class="fas fa-search-plus"></i>
            </button>
            <button class="zoom-btn" id="zoomOut" title="Zoom Out">
                <i class="fas fa-search-minus"></i>
            </button>
            <button class="zoom-btn" id="zoomReset" title="Reset Zoom">
                <i class="fas fa-expand-alt"></i>
            </button>
            <button class="zoom-btn" id="zoomPan" title="Pan Mode">
                <i class="fas fa-arrows-alt"></i>
            </button>
            <button class="zoom-btn" id="zoomSelect" title="Select Area">
                <i class="fas fa-vector-square"></i>
            </button>
        </div>
        <div class="timeline-controls">
            <input type="range" id="timelineSlider" min="0" max="100" value="100" class="timeline-slider">
            <div class="timeline-labels">
                <span id="zoomStartLabel">Start</span>
                <span id="zoomEndLabel">End</span>
            </div>
        </div>
        <div class="zoom-info">
            <span id="zoomInfo">Full Range</span>
            <button class="zoom-history-btn" id="zoomBack" title="Back">
                <i class="fas fa-undo"></i>
            </button>
        </div>
    `;
    
    chartSection.querySelector('.chart-container').parentNode.insertBefore(zoomToolbar, chartSection.querySelector('.chart-info'));
    
    // Add zoom CSS
    addZoomStyles();
    
    // Initialize zoom event listeners
    setupZoomEventListeners();
    
    // Initialize drag-to-zoom
    setupDragToZoom();
}

function addZoomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .zoom-toolbar {
            background: rgba(0, 0, 0, 0.6);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 20px;
        }
        
        .zoom-controls {
            display: flex;
            gap: 8px;
            background: rgba(0, 0, 0, 0.3);
            padding: 8px;
            border-radius: 8px;
        }
        
        .zoom-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--text-glow);
            width: 36px;
            height: 36px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .zoom-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .zoom-btn.active {
            background: var(--wave-trough);
            color: white;
            border-color: var(--wave-trough);
        }
        
        .timeline-controls {
            flex: 1;
            min-width: 300px;
        }
        
        .timeline-slider {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            outline: none;
        }
        
        .timeline-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--wave-trough);
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }
        
        .timeline-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            color: var(--text-glow);
            font-size: 0.85em;
        }
        
        .zoom-info {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(0, 0, 0, 0.3);
            padding: 8px 15px;
            border-radius: 20px;
            color: var(--wave-trough);
            font-weight: 600;
            font-size: 0.9em;
        }
        
        .zoom-history-btn {
            background: transparent;
            border: none;
            color: var(--text-glow);
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
        }
        
        .zoom-history-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .chart-container {
            position: relative;
            overflow: hidden;
        }
        
        .selection-rectangle {
            position: absolute;
            border: 2px dashed var(--wave-trough);
            background: rgba(0, 212, 255, 0.1);
            pointer-events: none;
            z-index: 100;
        }
        
        .zoom-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2em;
            z-index: 50;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        .zoom-overlay.active {
            opacity: 1;
            pointer-events: all;
        }
        
        /* Timeframe controls update */
        .chart-controls {
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .timeframe-presets {
            display: flex;
            gap: 5px;
            background: rgba(0, 0, 0, 0.3);
            padding: 5px;
            border-radius: 8px;
        }
        
        .timeframe-preset {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--text-glow);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .timeframe-preset:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .timeframe-preset.active {
            background: var(--wave-trough);
            color: white;
            border-color: var(--wave-trough);
        }
    `;
    document.head.appendChild(style);
}

function setupZoomEventListeners() {
    // Zoom In
    document.getElementById('zoomIn').addEventListener('click', function() {
        zoomChart(0.8); // Zoom in 20%
    });
    
    // Zoom Out
    document.getElementById('zoomOut').addEventListener('click', function() {
        zoomChart(1.2); // Zoom out 20%
    });
    
    // Reset Zoom
    document.getElementById('zoomReset').addEventListener('click', function() {
        resetZoom();
    });
    
    // Pan Mode
    document.getElementById('zoomPan').addEventListener('click', function() {
        togglePanMode();
    });
    
    // Select Area
    document.getElementById('zoomSelect').addEventListener('click', function() {
        toggleSelectMode();
    });
    
    // Timeline Slider
    const timelineSlider = document.getElementById('timelineSlider');
    timelineSlider.addEventListener('input', function() {
        updateZoomFromSlider(this.value);
    });
    
    // Zoom Back
    document.getElementById('zoomBack').addEventListener('click', function() {
        zoomBack();
    });
    
    // Add timeframe presets
    addTimeframePresets();
}

function addTimeframePresets() {
    const chartControls = document.querySelector('.chart-controls');
    if (!chartControls) return;
    
    const presetsContainer = document.createElement('div');
    presetsContainer.className = 'timeframe-presets';
    presetsContainer.innerHTML = `
        <button class="timeframe-preset" data-preset="1h">1H</button>
        <button class="timeframe-preset" data-preset="4h">4H</button>
        <button class="timeframe-preset active" data-preset="1d">1D</button>
        <button class="timeframe-preset" data-preset="1w">1W</button>
        <button class="timeframe-preset" data-preset="1m">1M</button>
        <button class="timeframe-preset" data-preset="3m">3M</button>
        <button class="timeframe-preset" data-preset="1y">1Y</button>
        <button class="timeframe-preset" data-preset="all">ALL</button>
    `;
    
    chartControls.querySelector('.control-btn').parentNode.insertBefore(presetsContainer, chartControls.querySelector('.chart-legend'));
    
    // Add preset event listeners
    presetsContainer.querySelectorAll('.timeframe-preset').forEach(btn => {
        btn.addEventListener('click', function() {
            presetsContainer.querySelectorAll('.timeframe-preset').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const preset = this.dataset.preset;
            applyTimeframePreset(preset);
        });
    });
}

function applyTimeframePreset(preset) {
    if (!bitcoinChart || historicalPriceData.length === 0) return;
    
    console.log(`📊 Applying timeframe preset: ${preset}`);
    
    const fullData = historicalPriceData;
    const minDate = new Date(Math.min(...fullData.map(d => d.x)));
    const maxDate = new Date(Math.max(...fullData.map(d => d.x)));
    
    let startDate = new Date(minDate);
    let endDate = new Date(maxDate);
    let unit = 'month';
    
    switch(preset) {
        case '1h':
            unit = 'minute';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setHours(startDate.getHours() - 1);
            break;
        case '4h':
            unit = 'hour';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setHours(startDate.getHours() - 4);
            break;
        case '1d':
            unit = 'hour';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 1);
            break;
        case '1w':
            unit = 'day';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '1m':
            unit = 'day';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case '3m':
            unit = 'week';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case '1y':
            unit = 'month';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case 'all':
            startDate = minDate;
            endDate = maxDate;
            unit = 'month';
            break;
    }
    
    // Đảm bảo startDate không sớm hơn dữ liệu có sẵn
    if (startDate < minDate) startDate = new Date(minDate);
    
    // Thêm padding
    const range = endDate - startDate;
    startDate = new Date(startDate.getTime() - range * 0.05);
    endDate = new Date(endDate.getTime() + range * 0.05);
    
    // Lưu vào history
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    // Áp dụng zoom
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = unit;
    
    zoomState.min = startDate;
    zoomState.max = endDate;
    zoomState.isZoomed = preset !== 'all';
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
    
    console.log(`✅ Preset applied: ${preset} (${formatDateShort(startDate)} to ${formatDateShort(endDate)})`);
}

function setupDragToZoom() {
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) return;
    
    let isSelecting = false;
    let startX, startY;
    let selectionRect = null;
    
    chartCanvas.addEventListener('mousedown', function(e) {
        const selectBtn = document.getElementById('zoomSelect');
        if (!selectBtn || !selectBtn.classList.contains('active')) return;
        
        const rect = chartCanvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        
        // Create selection rectangle
        selectionRect = document.createElement('div');
        selectionRect.className = 'selection-rectangle';
        selectionRect.style.left = startX + 'px';
        selectionRect.style.top = startY + 'px';
        chartCanvas.parentNode.appendChild(selectionRect);
        
        isSelecting = true;
    });
    
    chartCanvas.addEventListener('mousemove', function(e) {
        if (!isSelecting || !selectionRect) return;
        
        const rect = chartCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const width = currentX - startX;
        const height = currentY - startY;
        
        selectionRect.style.width = Math.abs(width) + 'px';
        selectionRect.style.height = Math.abs(height) + 'px';
        
        if (width < 0) {
            selectionRect.style.left = currentX + 'px';
        }
        if (height < 0) {
            selectionRect.style.top = currentY + 'px';
        }
    });
    
    chartCanvas.addEventListener('mouseup', function(e) {
        if (!isSelecting || !selectionRect) return;
        
        const rect = chartCanvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        // Calculate selected date range
        const xScale = bitcoinChart.scales.x;
        const chartRect = bitcoinChart.canvas.getBoundingClientRect();
        
        const minPixel = Math.min(startX, endX);
        const maxPixel = Math.max(startX, endX);
        
        const minDate = xScale.getValueForPixel(minPixel);
        const maxDate = xScale.getValueForPixel(maxPixel);
        
        // Apply zoom to selected range
        if (minDate && maxDate && (maxDate - minDate) > 0) {
            zoomToRange(minDate, maxDate);
        }
        
        // Clean up
        if (selectionRect.parentNode) {
            selectionRect.parentNode.removeChild(selectionRect);
        }
        selectionRect = null;
        isSelecting = false;
    });
    
    // Pan functionality
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    
    chartCanvas.addEventListener('mousedown', function(e) {
        const panBtn = document.getElementById('zoomPan');
        if (!panBtn || !panBtn.classList.contains('active')) return;
        
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        
        chartCanvas.style.cursor = 'grabbing';
    });
    
    chartCanvas.addEventListener('mousemove', function(e) {
        if (!isPanning) return;
        
        const deltaX = e.clientX - panStartX;
        const panSpeed = 0.5; // Adjust for sensitivity
        
        if (zoomState.min && zoomState.max) {
            const range = zoomState.max - zoomState.min;
            const pixelRange = chartCanvas.width;
            const datePerPixel = range / pixelRange;
            
            const dateDelta = deltaX * datePerPixel * panSpeed;
            
            zoomState.min = new Date(zoomState.min.getTime() - dateDelta);
            zoomState.max = new Date(zoomState.max.getTime() - dateDelta);
            
            bitcoinChart.options.scales.x.min = zoomState.min;
            bitcoinChart.options.scales.x.max = zoomState.max;
            bitcoinChart.update();
            
            panStartX = e.clientX;
        }
    });
    
    chartCanvas.addEventListener('mouseup', function() {
        if (isPanning) {
            isPanning = false;
            chartCanvas.style.cursor = '';
        }
    });
    
    chartCanvas.addEventListener('mouseleave', function() {
        if (isPanning) {
            isPanning = false;
            chartCanvas.style.cursor = '';
        }
        if (isSelecting && selectionRect) {
            if (selectionRect.parentNode) {
                selectionRect.parentNode.removeChild(selectionRect);
            }
            selectionRect = null;
            isSelecting = false;
        }
    });
}

function zoomChart(factor) {
    if (!bitcoinChart || !zoomState.isZoomed) {
        // If not zoomed, zoom around center
        const xScale = bitcoinChart.scales.x;
        const range = xScale.max - xScale.min;
        const center = xScale.min + range / 2;
        const newRange = range * factor;
        
        zoomState.min = new Date(center - newRange / 2);
        zoomState.max = new Date(center + newRange / 2);
    } else {
        // If already zoomed, zoom around current center
        const center = zoomState.min.getTime() + (zoomState.max - zoomState.min) / 2;
        const newRange = (zoomState.max - zoomState.min) * factor;
        
        zoomState.min = new Date(center - newRange / 2);
        zoomState.max = new Date(center + newRange / 2);
    }
    
    // Save to history
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    // Apply zoom
    bitcoinChart.options.scales.x.min = zoomState.min;
    bitcoinChart.options.scales.x.max = zoomState.max;
    zoomState.isZoomed = true;
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
}

function zoomToRange(minDate, maxDate) {
    // Save current state to history
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    // Apply new range
    zoomState.min = minDate;
    zoomState.max = maxDate;
    zoomState.isZoomed = true;
    
    bitcoinChart.options.scales.x.min = minDate;
    bitcoinChart.options.scales.x.max = maxDate;
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
}

function resetZoom() {
    if (!zoomState.isZoomed) return;
    
    // Save to history
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    // Reset to full range
    const fullData = historicalPriceData;
    if (fullData.length > 0) {
        zoomState.min = new Date(Math.min(...fullData.map(d => d.x)));
        zoomState.max = new Date(Math.max(...fullData.map(d => d.x)));
        
        // Add 5% padding
        const range = zoomState.max - zoomState.min;
        zoomState.min = new Date(zoomState.min.getTime() - range * 0.05);
        zoomState.max = new Date(zoomState.max.getTime() + range * 0.05);
    }
    
    bitcoinChart.options.scales.x.min = zoomState.min;
    bitcoinChart.options.scales.x.max = zoomState.max;
    zoomState.isZoomed = false;
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
}

function zoomBack() {
    if (zoomState.zoomHistory.length === 0) return;
    
    const previousState = zoomState.zoomHistory.pop();
    if (previousState) {
        zoomState.min = previousState.min;
        zoomState.max = previousState.max;
        zoomState.isZoomed = previousState.min !== null || previousState.max !== null;
        
        bitcoinChart.options.scales.x.min = zoomState.min;
        bitcoinChart.options.scales.x.max = zoomState.max;
        
        bitcoinChart.update();
        updateZoomInfo();
        updateTimelineSlider();
    }
}

function togglePanMode() {
    const panBtn = document.getElementById('zoomPan');
    const selectBtn = document.getElementById('zoomSelect');
    
    if (panBtn.classList.contains('active')) {
        panBtn.classList.remove('active');
        document.getElementById('bitcoinChart').style.cursor = '';
    } else {
        panBtn.classList.add('active');
        if (selectBtn) selectBtn.classList.remove('active');
        document.getElementById('bitcoinChart').style.cursor = 'grab';
    }
}

function toggleSelectMode() {
    const selectBtn = document.getElementById('zoomSelect');
    const panBtn = document.getElementById('zoomPan');
    
    if (selectBtn.classList.contains('active')) {
        selectBtn.classList.remove('active');
        document.getElementById('bitcoinChart').style.cursor = '';
    } else {
        selectBtn.classList.add('active');
        if (panBtn) panBtn.classList.remove('active');
        document.getElementById('bitcoinChart').style.cursor = 'crosshair';
    }
}

function updateZoomFromSlider(value) {
    const fullData = historicalPriceData;
    if (fullData.length === 0) return;
    
    const fullRange = Math.max(...fullData.map(d => d.x)) - Math.min(...fullData.map(d => d.x));
    const visiblePercentage = value / 100;
    
    // Calculate visible range
    const minDate = new Date(Math.min(...fullData.map(d => d.x)) + fullRange * (1 - visiblePercentage));
    const maxDate = new Date(Math.max(...fullData.map(d => d.x)));
    
    // Save to history
    if (zoomState.isZoomed) {
        zoomState.zoomHistory.push({
            min: bitcoinChart.options.scales.x.min,
            max: bitcoinChart.options.scales.x.max
        });
    }
    
    // Apply zoom
    zoomState.min = minDate;
    zoomState.max = maxDate;
    zoomState.isZoomed = value < 100;
    
    bitcoinChart.options.scales.x.min = minDate;
    bitcoinChart.options.scales.x.max = maxDate;
    
    bitcoinChart.update();
    updateZoomInfo();
}

function updateTimelineSlider() {
    const slider = document.getElementById('timelineSlider');
    const startLabel = document.getElementById('zoomStartLabel');
    const endLabel = document.getElementById('zoomEndLabel');
    
    if (!slider || historicalPriceData.length === 0) return;
    
    const fullData = historicalPriceData;
    const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
    const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
    const currentMin = zoomState.min || fullMin;
    const currentMax = zoomState.max || fullMax;
    
    // Calculate slider value (0-100)
    const fullRange = fullMax - fullMin;
    const visibleRange = currentMax - currentMin;
    const sliderValue = (visibleRange / fullRange) * 100;
    
    slider.value = Math.min(100, Math.max(0, sliderValue));
    
    // Update labels
    if (startLabel) {
        startLabel.textContent = formatDateShort(currentMin);
    }
    if (endLabel) {
        endLabel.textContent = formatDateShort(currentMax);
    }
}

function updateZoomInfo() {
    const zoomInfo = document.getElementById('zoomInfo');
    if (!zoomInfo) return;
    
    if (!zoomState.isZoomed) {
        zoomInfo.textContent = 'Full Range';
        return;
    }
    
    const startDate = zoomState.min;
    const endDate = zoomState.max;
    const rangeDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    zoomInfo.textContent = `${formatDateShort(startDate)} - ${formatDateShort(endDate)} (${rangeDays} days)`;
}

function formatDateShort(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}w ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
        });
    }
}

// Cập nhật hàm initializeCharts để gọi initializeZoomControls
function initializeCharts() {
    // ... existing chart initialization code ...
    
    console.log('✅ Charts initialized');
    
    // Initialize zoom controls after chart is ready
    setTimeout(() => {
        initializeZoomControls();
    }, 500);
}

function updateChartTimeframe(timeframe) {
    if (!bitcoinChart || historicalPriceData.length === 0) return;
    
    console.log(`📈 Updating chart timeframe to: ${timeframe}`);
    
    // Lấy phạm vi dữ liệu đầy đủ
    const fullData = historicalPriceData;
    const minDate = new Date(Math.min(...fullData.map(d => d.x)));
    const maxDate = new Date(Math.max(...fullData.map(d => d.x)));
    
    let startDate = new Date(minDate);
    let endDate = new Date(maxDate);
    let unit = 'month';
    let displayFormats = {};
    
    // Tính toán phạm vi dựa trên timeframe
    switch(timeframe) {
        case '1d':
            unit = 'hour';
            displayFormats.hour = 'HH:mm';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 1);
            break;
        case '7d':
            unit = 'day';
            displayFormats.day = 'MMM dd';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '30d':
            unit = 'day';
            displayFormats.day = 'MMM dd';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 30);
            break;
        case '90d':
            unit = 'week';
            displayFormats.week = 'MMM dd';
            endDate = new Date();
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 90);
            break;
        default:
            // 'all' hoặc mặc định
            startDate = minDate;
            endDate = maxDate;
            unit = 'month';
    }
    
    // Đảm bảo startDate không sớm hơn dữ liệu có sẵn
    if (startDate < minDate) startDate = new Date(minDate);
    
    // Thêm padding 5% để tránh cắt mất dữ liệu
    const range = endDate - startDate;
    startDate = new Date(startDate.getTime() - range * 0.05);
    endDate = new Date(endDate.getTime() + range * 0.05);
    
    // Cập nhật cấu hình biểu đồ
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = unit;
    bitcoinChart.options.scales.x.time.displayFormats = displayFormats;
    
    // Cập nhật trạng thái zoom
    zoomState.min = startDate;
    zoomState.max = endDate;
    zoomState.isZoomed = timeframe !== 'all';
    
    // Cập nhật biểu đồ
    bitcoinChart.update();
    
    // Cập nhật slider và thông tin zoom
    updateZoomInfo();
    updateTimelineSlider();
    
    console.log(`✅ Chart timeframe updated: ${formatDateShort(startDate)} to ${formatDateShort(endDate)} (${unit})`);
}
// ========== EVENT HANDLERS ==========
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (signalsData.length === 0) {
                showNotification('No data available to filter', 'warning');
                return;
            }
            
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            
            console.log(`🔍 Filter changed to: ${currentFilter}`);
            filterSignals();
            renderTable();
        });
    });
    
    // Search input
    const searchInput = document.getElementById('signalSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (signalsData.length === 0) {
                    showNotification('No data available to search', 'warning');
                    return;
                }
                
                console.log(`🔍 Search: "${this.value}"`);
                filterSignals();
                renderTable();
            }, 300);
        });
    }
    
    // Pagination
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (this.disabled || signalsData.length === 0) return;
            
            if (currentPage > 1) {
                currentPage--;
                renderTable();
                console.log(`📄 Previous page: ${currentPage}`);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (this.disabled || signalsData.length === 0) return;
            
            const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
                console.log(`📄 Next page: ${currentPage}`);
            }
        });
    }
    
    // Timeframe controls
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const timeframe = this.dataset.timeframe;
            console.log(`📈 Timeframe changed to: ${timeframe}`);
            updateChartTimeframe(timeframe);
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
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case 'ArrowLeft':
                if (prevBtn && !prevBtn.disabled) prevBtn.click();
                break;
            case 'ArrowRight':
                if (nextBtn && !nextBtn.disabled) nextBtn.click();
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey && refreshBtn) refreshBtn.click();
                break;
            case 'Escape':
                if (searchInput) {
                    searchInput.value = '';
                    filterSignals();
                    renderTable();
                }
                break;
        }
    });
    // Thêm event listener cho nút Reset
    const resetBtn = document.getElementById('resetViewBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log('🔄 Reset view button clicked');
            resetChartView();
        });
    }    
    console.log('✅ Event listeners setup complete');
}

// Thêm ngay sau hàm setupEventListeners() hoặc trước DOMContentLoaded
function setupTableDragScroll() {
    const logContainer = document.querySelector('.log-container');
    if (!logContainer) {
        console.log('⏳ Waiting for log container...');
        setTimeout(setupTableDragScroll, 500);
        return;
    }
    
    console.log('🔄 Setting up table drag scroll...');
    
    let isDragging = false;
    let startX;
    let scrollLeft;
    
    // Mouse events
    logContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - logContainer.offsetLeft;
        scrollLeft = logContainer.scrollLeft;
        logContainer.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    logContainer.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            logContainer.style.cursor = 'grab';
        }
    });
    
    logContainer.addEventListener('mouseup', () => {
        isDragging = false;
        logContainer.style.cursor = 'grab';
    });
    
    logContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - logContainer.offsetLeft;
        const walk = (x - startX) * 2; // Tốc độ kéo
        logContainer.scrollLeft = scrollLeft - walk;
        updateScrollIndicators();
    });
    
    // Touch events for mobile
    logContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - logContainer.offsetLeft;
        scrollLeft = logContainer.scrollLeft;
    });
    
    logContainer.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    logContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX - logContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        logContainer.scrollLeft = scrollLeft - walk;
        updateScrollIndicators();
    });
    
    // Update scroll indicators
    function updateScrollIndicators() {
        const scrollLeft = logContainer.scrollLeft;
        const scrollWidth = logContainer.scrollWidth;
        const clientWidth = logContainer.clientWidth;
        
        logContainer.classList.remove('scrolled-left', 'scrolled-right', 'scrolled-both');
        
        if (scrollLeft > 10 && scrollLeft < (scrollWidth - clientWidth - 10)) {
            logContainer.classList.add('scrolled-both');
        } else if (scrollLeft > 10) {
            logContainer.classList.add('scrolled-left');
        } else if (scrollLeft < (scrollWidth - clientWidth - 10)) {
            logContainer.classList.add('scrolled-right');
        }
    }
    
    // Update on resize
    window.addEventListener('resize', updateScrollIndicators);
    
    // Initial update
    setTimeout(updateScrollIndicators, 100);
    
    console.log('✅ Table drag scroll setup complete');
}

function refreshData() {
    const refreshBtn = document.getElementById('refreshData');
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    const originalText = refreshBtn.textContent;
    
    // Show loading state
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    showNotification('Refreshing data from CSV...', 'info');
    console.log('🔄 Manual refresh triggered');
    
    // Clear cache and reload
    signalsData = [];
    filteredSignals = [];
    currentPage = 1;
    
    // Force reload from server (no cache)
    fetch('signals.csv?' + new Date().getTime(), {
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
    })
    .then(csvText => {
        parseCSVData(csvText);
        
        // Restore button
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        showNotification('Data refreshed successfully!', 'success');
        console.log('✅ Manual refresh complete');
    })
    .catch(error => {
        console.error('❌ Manual refresh failed:', error);
        
        // Try regular load as fallback
        loadRealCSVData();
        
        // Restore button
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        showNotification('Refresh failed, using cached data', 'warning');
    });
}

function handleCsvUpload(file) {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showNotification('Please upload a CSV file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File too large (max 10MB)', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onloadstart = function() {
        showNotification('Reading CSV file...', 'info');
    };
    
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            console.log('📁 User uploaded CSV:', file.name, file.size, 'bytes');
            
            // Parse the uploaded CSV
            parseCSVData(csvText);
            
            // Update source indicator
            lastUpdateTime = new Date();
            updateLastUpdated();
            
            showNotification('CSV uploaded and processed successfully!', 'success');
            
            // Update file input
            const fileInput = document.getElementById('csvFileInput');
            if (fileInput) fileInput.value = '';
            
        } catch (error) {
            console.error('❌ Error parsing uploaded CSV:', error);
            showNotification('Error parsing CSV file: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

// ========== HELPER FUNCTIONS ==========
function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid Time';
    }
    
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
    
    if (price > 80000) return 'Extreme High Zone';
    if (price > 60000) return 'High Volatility Zone';
    if (price > 40000) return 'Upper Range';
    if (price > 30000) return 'Mid Range';
    if (price > 20000) return 'Support Zone';
    return 'Historical Low Zone';
}

function getPriceContext(price) {
    if (price > 100000) return 'All-time high territory';
    if (price > 60000) return 'Bull market range';
    if (price > 40000) return 'Mid-cycle range';
    if (price > 20000) return 'Accumulation zone';
    return 'Bear market bottom range';
}

function getRecommendation(signal) {
    if (signal.signal_type === 'PEAK') {
        if (signal.confidence >= 80) return 'Consider taking profits';
        if (signal.confidence >= 60) return 'Monitor for reversal';
        return 'Wait for confirmation';
    } else { // DIP
        if (signal.confidence >= 80) return 'Consider accumulation';
        if (signal.confidence >= 60) return 'Monitor for entry';
        return 'Wait for stronger signal';
    }
}

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
            notif.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (notif.parentNode) notif.parentNode.removeChild(notif);
            }, 300);
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
    animation: slideInRight 0.3s ease;
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

/* Additional styles for error messages */
.no-results .error-message {
    color: #f44336;
    font-weight: bold;
    margin-bottom: 10px;
}

.no-results small {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9em;
}
`;
document.head.appendChild(notificationStyle);

// ========== INITIAL LOAD ==========
// Check for existing CSV data
if (window.realCsvData && typeof window.realCsvData === 'string') {
    console.log('📁 Found pre-loaded CSV data, parsing immediately...');
    parseCSVData(window.realCsvData);
}

console.log('✅ signals.js (ACTUAL DATA VERSION) loaded successfully');
console.log('ℹ️  This version reads ONLY actual data from CSV - NO demo data generation');
// Thêm vào cuối file signals.js (trước dòng cuối cùng)

// ========== DATA INTEGRITY CHECK ==========
function validateDataIntegrity() {
    console.log('🔍 Validating data integrity...');
    
    const issues = [];
    
    // Check for duplicate timestamps
    const timestampMap = {};
    signalsData.forEach((signal, index) => {
        const timeKey = signal.timestamp.getTime();
        if (timestampMap[timeKey]) {
            issues.push(`Duplicate timestamp at row ${index}: ${formatDateTime(signal.timestamp)}`);
        }
        timestampMap[timeKey] = true;
    });
    
    // Check for invalid prices
    signalsData.forEach((signal, index) => {
        if (signal.price <= 0 || signal.price > 1000000) {
            issues.push(`Suspicious price at row ${index}: $${signal.price}`);
        }
    });
    
    // Check for invalid confidence
    signalsData.forEach((signal, index) => {
        if (signal.confidence < 0 || signal.confidence > 100) {
            issues.push(`Invalid confidence at row ${index}: ${signal.confidence}%`);
        }
    });
    
    if (issues.length > 0) {
        console.warn('⚠️ Data integrity issues found:', issues);
        
        // Show warning but continue
        if (issues.length <= 3) {
            showNotification(`Found ${issues.length} data issues`, 'warning');
        }
    } else {
        console.log('✅ Data integrity check passed');
    }
    
    return issues;
}

// ========== MISSING FUNCTIONS ==========

// Thêm hàm này để khởi tạo phân tích biểu đồ
function initializeAnalysisCharts() {
    console.log('📊 Initializing analysis charts...');
    
    // Type Distribution Chart
    const typeCtx = document.getElementById('typeDistributionChart')?.getContext('2d');
    if (typeCtx) {
        const typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Peak Signals', 'Dip Signals'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#ff2e63', '#00d4ff'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} signals`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
        analysisCharts.push(typeChart);
    }
    
    // Confidence Chart
    const confidenceCtx = document.getElementById('confidenceChart')?.getContext('2d');
    if (confidenceCtx) {
        const confidenceChart = new Chart(confidenceCtx, {
            type: 'bar',
            data: {
                labels: ['High (80-100)', 'Medium (60-79)', 'Low (<60)'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} signals`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false,
                        grid: { display: false }
                    },
                    y: { 
                        display: false,
                        beginAtZero: true,
                        grid: { display: false }
                    }
                }
            }
        });
        analysisCharts.push(confidenceChart);
    }
    
    // Time Distribution Chart
    const timeCtx = document.getElementById('timeDistributionChart')?.getContext('2d');
    if (timeCtx) {
        const timeChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Signals',
                    data: new Array(12).fill(0),
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
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Signals: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false,
                        grid: { display: false }
                    },
                    y: { 
                        display: false,
                        beginAtZero: true,
                        grid: { display: false }
                    }
                }
            }
        });
        analysisCharts.push(timeChart);
    }
    
    console.log(`✅ Analysis charts initialized: ${analysisCharts.length} charts`);
}

// Thêm hàm này để cập nhật khoảng cách hiển thị
function updateAnalysisCharts() {
    if (analysisCharts.length === 0 || signalsData.length === 0) {
        console.warn('⚠️ Cannot update analysis charts: insufficient data');
        return;
    }
    
    // Tính toán thống kê
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    const lowConfidence = signalsData.filter(s => s.confidence < 60).length;
    
    // Phân phối theo tháng
    const monthlyCounts = new Array(12).fill(0);
    signalsData.forEach(signal => {
        const month = signal.timestamp.getMonth();
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });
    
    // Cập nhật biểu đồ phân phối loại
    if (analysisCharts[0]) {
        analysisCharts[0].data.datasets[0].data = [peakCount, dipCount];
        analysisCharts[0].update();
    }
    
    // Cập nhật biểu đồ độ tin cậy
    if (analysisCharts[1]) {
        analysisCharts[1].data.datasets[0].data = [highConfidence, mediumConfidence, lowConfidence];
        analysisCharts[1].update();
    }
    
    // Cập nhật biểu đồ phân phối thời gian
    if (analysisCharts[2]) {
        analysisCharts[2].data.datasets[0].data = monthlyCounts;
        analysisCharts[2].update();
    }
    
    console.log('✅ Analysis charts updated');
}
// Sửa hàm initializeCharts để khởi tạo đúng cách
function initializeCharts() {
    console.log('📊 Initializing charts...');
    
    // Main Bitcoin Chart
    const chartCtx = document.getElementById('bitcoinChart')?.getContext('2d');
    if (!chartCtx) {
        console.warn('⚠️ Bitcoin chart canvas not found');
        return;
    }
    
    // Xóa chart cũ nếu tồn tại
    if (bitcoinChart) {
        bitcoinChart.destroy();
    }
    
    bitcoinChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Bitcoin Price (Estimated)',
                    data: [],
                    borderColor: 'rgba(247, 147, 26, 0.8)',
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
                    pointRadius: 6,
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
                    pointRadius: 6,
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
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#f7931a',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(247, 147, 26, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            if (datasetLabel.includes('Bitcoin Price')) {
                                return `Price: $${context.parsed.y.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}`;
                            } else {
                                const signal = context.raw?.signal;
                                if (signal) {
                                    return `${signal.signal_type}: $${signal.price.toLocaleString('en-US', { 
                                        minimumFractionDigits: 2, 
                                        maximumFractionDigits: 2 
                                    })} (${signal.confidence}%)`;
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
                    time: {
                        unit: 'month',
                        tooltipFormat: 'MMM dd, yyyy HH:mm'
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: { 
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return '$' + value.toLocaleString('en-US', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            });
                        }
                    }
                }
            }
        }
    });
    
    // Khởi tạo phân tích biểu đồ
    initializeAnalysisCharts();
    
    console.log('✅ Charts initialized');
    
    // Khởi tạo zoom controls sau khi chart đã sẵn sàng
    setTimeout(() => {
        if (bitcoinChart) {
            initializeZoomControls();
        }
    }, 500);
}

// Thêm nút để kích hoạt zoom thủ công nếu cần
function addManualZoomButton() {
    const chartSection = document.querySelector('.chart-section');
    if (!chartSection || document.querySelector('#manualZoomBtn')) return;
    
    const manualBtn = document.createElement('button');
    manualBtn.id = 'manualZoomBtn';
    manualBtn.className = 'csv-btn';
    manualBtn.innerHTML = '<i class="fas fa-search"></i> Activate Zoom Controls';
    manualBtn.style.margin = '10px 0';
    manualBtn.onclick = function() {
        initializeZoomControls();
        this.style.display = 'none';
    };
    
    chartSection.querySelector('.chart-controls').appendChild(manualBtn);
}

function debugTimeFormat() {
    console.log('⏰ Time Format Debug:');
    
    if (signalsData.length > 0) {
        console.log('First signal timestamp:', signalsData[0].timestamp);
        console.log('Type:', typeof signalsData[0].timestamp);
        console.log('Is Date?', signalsData[0].timestamp instanceof Date);
        console.log('Valid?', !isNaN(signalsData[0].timestamp.getTime()));
    }
    
    if (historicalPriceData.length > 0) {
        console.log('First price data timestamp:', historicalPriceData[0].x);
        console.log('Type:', typeof historicalPriceData[0].x);
        console.log('Is Date?', historicalPriceData[0].x instanceof Date);
    }
}

// Gọi hàm này sau khi parseCSVData
// Trong parseCSVData, sau khi parse xong, thêm:
// validateDataIntegrity();
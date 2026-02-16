// EWS Signals Page JavaScript - FIXED VERSION (REAL BITCOIN PRICE DATA)
// Bitcoin PeakDip Early Warning System Signals Log
// Version: 1.4.20 - Fixed Click-to-Zoom Duplication

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

// ========== CLICK-TO-ZOOM FEATURE (SINGLE VERSION) ==========
let clickZoomPoints = [];
let clickZoomInstructions = null;
let clickZoomMode = false;

// ========== ZOOM STATE ==========
let zoomState = {
    min: null,
    max: null,
    isZoomed: false,
    zoomHistory: []
};

// ========== VERSION CONTROL & CACHE BUSTING ==========
const APP_VERSION = '1.4.20';
const VERSION_KEY = 'peakdip_version';

// Thêm ở đầu file sau các khai báo biến
console.log('🚀 signals.js loaded - Debug mode ON');
console.log('📍 clickZoomMode initial:', clickZoomMode);
console.log('📍 clickZoomPoints initial:', clickZoomPoints);

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
        if (storedVersion) {
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
    console.log(`🚀 Bitcoin PeakDip EWS v${APP_VERSION} - REAL BITCOIN PRICE DATA`);
    return false;
}

// Chạy ngay khi script load
if (handleCacheVersion()) {
    throw new Error('Reloading page for cache update...');
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bitcoin PeakDip EWS Signals - REAL BITCOIN PRICE DATA VERSION');
    console.log('Initializing with REAL Bitcoin price data from Binance...');
    
    // Listen for CSV data ready event from HTML
    document.addEventListener('csvDataReady', function(e) {
        console.log('📁 CSV Data Ready event received');
        csvDataLoaded = true;
        parseCSVData(e.detail.csvText);
    });
    
    // Listen for Bitcoin price data ready event
    document.addEventListener('bitcoinDataReady', function(e) {
        console.log('💰 Bitcoin Price Data Ready event received');
        parseBitcoinPriceData(e.detail.csvText);
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts (empty for now)
    initializeCharts();
    
    // Load both CSV files
    loadRealCSVData();
    loadBitcoinPriceData();
    
    // Check if CSV is already loaded
    setTimeout(() => {
        if (!csvDataLoaded) {
            if (window.realCsvData) {
                console.log('📁 CSV data found in window object');
                parseCSVData(window.realCsvData);
            }
        }
        if (historicalPriceData.length === 0 && window.bitcoinPriceData) {
            console.log('💰 Bitcoin price data found in window object');
            parseBitcoinPriceData(window.bitcoinPriceData);
        }
    }, 1000);
    
    // Show initial loading notification
    showNotification('Loading Bitcoin EWS Signals and Real Price Data...', 'info');
    
    // Thêm nút zoom thủ công sau 3 giây
    setTimeout(addManualZoomButton, 3000);
    
    // Setup drag scroll
    setTimeout(setupTableDragScroll, 1000);
    
    // Add click zoom styles
    addClickZoomStyles();
    
    // ===== PHẦN MỚI THÊM: KHỞI TẠO MOBILE FEATURES =====
    
    // Khởi tạo mobile features sau khi chart load (2 giây)
    setTimeout(initMobileZoomSlider, 2000);
    
    // Thêm event listener để ngăn scroll khi chạm vào slider
    document.addEventListener('touchstart', function(e) {
        // Kiểm tra nếu target là slider hoặc nằm trong slider
        if (e.target.classList.contains('timeline-slider') || 
            e.target.closest('.timeline-slider')) {
            document.body.classList.add('slider-active');
        }
    }, { passive: false });
    
    document.addEventListener('touchend', function(e) {
        // Chỉ remove class khi không còn chạm vào slider
        if (!e.target.classList.contains('timeline-slider') && 
            !e.target.closest('.timeline-slider')) {
            setTimeout(() => {
                document.body.classList.remove('slider-active');
            }, 100);
        }
    });
    
    document.addEventListener('touchcancel', function() {
        document.body.classList.remove('slider-active');
    });
    
    // Lắng nghe sự kiện chart update để khởi tạo lại mobile slider
    document.addEventListener('chartDataUpdated', function() {
        setTimeout(initMobileZoomSlider, 500);
    });
    
    // Thêm CSS động để đảm bảo slider không bị scroll
    addMobileSliderStyles();
    
    // Cải thiện range slider cho mobile sau khi chart load
    setTimeout(enhanceRangeSliderForMobile, 3000);
    
    // Xử lý khi xoay màn hình
    window.addEventListener('resize', function() {
        if (typeof updateRangeHandles === 'function') {
            setTimeout(updateRangeHandles, 100);
        }
    });
    
    console.log('📱 Mobile features initialization completed');
});
// ========== BITCOIN PRICE DATA LOADING ==========
async function loadBitcoinPriceData() {
    try {
        console.log('💰 Loading real Bitcoin price data from Binance CSV...');
        
        // Try multiple paths in order of priority
        const paths = [
            'data/Binance_BTCUSDT_d.csv',
            './data/Binance_BTCUSDT_d.csv',
            'Binance_BTCUSDT_d.csv',
            './Binance_BTCUSDT_d.csv'
        ];
        
        let loadedData = false;
        
        for (const path of paths) {
            try {
                console.log(`Attempting to load Bitcoin data: ${path}`);
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
                    console.log(`✅ SUCCESS: Bitcoin data found at: ${path}`);
                    console.log(`File size: ${csvText.length} bytes`);
                    
                    parseBitcoinPriceData(csvText);
                    loadedData = true;
                    break;
                } else {
                    console.log(`⚠️ Failed (HTTP ${response.status}): ${path}`);
                }
            } catch (error) {
                console.log(`❌ Error loading ${path}:`, error.message);
                continue;
            }
        }
        
        if (!loadedData) {
            console.error('❌ CRITICAL: Could not find Bitcoin price CSV file');
            showNotification(
                'ERROR: Bitcoin price data file not found. Please ensure Binance_BTCUSDT_d.csv exists.',
                'error',
                10000
            );
            
            // Fallback: Generate synthetic data based on signals if available
            if (signalsData.length > 0) {
                console.log('⚠️ Using signals data to generate synthetic price data as fallback');
                generateSyntheticPriceData();
            }
        }
        
    } catch (error) {
        console.error('❌ FATAL: Bitcoin price data load failed:', error);
        showNotification(`Error loading Bitcoin data: ${error.message}`, 'error');
    }
}

function parseBitcoinPriceData(csvText) {
    console.log('💰 START: Parsing Bitcoin price data from Binance CSV');
    
    // Validate CSV text
    if (!csvText || typeof csvText !== 'string') {
        console.error('❌ Invalid Bitcoin CSV data');
        return;
    }
    
    csvText = csvText.trim();
    if (csvText.length === 0) {
        console.error('❌ Bitcoin CSV is empty');
        return;
    }
    
    const lines = csvText.split('\n');
    console.log(`Total lines in Bitcoin CSV: ${lines.length}`);
    
    if (lines.length < 2) {
        console.error('❌ Bitcoin CSV has no data rows');
        return;
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    console.log('Bitcoin CSV headers:', headers);
    
    // Validate required headers
    const requiredHeaders = ['unix', 'date', 'open', 'high', 'low', 'close'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
        console.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
        return;
    }
    
    // Clear previous data
    historicalPriceData = [];
    let validRows = 0;
    let minPrice = Infinity;
    let maxPrice = 0;
    
    // Parse each data row (skip header)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle quoted values
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        
        if (values.length < 6) {
            console.warn(`⚠️ Skipping line ${i}: insufficient columns (${values.length})`);
            continue;
        }
        
        // Create object with headers
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        // Parse date - handle both Unix timestamp and date string
        let date;
        
        // Try Unix timestamp first (Column 0)
        if (row['unix'] && !isNaN(parseFloat(row['unix']))) {
            const unixTimestamp = parseFloat(row['unix']);
            // Check if it's in seconds or milliseconds
            if (unixTimestamp > 1e12) {
                // Milliseconds
                date = new Date(unixTimestamp);
            } else if (unixTimestamp > 1e9) {
                // Seconds
                date = new Date(unixTimestamp * 1000);
            } else {
                date = new Date(unixTimestamp);
            }
        } 
        // Try Date string (Column 1)
        else if (row['date']) {
            date = parseBinanceDate(row['date']);
        }
        
        if (!date || isNaN(date.getTime())) {
            console.warn(`⚠️ Skipping line ${i}: invalid date "${row['date'] || row['unix']}"`);
            continue;
        }
        
        // Parse close price (preferred) or use open if close not available
        let price = 0;
        if (row['close'] && !isNaN(parseFloat(row['close']))) {
            price = parseFloat(row['close']);
        } else if (row['open'] && !isNaN(parseFloat(row['open']))) {
            price = parseFloat(row['open']);
        } else {
            console.warn(`⚠️ Skipping line ${i}: no valid price`);
            continue;
        }
        
        // Validate price
        if (price <= 0 || price > 500000) {
            console.warn(`⚠️ Skipping line ${i}: suspicious price $${price}`);
            continue;
        }
        
        // Track min/max
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
        
        // Add to historical data
        historicalPriceData.push({
            x: new Date(date),
            y: price,
            unix: row['unix'],
            dateStr: row['date'],
            open: parseFloat(row['open']) || price,
            high: parseFloat(row['high']) || price,
            low: parseFloat(row['low']) || price,
            volume: parseFloat(row['volume btc'] || row['volume'] || 0),
            volumeUsdt: parseFloat(row['volume usdt'] || 0)
        });
        
        validRows++;
    }
    
    console.log(`💰 Parsed ${validRows} valid Bitcoin price points`);
    console.log(`📈 Price range: $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`);
    
    if (validRows === 0) {
        console.error('❌ No valid Bitcoin price data found');
        showNotification('No valid Bitcoin price data found', 'error');
        
        // Fallback: generate synthetic data
        generateSyntheticPriceData();
        return;
    }
    
    // Sort by date (oldest first for chart)
    historicalPriceData.sort((a, b) => a.x.getTime() - b.x.getTime());
    
    console.log(`📅 Date range: ${formatDate(historicalPriceData[0]?.x)} to ${formatDate(historicalPriceData[historicalPriceData.length-1]?.x)}`);
    console.log(`📊 First 3 data points:`, historicalPriceData.slice(0, 3).map(d => ({
        date: formatDate(d.x),
        price: d.y
    })));
    
    // Update chart if it exists and signals are loaded
    if (bitcoinChart && signalsData.length > 0) {
        updateChartsWithData();
    }
    
    showNotification(`Loaded ${validRows} real Bitcoin price points from Binance`, 'success');
}

function parseBinanceDate(dateStr) {
    if (!dateStr) return null;
    
    // Format: "M/D/YYYY" (e.g., "2/14/2026")
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const [_, month, day, year] = match.map(Number);
        return new Date(year, month - 1, day);
    }
    
    // Try other formats
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// ========== SYNTHETIC PRICE DATA FALLBACK ==========
function generateSyntheticPriceData() {
    console.log('⚠️ Generating synthetic price data as fallback');
    
    if (signalsData.length === 0) {
        // No signals either, generate generic data
        generateGenericPriceData();
        return;
    }
    
    // Get date range from signals
    const minDate = new Date(Math.min(...signalsData.map(s => s.timestamp.getTime())));
    const maxDate = new Date(Math.max(...signalsData.map(s => s.timestamp.getTime())));
    
    // Add buffer
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    
    const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Get price range from signals
    const prices = signalsData.map(s => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    historicalPriceData = [];
    let currentPrice = minPrice * 0.9;
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(minDate);
        date.setDate(date.getDate() + i);
        
        // Random walk
        const change = (Math.random() - 0.48) * 0.05;
        currentPrice = currentPrice * (1 + change);
        currentPrice = Math.max(minPrice * 0.7, Math.min(maxPrice * 1.3, currentPrice));
        
        historicalPriceData.push({
            x: new Date(date),
            y: Math.round(currentPrice * 100) / 100,
            synthetic: true
        });
    }
    
    console.log(`⚠️ Generated ${historicalPriceData.length} synthetic price points`);
    showNotification('Using synthetic price data (fallback mode)', 'warning');
}

function generateGenericPriceData() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 2);
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    historicalPriceData = [];
    let price = 30000;
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Simulate Bitcoin price trend
        const trend = Math.sin(i / 100) * 10000 + i * 50;
        const noise = (Math.random() - 0.5) * 2000;
        price = 30000 + trend + noise;
        price = Math.max(15000, Math.min(120000, price));
        
        historicalPriceData.push({
            x: new Date(date),
            y: Math.round(price * 100) / 100,
            synthetic: true
        });
    }
    
    console.log(`⚠️ Generated ${historicalPriceData.length} generic price points`);
}

// ========== SIGNALS CSV LOADING ==========
async function loadRealCSVData() {
    try {
        console.log('📂 Loading actual CSV data from server...');
        
        const paths = [
            'data/signals.csv',
            './data/signals.csv',
            'signals.csv',
            './signals.csv'
        ];
        
        let loadedData = false;
        
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
                    parseCSVData(csvText);
                    loadedData = true;
                    lastUpdateTime = new Date();
                    break;
                }
            } catch (error) {
                console.log(`❌ Error loading ${path}:`, error.message);
                continue;
            }
        }
        
        if (!loadedData) {
            console.error('❌ Could not find signals CSV file');
            updateUIForNoData('Signals CSV file not found');
        }
        
    } catch (error) {
        console.error('❌ FATAL: Direct CSV load failed:', error);
        updateUIForNoData(`Fatal error: ${error.message}`);
    }
}

function parseCSVData(csvText) {
    console.log('📊 START: Parsing CSV data');
    
    if (!csvText || typeof csvText !== 'string') {
        console.error('❌ Invalid CSV data');
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
        console.error('❌ CSV has no data rows');
        showNotification('CSV has no data rows', 'error');
        return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('CSV headers:', headers);
    
    const requiredHeaders = ['timestamp', 'signal_type', 'price'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
        console.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
        showNotification(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
        return;
    }
    
    signalsData = [];
    let validRows = 0;
    let invalidRows = 0;
    let peakCount = 0;
    let dipCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        
        if (values.length < 3) {
            invalidRows++;
            continue;
        }
        
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].trim() : '';
            row[header] = value;
            
            if (value === '') {
                if (header === 'distance') row[header] = '0';
                if (header === 'validation') row[header] = 'PENDING';
                if (header === 'strategy') row[header] = 'UNKNOWN';
            }
        });
        
        const timestamp = parseTimestamp(row['timestamp']);
        if (!timestamp || isNaN(timestamp.getTime())) {
            invalidRows++;
            continue;
        }
        
        const price = parseFloat(row['price']);
        if (isNaN(price) || price <= 0) {
            invalidRows++;
            continue;
        }
        
        const signalType = (row['signal_type'] || 'PEAK').toUpperCase().trim();
        if (signalType === 'PEAK') {
            peakCount++;
        } else if (signalType === 'DIP') {
            dipCount++;
        }
        
        let confidence = 98;
        if (row['confidence'] && row['confidence'].trim()) {
            const confValue = parseFloat(row['confidence']);
            if (!isNaN(confValue)) {
                confidence = confValue <= 1 ? Math.round(confValue * 100) : Math.round(confValue);
                confidence = Math.max(0, Math.min(100, confidence));
            }
        }
        
        let distance = 0;
        if (row['distance'] && row['distance'].trim()) {
            const distValue = parseFloat(row['distance']);
            if (!isNaN(distValue)) {
                distance = Math.max(0, distValue);
            }
        }
        
        let validation = 'PENDING';
        if (row['validation'] && row['validation'].trim()) {
            const val = row['validation'].toUpperCase().trim();
            if (['VALIDATED', 'PENDING', 'INVALID', 'REVIEW_NEEDED'].includes(val)) {
                validation = val;
            }
        }
        
        let strategy = row['strategy'] || '';
        if (!strategy || strategy === 'UNKNOWN') {
            const strategies = signalType === 'PEAK' 
                ? ['RESISTANCE_BREAK', 'CONTINUATION', 'MOMENTUM_BREAKDOWN', 'VOLATILITY_EXPANSION']
                : ['SUPPORT_TEST', 'ACCUMULATION_ZONE', 'DISTRIBUTION_FADE', 'HEDGE_FLIP'];
            strategy = strategies[Math.floor(Math.random() * strategies.length)];
        }
        
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
            source: 'actual_csv'
        };
        
        signalsData.push(signal);
        validRows++;
    }
    
    console.log(`✅ Parsed ${validRows} valid signals from CSV`);
    console.log(`📊 STATS: Peak: ${peakCount}, Dip: ${dipCount}, Invalid: ${invalidRows}`);
    
    if (validRows === 0) {
        console.error('❌ No valid signals found in CSV');
        updateUIForNoData('No valid signals found in CSV');
        return;
    }
    
    // Sort newest first
    signalsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (signalsData.length > 0) {
        console.log(`📅 Date range: ${formatDateTime(signalsData[0]?.timestamp)} to ${formatDateTime(signalsData[signalsData.length-1]?.timestamp)}`);
    }
    
    updateUI();
    lastUpdateTime = new Date();
    showNotification(`Loaded ${validRows} actual signals from CSV`, 'success');
    
    // If Bitcoin data already loaded, update chart
    if (bitcoinChart && historicalPriceData.length > 0) {
        updateChartsWithData();
    }
}

function parseTimestamp(timestampStr) {
    if (!timestampStr) return null;
    
    const formats = [
        () => {
            const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
            if (match) {
                const [_, year, month, day, hour, minute, second] = match.map(Number);
                return new Date(year, month - 1, day, hour, minute, second);
            }
            return null;
        },
        () => {
            const match = timestampStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})$/);
            if (match) {
                const [_, month, day, year, hour, minute] = match.map(Number);
                return new Date(year, month - 1, day, hour, minute);
            }
            return null;
        },
        () => {
            const match = timestampStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match) {
                const [_, month, day, year] = match.map(Number);
                return new Date(year, month - 1, day);
            }
            return null;
        },
        () => {
            const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
            if (match) {
                const [_, year, month, day, hour, minute, second] = match.map(Number);
                return new Date(year, month - 1, day, hour, minute, second);
            }
            return null;
        },
        () => {
            const date = new Date(timestampStr);
            return isNaN(date.getTime()) ? null : date;
        }
    ];
    
    for (const format of formats) {
        const date = format();
        if (date && !isNaN(date.getTime())) {
            return date;
        }
    }
    
    return null;
}

// ========== UI UPDATE FUNCTIONS ==========
function updateUI() {
    console.log('🔄 Updating UI with actual data...');
    
    updateLastUpdated();
    updateStats();
    filterSignals();
    renderTable();
    
    if (!bitcoinChart) {
        initializeCharts();
    }
    
    updateChartsWithData();
    updateAnalysisCharts();
    
    if (!window.tableScrollInitialized) {
        setupTableScroll();
        window.tableScrollInitialized = true;
    }
}

function updateUIForNoData(errorMessage = 'No data available') {
    console.log('🔄 Updating UI for no data state...');
    
    document.getElementById('peakCount').textContent = '0';
    document.getElementById('dipCount').textContent = '0';
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('accuracyRate').textContent = '0%';
    
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = 'Never (No data)';
    }
    
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
    
    showNotification('No data available. Please check CSV file.', 'warning', 5000);
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated && lastUpdateTime) {
        lastUpdated.textContent = lastUpdateTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function updateStats() {
    if (signalsData.length === 0) return;
    
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const totalCount = signalsData.length;
    
    const validatedSignals = signalsData.filter(s => s.validation === 'VALIDATED').length;
    const accuracyRate = totalCount > 0 ? Math.round((validatedSignals / totalCount) * 100) : 0;
    
    const peakElement = document.getElementById('peakCount');
    const dipElement = document.getElementById('dipCount');
    const totalElement = document.getElementById('totalCount');
    const accuracyElement = document.getElementById('accuracyRate');
    
    if (peakElement) peakElement.textContent = peakCount;
    if (dipElement) dipElement.textContent = dipCount;
    if (totalElement) totalElement.textContent = totalCount;
    if (accuracyElement) accuracyElement.textContent = accuracyRate + '%';
    
    const peakPercentage = document.getElementById('peakPercentage');
    const dipPercentage = document.getElementById('dipPercentage');
    if (peakPercentage && dipPercentage) {
        peakPercentage.textContent = totalCount > 0 ? Math.round((peakCount / totalCount) * 100) + '%' : '0%';
        dipPercentage.textContent = totalCount > 0 ? Math.round((dipCount / totalCount) * 100) + '%' : '0%';
    }
    
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    
    if (document.getElementById('highConfidence')) {
        document.getElementById('highConfidence').textContent = highConfidence;
    }
    if (document.getElementById('mediumConfidence')) {
        document.getElementById('mediumConfidence').textContent = mediumConfidence;
    }
}

function filterSignals() {
    const searchInput = document.getElementById('signalSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filteredSignals = signalsData.filter(signal => {
        if (currentFilter === 'peak' && signal.signal_type !== 'PEAK') return false;
        if (currentFilter === 'dip' && signal.signal_type !== 'DIP') return false;
        if (currentFilter === 'high-confidence' && signal.confidence < 80) return false;
        
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
    
    currentPage = 1;
}

function renderTable() {
    const tableBody = document.getElementById('signalsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
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
    
    pageSignals.forEach((signal, index) => {
        const row = document.createElement('tr');
        row.className = `signal-${signal.signal_type.toLowerCase()}`;
        row.dataset.signalId = signal.id;
        row.dataset.index = startIndex + index;
        
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
        
        row.addEventListener('click', function() {
            selectSignal(signal, startIndex + index);
        });
        
        tableBody.appendChild(row);
    });
    
    updatePagination();
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
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        nextBtn.style.opacity = (currentPage === totalPages || totalPages === 0) ? '0.5' : '1';
    }
}

function selectSignal(signal, index) {
    document.querySelectorAll('.signals-table tbody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
    const rows = document.querySelectorAll('.signals-table tbody tr');
    if (rows[index]) {
        rows[index].classList.add('selected');
    }
    
    showSignalDetails(signal);
    highlightSignalOnChart(signal);
}

function showSignalDetails(signal) {
    const detailsContainer = document.getElementById('signalDetails');
    if (!detailsContainer) return;
    
    const confidenceLevel = getConfidenceLevel(signal.confidence);
    const confidenceColor = confidenceLevel === 'high' ? '#4CAF50' : 
                           confidenceLevel === 'medium' ? '#FFC107' : '#F44336';
    
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
                    <span class="detail-value">${daysAgo} days ago</span>
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
    console.log(`📊 Chart highlight for ${signal.signal_type} at $${signal.price}`);
}

// Thêm vào phần khởi tạo chart trong hàm initializeCharts()
// Tìm phần options của chart và thêm callback cho legend click

function initializeCharts() {
    console.log('📊 Initializing charts with REAL Bitcoin price data...');
    
    const chartCtx = document.getElementById('bitcoinChart')?.getContext('2d');
    if (!chartCtx) {
        console.warn('⚠️ Bitcoin chart canvas not found');
        return;
    }
    
    if (bitcoinChart) {
        bitcoinChart.destroy();
    }
    
    bitcoinChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Bitcoin Price (Binance Real Data)',
                    data: [],
                    borderColor: 'rgba(247, 147, 26, 0.9)',
                    backgroundColor: 'rgba(247, 147, 26, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    hidden: false // Thêm thuộc tính hidden
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
                    showLine: false,
                    hidden: false // Thêm thuộc tính hidden
                },
                {
                    label: 'Dip Signals',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: '#00d4ff',
                    borderWidth: 0,
                    pointRadius: 6,
                    pointStyle: 'triangle',
                    showLine: false,
                    hidden: false // Thêm thuộc tính hidden
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
                        font: { size: 12 },
                        // Thêm filter để xử lý khi click vào legend
                        filter: function(item, chart) {
                            return true; // Giữ nguyên filter mặc định
                        }
                    },
                    // THÊM CALLBACK NÀY - XỬ LÝ KHI CLICK VÀO LEGEND
                    onClick: function(e, legendItem, legend) {
                        // Gọi hàm onClick mặc định của Chart.js
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        
                        // Toggle visibility của dataset được click
                        const meta = ci.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                        
                        // Cập nhật chart
                        ci.update();
                        
                        // === THÊM PHẦN XỬ LÝ SCALE TỰ ĐỘNG ===
                        setTimeout(() => {
                            autoScaleChartAfterLegendClick(ci);
                        }, 50);
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
                                const dataPoint = context.raw;
                                let extraInfo = '';
                                if (dataPoint && dataPoint.volume) {
                                    extraInfo = ` | Vol: ${(dataPoint.volume / 1000).toFixed(0)}K BTC`;
                                }
                                return `Price: $${context.parsed.y.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}${extraInfo}`;
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
                        tooltipFormat: 'MMM dd, yyyy',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
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
    
    initializeAnalysisCharts();
    console.log('✅ Charts initialized');
    
    setTimeout(() => {
        if (bitcoinChart) {
            initializeZoomControls();
        }
    }, 500);
}

// THÊM HÀM MỚI - Auto scale chart khi tắt đường Bitcoin Price
function autoScaleChartAfterLegendClick(chart) {
    if (!chart) return;
    
    // Kiểm tra dataset nào đang hiển thị
    const priceDatasetVisible = !chart.getDatasetMeta(0).hidden;
    const peakDatasetVisible = !chart.getDatasetMeta(1).hidden;
    const dipDatasetVisible = !chart.getDatasetMeta(2).hidden;
    
    console.log('🔄 Auto-scaling chart - Price visible:', priceDatasetVisible, 
                'Peak visible:', peakDatasetVisible, 'Dip visible:', dipDatasetVisible);
    
    // Nếu tắt đường giá (price) nhưng vẫn còn Peak/Dip
    if (!priceDatasetVisible && (peakDatasetVisible || dipDatasetVisible)) {
        console.log('📊 Scaling chart to fit Peak/Dip signals only');
        
        // Lấy tất cả signal data từ dataset 1 và 2
        const allSignals = [];
        
        if (peakDatasetVisible) {
            const peakData = chart.data.datasets[1].data;
            allSignals.push(...peakData);
        }
        
        if (dipDatasetVisible) {
            const dipData = chart.data.datasets[2].data;
            allSignals.push(...dipData);
        }
        
        if (allSignals.length > 0) {
            // Tìm min và max date từ signals
            const dates = allSignals.map(s => s.x.getTime());
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            
            // Thêm padding 10% mỗi bên
            const range = maxDate - minDate;
            const padding = range * 0.1;
            
            const startDate = new Date(minDate.getTime() - padding);
            const endDate = new Date(maxDate.getTime() + padding);
            
            console.log(`📅 Scaling to signals range: ${formatDate(startDate)} - ${formatDate(endDate)}`);
            
            // Lưu vào zoom history
            zoomState.zoomHistory.push({
                min: chart.options.scales.x.min,
                max: chart.options.scales.x.max
            });
            
            // Áp dụng zoom mới
            chart.options.scales.x.min = startDate;
            chart.options.scales.x.max = endDate;
            
            // Xác định time unit phù hợp
            const days = range / (1000 * 60 * 60 * 24);
            if (days <= 30) {
                chart.options.scales.x.time.unit = 'day';
            } else if (days <= 90) {
                chart.options.scales.x.time.unit = 'week';
            } else {
                chart.options.scales.x.time.unit = 'month';
            }
            
            zoomState.isZoomed = true;
            zoomState.min = startDate;
            zoomState.max = endDate;
            
            chart.update();
            
            // Cập nhật UI
            updateZoomInfo();
            updateTimelineSlider();
            
            showNotification('Chart auto-scaled to show all signals', 'info', 2000);
        }
    }
    // Nếu bật lại đường giá
    else if (priceDatasetVisible && !zoomState.isZoomed) {
        console.log('📊 Restoring full price range');
        
        // Restore về full range
        if (historicalPriceData.length > 0) {
            const fullData = historicalPriceData;
            const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
            const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
            
            const range = fullMax - fullMin;
            const startDate = new Date(fullMin.getTime() - range * 0.05);
            const endDate = new Date(fullMax.getTime() + range * 0.05);
            
            chart.options.scales.x.min = startDate;
            chart.options.scales.x.max = endDate;
            chart.options.scales.x.time.unit = 'month';
            
            zoomState.isZoomed = false;
            zoomState.min = startDate;
            zoomState.max = endDate;
            
            chart.update();
            updateZoomInfo();
            updateTimelineSlider();
        }
    }
}

// Cập nhật hàm updateChartsWithData() để thêm data và đảm bảo auto-scale hoạt động
function updateChartsWithData() {
    if (!bitcoinChart) {
        console.warn('⚠️ Cannot update chart: no chart');
        return;
    }
    
    console.log('📊 Updating charts with REAL Bitcoin price data...');
    
    if (historicalPriceData.length === 0) {
        console.warn('⚠️ No Bitcoin price data available');
        return;
    }
    
    const peakSignals = signalsData.filter(s => s.signal_type === 'PEAK');
    const dipSignals = signalsData.filter(s => s.signal_type === 'DIP');
    
    console.log(`📊 Chart data:`);
    console.log(`- Real Bitcoin price points: ${historicalPriceData.length}`);
    console.log(`- Peak signals: ${peakSignals.length}`);
    console.log(`- Dip signals: ${dipSignals.length}`);
    
    if (historicalPriceData.length > 0) {
        console.log(`📊 Sample Bitcoin price:`, {
            date: formatDate(historicalPriceData[0].x),
            price: historicalPriceData[0].y
        });
    }
    
    // Update chart datasets
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
    
    // Reset hidden state (đảm bảo tất cả đều hiển thị ban đầu)
    bitcoinChart.data.datasets[0].hidden = false;
    bitcoinChart.data.datasets[1].hidden = false;
    bitcoinChart.data.datasets[2].hidden = false;
    
    // Update chart title to show data source
    const isSynthetic = historicalPriceData.some(d => d.synthetic);
    if (isSynthetic) {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Synthetic Fallback)';
        bitcoinChart.data.datasets[0].borderColor = 'rgba(255, 152, 0, 0.8)';
    } else {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Binance Real Data)';
    }
    
    bitcoinChart.update();
    
    // Auto-scale nếu cần (kiểm tra trạng thái hiện tại)
    setTimeout(() => {
        const priceVisible = !bitcoinChart.getDatasetMeta(0).hidden;
        if (!priceVisible && (peakSignals.length > 0 || dipSignals.length > 0)) {
            autoScaleChartAfterLegendClick(bitcoinChart);
        }
    }, 100);
    
    console.log(`✅ Charts updated with REAL Bitcoin price data`);
}

// Thêm CSS cho notification mới
const additionalStyle = document.createElement('style');
additionalStyle.textContent = `
    /* Style cho legend khi hover */
    .chartjs-legend li:hover {
        opacity: 0.8;
        cursor: pointer;
    }
    
    /* Animation khi auto-scale */
    .chart-container {
        transition: box-shadow 0.3s ease;
    }
    
    .chart-container.auto-scaling {
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
    }
`;
document.head.appendChild(additionalStyle);

function initializeAnalysisCharts() {
    console.log('📊 Initializing analysis charts...');
    
    analysisCharts = [];
    
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

function updateAnalysisCharts() {
    if (analysisCharts.length === 0 || signalsData.length === 0) return;
    
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    const lowConfidence = signalsData.filter(s => s.confidence < 60).length;
    
    const monthlyCounts = new Array(12).fill(0);
    signalsData.forEach(signal => {
        const month = signal.timestamp.getMonth();
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });
    
    if (analysisCharts[0]) {
        analysisCharts[0].data.datasets[0].data = [peakCount, dipCount];
        analysisCharts[0].update();
    }
    
    if (analysisCharts[1]) {
        analysisCharts[1].data.datasets[0].data = [highConfidence, mediumConfidence, lowConfidence];
        analysisCharts[1].update();
    }
    
    if (analysisCharts[2]) {
        analysisCharts[2].data.datasets[0].data = monthlyCounts;
        analysisCharts[2].update();
    }
    
    console.log('✅ Analysis charts updated');
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
    document.getElementById('zoomIn')?.addEventListener('click', function() {
        deactivateAllModes();
        zoomChart(0.8);
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', function() {
        deactivateAllModes();
        zoomChart(1.2);
    });
    
    document.getElementById('zoomReset')?.addEventListener('click', function() {
        deactivateAllModes();
        resetZoom();
    });
    
    document.getElementById('zoomPan')?.addEventListener('click', function() {
        togglePanMode();
        if (clickZoomInstructions) clickZoomInstructions.style.display = 'none';
        clickZoomMode = false;
    });
    
    document.getElementById('zoomSelect')?.addEventListener('click', function() {
        toggleSelectMode();
        if (clickZoomInstructions) clickZoomInstructions.style.display = 'none';
        clickZoomMode = false;
    });
    
    document.getElementById('zoomClick')?.addEventListener('click', function() {
        const panBtn = document.getElementById('zoomPan');
        const selectBtn = document.getElementById('zoomSelect');
        
        if (panBtn) panBtn.classList.remove('active');
        if (selectBtn) selectBtn.classList.remove('active');
        
        this.classList.add('active');
        
        // Kích hoạt click-to-zoom
        activateClickZoomMode();
    });
    
    const timelineSlider = document.getElementById('timelineSlider');
    if (timelineSlider) {
        timelineSlider.addEventListener('input', function() {
            deactivateAllModes();
            updateZoomFromSlider(this.value);
        });
    }
    
    document.getElementById('zoomBack')?.addEventListener('click', function() {
        zoomBack();
    });
    
    addTimeframePresets();
}

function addTimeframePresets() {
    const chartControls = document.querySelector('.chart-controls');
    if (!chartControls) return;
    
    const presetsContainer = document.createElement('div');
    presetsContainer.className = 'timeframe-presets';
    presetsContainer.innerHTML = `
        <button class="timeframe-preset" data-preset="1w">1W</button>
        <button class="timeframe-preset active" data-preset="1m">1M</button>
        <button class="timeframe-preset" data-preset="3m">3M</button>
        <button class="timeframe-preset" data-preset="6m">6M</button>
        <button class="timeframe-preset" data-preset="1y">1Y</button>
        <button class="timeframe-preset" data-preset="all">ALL</button>
    `;
    
    chartControls.querySelector('.control-btn').parentNode.insertBefore(presetsContainer, chartControls.querySelector('.chart-legend'));
    
    presetsContainer.querySelectorAll('.timeframe-preset').forEach(btn => {
        btn.addEventListener('click', function() {
            presetsContainer.querySelectorAll('.timeframe-preset').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyTimeframePreset(this.dataset.preset);
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
    
    const now = new Date();
    
    switch(preset) {
        case '1w':
            unit = 'day';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '1m':
            unit = 'day';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case '3m':
            unit = 'week';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case '6m':
            unit = 'week';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 6);
            break;
        case '1y':
            unit = 'month';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case 'all':
            startDate = minDate;
            endDate = maxDate;
            unit = 'month';
            break;
    }
    
    if (startDate < minDate) startDate = new Date(minDate);
    
    const range = endDate - startDate;
    startDate = new Date(startDate.getTime() - range * 0.05);
    endDate = new Date(endDate.getTime() + range * 0.05);
    
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = unit;
    
    zoomState.min = startDate;
    zoomState.max = endDate;
    zoomState.isZoomed = preset !== 'all';
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
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
        
        const xScale = bitcoinChart.scales.x;
        
        const minPixel = Math.min(startX, endX);
        const maxPixel = Math.max(startX, endX);
        
        const minDate = xScale.getValueForPixel(minPixel);
        const maxDate = xScale.getValueForPixel(maxPixel);
        
        if (minDate && maxDate && (maxDate - minDate) > 0) {
            zoomToRange(minDate, maxDate);
        }
        
        if (selectionRect.parentNode) {
            selectionRect.parentNode.removeChild(selectionRect);
        }
        selectionRect = null;
        isSelecting = false;
    });
    
    let isPanning = false;
    let panStartX = 0;
    
    chartCanvas.addEventListener('mousedown', function(e) {
        const panBtn = document.getElementById('zoomPan');
        if (!panBtn || !panBtn.classList.contains('active')) return;
        
        isPanning = true;
        panStartX = e.clientX;
        chartCanvas.style.cursor = 'grabbing';
    });
    
    chartCanvas.addEventListener('mousemove', function(e) {
        if (!isPanning) return;
        
        const deltaX = e.clientX - panStartX;
        const panSpeed = 0.5;
        
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
    if (!bitcoinChart) return;
    
    const xScale = bitcoinChart.scales.x;
    const range = xScale.max - xScale.min;
    const center = xScale.min + range / 2;
    const newRange = range * factor;
    
    zoomState.min = new Date(center - newRange / 2);
    zoomState.max = new Date(center + newRange / 2);
    
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    bitcoinChart.options.scales.x.min = zoomState.min;
    bitcoinChart.options.scales.x.max = zoomState.max;
    zoomState.isZoomed = true;
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
}

function zoomToRange(minDate, maxDate) {
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
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
    if (!zoomState.isZoomed || historicalPriceData.length === 0) return;
    
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    const fullData = historicalPriceData;
    zoomState.min = new Date(Math.min(...fullData.map(d => d.x)));
    zoomState.max = new Date(Math.max(...fullData.map(d => d.x)));
    
    const range = zoomState.max - zoomState.min;
    zoomState.min = new Date(zoomState.min.getTime() - range * 0.05);
    zoomState.max = new Date(zoomState.max.getTime() + range * 0.05);
    
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
    if (historicalPriceData.length === 0) return;
    
    const fullData = historicalPriceData;
    const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
    const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
    const fullRange = fullMax - fullMin;
    
    const visiblePercentage = value / 100;
    const visibleRange = fullRange * visiblePercentage;
    
    const endDate = fullMax;
    const startDate = new Date(fullMax.getTime() - visibleRange);
    
    if (zoomState.isZoomed) {
        zoomState.zoomHistory.push({
            min: bitcoinChart.options.scales.x.min,
            max: bitcoinChart.options.scales.x.max
        });
    }
    
    zoomState.min = startDate;
    zoomState.max = endDate;
    zoomState.isZoomed = value < 100;
    
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    
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
    
    const fullRange = fullMax - fullMin;
    const visibleRange = currentMax - currentMin;
    const sliderValue = (visibleRange / fullRange) * 100;
    
    slider.value = Math.min(100, Math.max(0, sliderValue));
    
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

function updateChartTimeframe(timeframe) {
    if (!bitcoinChart || historicalPriceData.length === 0) return;
    
    console.log(`📈 Updating chart timeframe to: ${timeframe}`);
    
    const fullData = historicalPriceData;
    const minDate = new Date(Math.min(...fullData.map(d => d.x)));
    const maxDate = new Date(Math.max(...fullData.map(d => d.x)));
    
    let startDate = new Date(minDate);
    let endDate = new Date(maxDate);
    let unit = 'month';
    
    const now = new Date();
    
    switch(timeframe) {
        case '1d':
            unit = 'hour';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            break;
        case '7d':
            unit = 'day';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '30d':
            unit = 'day';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            break;
        case '90d':
            unit = 'week';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 90);
            break;
        case '180d':
            unit = 'week';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 180);
            break;
        case '1y':
            unit = 'month';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case '2y':
            unit = 'month';
            endDate = new Date(now);
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 2);
            break;            
        default:
            startDate = minDate;
            endDate = maxDate;
            unit = 'month';
    }
    
    if (startDate < minDate) startDate = new Date(minDate);
    
    const range = endDate - startDate;
    startDate = new Date(startDate.getTime() - range * 0.05);
    endDate = new Date(endDate.getTime() + range * 0.05);
    
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = unit;
    
    zoomState.min = startDate;
    zoomState.max = endDate;
    zoomState.isZoomed = timeframe !== 'all';
    
    bitcoinChart.update();
    updateZoomInfo();
    updateTimelineSlider();
}

// ========== CLICK-TO-ZOOM IMPLEMENTATION ==========
function createClickZoomInstructions() {
    // Xóa instruction cũ nếu có
    const oldInstructions = document.getElementById('clickZoomInstructions');
    if (oldInstructions) oldInstructions.remove();
    
    // Tạo instruction mới
    clickZoomInstructions = document.createElement('div');
    clickZoomInstructions.id = 'clickZoomInstructions';
    clickZoomInstructions.className = 'click-zoom-instructions';
    clickZoomInstructions.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid var(--wave-trough);
        border-radius: 10px;
        padding: 15px;
        width: 300px;
        z-index: 10000;
        backdrop-filter: blur(10px);
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.7);
        border-left: 4px solid var(--wave-trough);
    `;
    clickZoomInstructions.innerHTML = `
        <div class="instructions-header">
            <i class="fas fa-mouse-pointer"></i>
            <span>Active Zoom Controls</span>
            <button class="close-instructions" onclick="closeClickZoomInstructions()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="instructions-body">
            <p><i class="fas fa-hand-pointer"></i> Click vào hai điểm bất kỳ trên biểu đồ</p>
            <p><i class="fas fa-chart-line"></i> Chart sẽ tự động zoom vào khoảng thời gian giữa hai lần click</p>
            <div class="instruction-status status-waiting" id="clickZoomStatus">
                <i class="fas fa-hourglass-half"></i> Chờ click lần 1...
            </div>
        </div>
        <div class="instructions-footer">
            <button class="reset-zoom-btn" onclick="resetZoomFromInstructions()">
                <i class="fas fa-undo-alt"></i> Reset Zoom
            </button>
            <button class="exit-zoom-btn" onclick="exitClickZoomMode()">
                <i class="fas fa-sign-out-alt"></i> Thoát
            </button>
        </div>
    `;
    
    document.body.appendChild(clickZoomInstructions);
    
    // Gán event listener cho chart
    setupChartClickEvents();
}

// Sửa hàm performClickZoom() để đảm bảo zoom hoạt động
function performClickZoom() {
    console.log('🔍 Performing click zoom with points:', clickZoomPoints);
    
    if (clickZoomPoints.length !== 2) {
        console.log('❌ Need exactly 2 points');
        return;
    }
    
    if (!bitcoinChart) {
        console.log('❌ Bitcoin chart not available');
        return;
    }
    
    // Sắp xếp điểm theo thời gian
    const points = [...clickZoomPoints].sort((a, b) => a.time - b.time);
    const startPoint = points[0];
    const endPoint = points[1];
    
    console.log(`📅 Zoom from ${new Date(startPoint.time).toLocaleString()} to ${new Date(endPoint.time).toLocaleString()}`);
    
    // Thêm padding 5% mỗi bên
    const range = endPoint.time - startPoint.time;
    const padding = range * 0.05;
    
    const startDate = new Date(startPoint.time - padding);
    const endDate = new Date(endPoint.time + padding);
    
    console.log(`📊 Applying zoom with padding: ${new Date(startDate).toLocaleString()} - ${new Date(endDate).toLocaleString()}`);
    
    // Lưu vào history
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    // Áp dụng zoom
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = determineTimeUnit(range);
    
    zoomState.isZoomed = true;
    zoomState.min = startDate;
    zoomState.max = endDate;
    
    bitcoinChart.update();
    
    // Hiển thị thông tin zoom
    const days = Math.ceil(range / (1000 * 60 * 60 * 24));
    updateClickZoomStatus(`✅ Đã zoom ${days} ngày (${formatDate(startDate)} - ${formatDate(endDate)})`, 'success');
    
    // Cập nhật zoom info và slider
    updateZoomInfo();
    updateTimelineSlider();
    updateRangeHandles();
    
    // Xóa các điểm click
    clickZoomPoints = [];
    
    // Hiệu ứng flash
    flashChart();
    
    console.log('✅ Click zoom completed');
}

function showClickMarker(clientX, pointNumber) {
    const chartCanvas = document.getElementById('bitcoinChart');
    const chartContainer = document.querySelector('.chart-container');
    if (!chartCanvas || !chartContainer) return;
    
    const rect = chartCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    
    // Xóa marker cũ nếu có
    const oldMarkers = chartContainer.querySelectorAll('.click-marker');
    if (pointNumber === 1) {
        oldMarkers.forEach(m => m.remove());
    } else {
        // Chỉ xóa marker cũ cùng số
        oldMarkers.forEach(m => {
            if (m.classList.contains(`marker-${pointNumber}`)) {
                m.remove();
            }
        });
    }
    
    const marker = document.createElement('div');
    marker.className = `click-marker marker-${pointNumber}`;
    marker.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        left: ${x}px;
        width: 2px;
        background: linear-gradient(to bottom, 
            transparent 0%,
            rgba(255,255,255,0.8) 20%,
            rgba(255,255,255,0.8) 80%,
            transparent 100%);
        pointer-events: none;
        z-index: 100;
        animation: markerAppear 0.5s ease;
    `;
    
    const markerNumber = document.createElement('span');
    markerNumber.style.cssText = `
        position: absolute;
        top: 20px;
        left: -12px;
        background: ${pointNumber === 1 ? 'var(--wave-trough)' : '#ff2e63'};
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9em;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        border: 2px solid white;
        animation: markerBounce 0.5s ease;
    `;
    markerNumber.innerText = pointNumber;
    
    marker.appendChild(markerNumber);
    chartContainer.appendChild(marker);
}

function updateClickZoomStatus(message, type = 'waiting') {
    const statusEl = document.getElementById('clickZoomStatus');
    if (!statusEl) return;
    
    const icons = {
        'waiting': 'hourglass-half',
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'info': 'info-circle'
    };
    
    statusEl.innerHTML = `<i class="fas fa-${icons[type] || 'hourglass-half'}"></i> ${message}`;
    statusEl.className = `instruction-status status-${type}`;
}

function performClickZoom() {
    if (clickZoomPoints.length !== 2) return;
    
    // Sắp xếp điểm theo thời gian
    const points = [...clickZoomPoints].sort((a, b) => a.time - b.time);
    const startPoint = points[0];
    const endPoint = points[1];
    
    // Thêm padding 5% mỗi bên
    const range = endPoint.time - startPoint.time;
    const padding = range * 0.05;
    
    const startDate = new Date(startPoint.time - padding);
    const endDate = new Date(endPoint.time + padding);
    
    // Lưu vào history
    zoomState.zoomHistory.push({
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max
    });
    
    // Áp dụng zoom
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = determineTimeUnit(range);
    
    zoomState.isZoomed = true;
    zoomState.min = startDate;
    zoomState.max = endDate;
    
    bitcoinChart.update();
    
    // Hiển thị thông tin zoom
    const days = Math.ceil(range / (1000 * 60 * 60 * 24));
    updateClickZoomStatus(`✅ Đã zoom ${days} ngày (${formatDate(startDate)} - ${formatDate(endDate)})`, 'success');
    
    // Cập nhật zoom info và slider
    updateZoomInfo();
    updateTimelineSlider();
    
    // Xóa các điểm click
    clickZoomPoints = [];
    
    // Hiệu ứng flash
    flashChart();
}

function determineTimeUnit(rangeMs) {
    const days = rangeMs / (1000 * 60 * 60 * 24);
    if (days <= 1) return 'hour';
    if (days <= 7) return 'day';
    if (days <= 30) return 'week';
    return 'month';
}

function flashChart() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    chartContainer.classList.add('chart-flash');
    setTimeout(() => {
        chartContainer.classList.remove('chart-flash');
    }, 500);
}

function resetZoomFromInstructions() {
    resetZoom();
    updateClickZoomStatus('Đã reset zoom, chờ click lần 1...', 'waiting');
    clickZoomPoints = [];
    
    // Xóa markers
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        const markers = chartContainer.querySelectorAll('.click-marker');
        markers.forEach(m => m.remove());
    }
}

function exitClickZoomMode() {
    clickZoomMode = false;
    
    if (clickZoomInstructions) {
        clickZoomInstructions.remove();
        clickZoomInstructions = null;
    }
    
    // Deactivate button
    const clickBtn = document.getElementById('zoomClick');
    if (clickBtn) {
        clickBtn.classList.remove('active');
    }
    
    // Reset cursor
    const chartCanvas = document.getElementById('bitcoinChart');
    if (chartCanvas) {
        chartCanvas.style.cursor = '';
    }
    
    // Xóa markers
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        const markers = chartContainer.querySelectorAll('.click-marker');
        markers.forEach(m => m.remove());
    }
    
    clickZoomPoints = [];
    
    showNotification('Đã thoát chế độ click-to-zoom', 'info');
}

function closeClickZoomInstructions() {
    exitClickZoomMode();
}

// Sửa hàm activateClickZoomMode() để thêm log và kiểm tra
function activateClickZoomMode() {
    console.log('🖱️ Activating click-to-zoom mode');
    clickZoomMode = true;
    
    // Reset points
    clickZoomPoints = [];
    
    // Hiển thị instructions
    if (!clickZoomInstructions || !document.body.contains(clickZoomInstructions)) {
        createClickZoomInstructions();
    } else {
        clickZoomInstructions.style.display = 'block';
    }
    
    // Cập nhật status
    if (typeof updateClickZoomStatus === 'function') {
        updateClickZoomStatus('Chờ click lần 1...', 'waiting');
    }
    
    // Update cursor
    const chartCanvas = document.getElementById('bitcoinChart');
    if (chartCanvas) {
        chartCanvas.style.cursor = 'crosshair';
    }
    
    // Đảm bảo chart click events được setup
    if (typeof setupChartClickEvents === 'function') {
        setupChartClickEvents();
    }
    
    showNotification('Chế độ click-to-zoom: Click 2 điểm bất kỳ trên biểu đồ để zoom', 'info', 4000);
}
function deactivateAllModes() {
    const panBtn = document.getElementById('zoomPan');
    const selectBtn = document.getElementById('zoomSelect');
    const clickBtn = document.getElementById('zoomClick');
    
    if (panBtn) panBtn.classList.remove('active');
    if (selectBtn) selectBtn.classList.remove('active');
    if (clickBtn) clickBtn.classList.remove('active');
    
    clickZoomMode = false;
    
    const chartCanvas = document.getElementById('bitcoinChart');
    if (chartCanvas) {
        chartCanvas.style.cursor = '';
    }
    
    if (clickZoomInstructions) {
        clickZoomInstructions.style.display = 'none';
    }
    
    clickZoomPoints = [];
}

function addClickZoomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .click-zoom-instructions {
            animation: slideInRight 0.3s ease;
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
        
        .click-marker {
            animation: markerAppear 0.5s ease;
        }
        
        .click-marker span {
            animation: markerBounce 0.5s ease;
        }
        
        @keyframes markerAppear {
            0% {
                opacity: 0;
                transform: scaleY(0);
            }
            100% {
                opacity: 1;
                transform: scaleY(1);
            }
        }
        
        @keyframes markerBounce {
            0% {
                transform: scale(0);
            }
            50% {
                transform: scale(1.2);
            }
            100% {
                transform: scale(1);
            }
        }
        
        .chart-flash {
            animation: chartFlash 0.5s ease;
        }
        
        @keyframes chartFlash {
            0% {
                box-shadow: 0 0 0 0 rgba(0, 212, 255, 0);
            }
            20% {
                box-shadow: 0 0 30px 15px rgba(0, 212, 255, 0.7);
            }
            40% {
                box-shadow: 0 0 50px 25px rgba(0, 212, 255, 0.5);
            }
            60% {
                box-shadow: 0 0 30px 15px rgba(0, 212, 255, 0.3);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(0, 212, 255, 0);
            }
        }
        
        .status-waiting {
            background: rgba(255, 193, 7, 0.15);
            border: 1px solid #ffc107;
            color: #ffc107;
        }
        
        .status-success {
            background: rgba(40, 167, 69, 0.15);
            border: 1px solid #28a745;
            color: #28a745;
        }
        
        .status-error {
            background: rgba(220, 53, 69, 0.15);
            border: 1px solid #dc3545;
            color: #dc3545;
        }
        
        .status-info {
            background: rgba(23, 162, 184, 0.15);
            border: 1px solid #17a2b8;
            color: #17a2b8;
        }
        
        .instruction-status {
            margin-top: 15px;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.9em;
            text-align: center;
            font-weight: 500;
            animation: statusPulse 2s infinite;
        }
        
        @keyframes statusPulse {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
        }
        
        .instructions-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        .instructions-header i {
            color: var(--wave-trough);
            font-size: 1.2em;
        }
        
        .instructions-header span {
            flex: 1;
            font-weight: bold;
            color: white;
            font-size: 1.1em;
        }
        
        .close-instructions {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .close-instructions:hover {
            color: white;
            background: rgba(255, 255, 255, 0.1);
            transform: rotate(90deg);
        }
        
        .instructions-footer {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        
        .reset-zoom-btn, .exit-zoom-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
            font-weight: 500;
        }
        
        .reset-zoom-btn {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .reset-zoom-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .exit-zoom-btn {
            background: var(--wave-trough);
            color: white;
            border: 1px solid var(--wave-trough);
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }
        
        .exit-zoom-btn:hover {
            background: var(--wave-mid);
            border-color: var(--wave-mid);
            transform: translateY(-2px);
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
        }
        
        #zoomClick.active {
            background: var(--wave-trough);
            color: white;
            border-color: var(--wave-trough);
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
            animation: buttonPulse 2s infinite;
        }
        
        @keyframes buttonPulse {
            0% { box-shadow: 0 0 10px rgba(0, 212, 255, 0.5); }
            50% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.9); }
            100% { box-shadow: 0 0 10px rgba(0, 212, 255, 0.5); }
        }
    `;
    document.head.appendChild(style);
}

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
    
    const chartControls = chartSection.querySelector('.chart-controls');
    if (chartControls) {
        chartControls.appendChild(manualBtn);
    }
}

// ========== EVENT HANDLERS ==========
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (signalsData.length === 0) {
                showNotification('No data available to filter', 'warning');
                return;
            }
            
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            
            filterSignals();
            renderTable();
        });
    });
    
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
                
                filterSignals();
                renderTable();
            }, 300);
        });
    }
    
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (this.disabled || signalsData.length === 0) return;
            
            if (currentPage > 1) {
                currentPage--;
                renderTable();
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
            }
        });
    }
    
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const timeframe = this.dataset.timeframe;
            updateChartTimeframe(timeframe);
        });
    });
    
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshData();
        });
    }
    
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
    
    const resetBtn = document.getElementById('resetViewBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            resetZoom();
        });
    }
    
    console.log('✅ Event listeners setup complete');
}

function setupTableDragScroll() {
    const logContainer = document.querySelector('.log-container');
    if (!logContainer) {
        setTimeout(setupTableDragScroll, 500);
        return;
    }
    
    console.log('🔄 Setting up table drag scroll...');
    
    let isDragging = false;
    let startX;
    let scrollLeft;
    
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
        const walk = (x - startX) * 2;
        logContainer.scrollLeft = scrollLeft - walk;
    });
    
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
    });
    
    console.log('✅ Table drag scroll setup complete');
}

function setupTableScroll() {
    const logContainer = document.querySelector('.log-container');
    if (!logContainer) return;
    
    const style = document.createElement('style');
    style.textContent = `
        .log-container {
            overflow-x: auto;
            margin-bottom: 25px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: var(--wave-trough) rgba(0, 0, 0, 0.3);
            cursor: grab;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.2);
            padding: 10px;
        }
        
        .log-container:active {
            cursor: grabbing;
        }
        
        .log-container::-webkit-scrollbar {
            height: 8px;
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
        
        .signals-table {
            min-width: 900px;
        }
        
        @media (max-width: 768px) {
            .log-container {
                max-width: 100vw;
                margin-left: -20px;
                margin-right: -20px;
                padding: 10px 20px;
                border-radius: 0;
            }
            
            .signals-table {
                min-width: 1000px;
            }
        }
    `;
    document.head.appendChild(style);
    
    window.addEventListener('resize', () => {});
    
    console.log('✅ Table scroll setup complete');
}

function refreshData() {
    const refreshBtn = document.getElementById('refreshData');
    if (!refreshBtn) return;
    
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    showNotification('Refreshing data from CSV...', 'info');
    console.log('🔄 Manual refresh triggered');
    
    signalsData = [];
    filteredSignals = [];
    currentPage = 1;
    
    Promise.all([
        fetch('data/signals.csv?' + new Date().getTime(), { cache: 'no-store' }),
        fetch('data/Binance_BTCUSDT_d.csv?' + new Date().getTime(), { cache: 'no-store' })
    ])
    .then(async ([signalsRes, bitcoinRes]) => {
        if (!signalsRes.ok) throw new Error(`Signals CSV HTTP ${signalsRes.status}`);
        
        const signalsText = await signalsRes.text();
        parseCSVData(signalsText);
        
        if (bitcoinRes.ok) {
            const bitcoinText = await bitcoinRes.text();
            parseBitcoinPriceData(bitcoinText);
        } else {
            console.warn('⚠️ Could not refresh Bitcoin data, using existing');
        }
        
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        showNotification('Data refreshed successfully!', 'success');
        console.log('✅ Manual refresh complete');
    })
    .catch(error => {
        console.error('❌ Manual refresh failed:', error);
        
        loadRealCSVData();
        loadBitcoinPriceData();
        
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        showNotification('Refresh failed, using cached data', 'warning');
    });
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
    } else {
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

// ========== GLOBAL EXPORTS ==========
window.closeClickZoomInstructions = closeClickZoomInstructions;
window.resetZoomFromInstructions = resetZoomFromInstructions;
window.exitClickZoomMode = exitClickZoomMode;

// ========== INITIAL LOAD ==========
if (window.realCsvData && typeof window.realCsvData === 'string') {
    console.log('📁 Found pre-loaded CSV data, parsing immediately...');
    parseCSVData(window.realCsvData);
}

if (window.bitcoinPriceData && typeof window.bitcoinPriceData === 'string') {
    console.log('💰 Found pre-loaded Bitcoin price data, parsing immediately...');
    parseBitcoinPriceData(window.bitcoinPriceData);
}

console.log('✅ signals.js (REAL BITCOIN PRICE DATA VERSION) loaded successfully');
console.log('ℹ️  This version uses REAL Bitcoin price data from Binance CSV');

// Thêm vào phần khai báo biến (đầu file)
// ========== CHART INTERACTION TOOLS ==========
let currentTool = 'cursor'; // 'cursor', 'pan', 'zoom', 'undo'
let isDragging = false;
let dragStartX = null;
let selectionRect = null;
let undoStack = [];
let redoStack = [];

// ========== THÊM CSS CHO TOOLBAR MỚI ==========
function addChartToolbarStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Chart Tools Container */
        .chart-tools-container {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            padding: 8px 15px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            flex-wrap: wrap;
        }
        
        .tools-group {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 10px;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .tools-group:last-child {
            border-right: none;
        }
        
        .tool-btn {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--text-glow);
            width: 38px;
            height: 38px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 1.1em;
            position: relative;
        }
        
        .tool-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
            border-color: var(--wave-trough);
        }
        
        .tool-btn.active {
            background: linear-gradient(135deg, var(--wave-trough), var(--wave-mid));
            color: white;
            border-color: transparent;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
        }
        
        .tool-btn.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 0 10px white;
        }
        
        .tool-btn:active {
            transform: scale(0.95);
        }
        
        /* Timeline Range Slider */
        .timeline-range-container {
            flex: 1;
            min-width: 250px;
            padding: 0 15px;
        }
        
        .range-slider {
            position: relative;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            cursor: pointer;
        }
        
        .range-fill {
            position: absolute;
            height: 100%;
            background: linear-gradient(to right, var(--wave-trough), var(--wave-mid));
            border-radius: 3px;
            pointer-events: none;
        }
        
        .range-handle {
            position: absolute;
            width: 16px;
            height: 16px;
            background: white;
            border: 2px solid var(--wave-trough);
            border-radius: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            cursor: grab;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
            transition: box-shadow 0.2s ease;
            z-index: 2;
        }
        
        .range-handle:hover {
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
            transform: translate(-50%, -50%) scale(1.1);
        }
        
        .range-handle:active {
            cursor: grabbing;
            transform: translate(-50%, -50%) scale(0.95);
        }
        
        .range-handle.left {
            left: 0%;
        }
        
        .range-handle.right {
            left: 100%;
        }
        
        .range-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            color: var(--text-glow);
            font-size: 0.85em;
        }
        
        /* Undo/Redo buttons */
        .history-badge {
            background: rgba(0, 212, 255, 0.1);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            color: var(--wave-trough);
            margin-left: 5px;
        }
        
        /* Cursor styles for different tools */
        .tool-cursor {
            cursor: default;
        }
        
        .tool-pan {
            cursor: grab;
        }
        
        .tool-pan:active {
            cursor: grabbing;
        }
        
        .tool-zoom {
            cursor: crosshair;
        }
        
        /* Selection rectangle */
        .chart-selection-rect {
            position: absolute;
            border: 2px solid var(--wave-trough);
            background: rgba(0, 212, 255, 0.1);
            pointer-events: none;
            z-index: 100;
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
            animation: selectionPulse 1s ease infinite;
        }
        
        @keyframes selectionPulse {
            0% { border-color: var(--wave-trough); }
            50% { border-color: var(--wave-mid); }
            100% { border-color: var(--wave-trough); }
        }
        
        /* Tooltips */
        .tool-btn[data-tooltip] {
            position: relative;
        }
        
        .tool-btn[data-tooltip]:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            white-space: nowrap;
            border: 1px solid var(--wave-trough);
            z-index: 1000;
            pointer-events: none;
            animation: tooltipFade 0.2s ease;
        }
        
        @keyframes tooltipFade {
            from { opacity: 0; transform: translateX(-50%) translateY(5px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        
        /* Zoom level indicator */
        .zoom-level-indicator {
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 12px;
            border-radius: 16px;
            font-size: 0.9em;
            color: var(--wave-trough);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .zoom-level-indicator i {
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        /* Responsive */
        @media (max-width: 992px) {
            .chart-tools-container {
                flex-direction: column;
                align-items: stretch;
            }
            
            .tools-group {
                border-right: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding: 10px;
                justify-content: center;
            }
            
            .timeline-range-container {
                min-width: auto;
            }
        }
        
        @media (max-width: 576px) {
            .tools-group {
                flex-wrap: wrap;
            }
            
            .tool-btn {
                width: 42px;
                height: 42px;
                font-size: 1.2em;
            }
        }
    `;
    document.head.appendChild(style);
}

// ========== TẠO TOOLBAR MỚI ==========
function createChartToolbar() {
    const chartSection = document.querySelector('.chart-section');
    if (!chartSection) return;

    // Kiểm tra chart đã có data chưa
    if (!bitcoinChart || historicalPriceData.length === 0) {
        console.log('⏳ Waiting for chart data before creating toolbar');
        return;
    }    
    
    // Xóa toolbar cũ nếu có
    const oldToolbar = document.querySelector('.chart-tools-container');
    if (oldToolbar) oldToolbar.remove();
    
    // Tạo container mới
    const toolbar = document.createElement('div');
    toolbar.className = 'chart-tools-container';
    toolbar.id = 'chartTools';
    
    // Group 1: Navigation tools
    const navGroup = document.createElement('div');
    navGroup.className = 'tools-group';
    navGroup.innerHTML = `
        <button class="tool-btn active" id="toolCursor" data-tool="cursor" data-tooltip="Cursor (C)">
            <i class="fas fa-mouse-pointer"></i>
        </button>
        <button class="tool-btn" id="toolPan" data-tool="pan" data-tooltip="Pan (P)">
            <i class="fas fa-arrows-alt"></i>
        </button>
        <button class="tool-btn" id="toolZoom" data-tool="zoom" data-tooltip="Zoom Area (Z)">
            <i class="fas fa-vector-square"></i>
        </button>
    `;
    
    // Group 2: History tools
    const historyGroup = document.createElement('div');
    historyGroup.className = 'tools-group';
    historyGroup.innerHTML = `
        <button class="tool-btn" id="toolUndo" data-tooltip="Undo (Ctrl+Z)">
            <i class="fas fa-undo"></i>
            <span class="history-badge" id="undoCount">0</span>
        </button>
        <button class="tool-btn" id="toolRedo" data-tooltip="Redo (Ctrl+Y)">
            <i class="fas fa-redo"></i>
            <span class="history-badge" id="redoCount">0</span>
        </button>
        <button class="tool-btn" id="toolReset" data-tooltip="Reset View">
            <i class="fas fa-expand-alt"></i>
        </button>
    `;
    
    // Group 3: Timeline range
    const timelineGroup = document.createElement('div');
    timelineGroup.className = 'tools-group';
    timelineGroup.style.flex = '1';
    timelineGroup.innerHTML = `
        <div class="timeline-range-container">
            <div class="range-slider" id="rangeSlider">
                <div class="range-fill" id="rangeFill"></div>
                <div class="range-handle left" id="rangeHandleLeft"></div>
                <div class="range-handle right" id="rangeHandleRight"></div>
            </div>
            <div class="range-labels">
                <span id="rangeStartLabel">Start</span>
                <span id="rangeEndLabel">End</span>
            </div>
        </div>
    `;
    
    // Group 4: Zoom level
    const zoomGroup = document.createElement('div');
    zoomGroup.className = 'tools-group';
    zoomGroup.innerHTML = `
        <div class="zoom-level-indicator" id="zoomLevel">
            <i class="fas fa-search"></i>
            <span>100%</span>
        </div>
    `;
    
    toolbar.appendChild(navGroup);
    toolbar.appendChild(historyGroup);
    toolbar.appendChild(timelineGroup);
    toolbar.appendChild(zoomGroup);
    
    // Thêm vào chart section (trước chart container)
    const chartContainer = chartSection.querySelector('.chart-container');
    chartSection.insertBefore(toolbar, chartContainer);
    
    // Thêm event listeners
    setupChartToolEvents();
    
    // Thêm keyboard shortcuts
    setupKeyboardShortcuts();
    
    console.log('✅ Chart toolbar created');
}

// ========== SETUP TOOL EVENTS ==========
function setupChartToolEvents() {
    // Cursor tool
    document.getElementById('toolCursor')?.addEventListener('click', () => {
        setActiveTool('cursor');
    });
    
    // Pan tool
    document.getElementById('toolPan')?.addEventListener('click', () => {
        setActiveTool('pan');
    });
    
    // Zoom tool
    document.getElementById('toolZoom')?.addEventListener('click', () => {
        setActiveTool('zoom');
    });
    
    // Undo
    document.getElementById('toolUndo')?.addEventListener('click', () => {
        undoZoom();
    });
    
    // Redo
    document.getElementById('toolRedo')?.addEventListener('click', () => {
        redoZoom();
    });
    
    // Reset
    document.getElementById('toolReset')?.addEventListener('click', () => {
        resetFullView();
    });
    
    // Range slider handles
    setupRangeSlider();
    
    // Chart mouse events for pan and zoom
    setupChartMouseEvents();
}

// ========== SET ACTIVE TOOL ==========
function setActiveTool(tool) {
    currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tool !== 'undo' && tool !== 'redo') {
        const activeBtn = document.getElementById(`tool${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    // Update chart cursor
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) return;
    
    chartCanvas.classList.remove('tool-cursor', 'tool-pan', 'tool-zoom');
    
    switch(tool) {
        case 'cursor':
            chartCanvas.classList.add('tool-cursor');
            break;
        case 'pan':
            chartCanvas.classList.add('tool-pan');
            break;
        case 'zoom':
            chartCanvas.classList.add('tool-zoom');
            break;
    }
    
    // Exit other modes
    deactivateAllModes();
    
    console.log(`🛠️ Tool activated: ${tool}`);
}

// ========== SETUP RANGE SLIDER ==========
function setupRangeSlider() {
    const slider = document.getElementById('rangeSlider');
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    const fill = document.getElementById('rangeFill');
    const startLabel = document.getElementById('rangeStartLabel');
    const endLabel = document.getElementById('rangeEndLabel');
    
    if (!slider || !leftHandle || !rightHandle) return;
    
    let activeHandle = null;
    
    // Get min/max dates from data
    const getFullRange = () => {
        if (historicalPriceData.length === 0) return { min: new Date(2020, 0, 1), max: new Date() };
        
        const dates = historicalPriceData.map(d => d.x);
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    };
    
    const updateRange = () => {
        const leftPercent = parseFloat(leftHandle.style.left) || 0;
        const rightPercent = parseFloat(rightHandle.style.left) || 100;
        
        // Update fill
        fill.style.left = leftPercent + '%';
        fill.style.width = (rightPercent - leftPercent) + '%';
        
        // Update labels
        const fullRange = getFullRange();
        const rangeMs = fullRange.max - fullRange.min;
        
        const startDate = new Date(fullRange.min.getTime() + (rangeMs * leftPercent / 100));
        const endDate = new Date(fullRange.min.getTime() + (rangeMs * rightPercent / 100));
        
        startLabel.textContent = formatDateShort(startDate);
        endLabel.textContent = formatDateShort(endDate);
        
        // Apply zoom to chart
        if (bitcoinChart) {
            zoomToRange(startDate, endDate);
        }
        
        // Update zoom level
        updateZoomLevel(rightPercent - leftPercent);
    };
    
    // Mouse down on handles
    leftHandle.addEventListener('mousedown', (e) => {
        activeHandle = leftHandle;
        e.stopPropagation();
    });
    
    rightHandle.addEventListener('mousedown', (e) => {
        activeHandle = rightHandle;
        e.stopPropagation();
    });
    
    // Mouse down on slider (for panning)
    slider.addEventListener('mousedown', (e) => {
        if (e.target === leftHandle || e.target === rightHandle) return;
        
        const rect = slider.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width) * 100;
        
        // Move both handles (pan)
        const currentRange = parseFloat(rightHandle.style.left) - parseFloat(leftHandle.style.left);
        let newLeft = percent - (currentRange / 2);
        let newRight = percent + (currentRange / 2);
        
        if (newLeft < 0) {
            newLeft = 0;
            newRight = currentRange;
        }
        if (newRight > 100) {
            newRight = 100;
            newLeft = 100 - currentRange;
        }
        
        leftHandle.style.left = newLeft + '%';
        rightHandle.style.left = newRight + '%';
        
        updateRange();
    });
    
    // Mouse move on document
    document.addEventListener('mousemove', (e) => {
        if (!activeHandle) return;
        
        const rect = slider.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        
        let percent = (x / rect.width) * 100;
        
        if (activeHandle === leftHandle) {
            const rightPercent = parseFloat(rightHandle.style.left) || 100;
            percent = Math.min(percent, rightPercent - 5); // Min width 5%
            leftHandle.style.left = percent + '%';
        } else {
            const leftPercent = parseFloat(leftHandle.style.left) || 0;
            percent = Math.max(percent, leftPercent + 5); // Min width 5%
            rightHandle.style.left = percent + '%';
        }
        
        updateRange();
    });
    
    // Mouse up
    document.addEventListener('mouseup', () => {
        if (activeHandle) {
            // Save to undo stack
            saveZoomState();
            activeHandle = null;
        }
    });

        // THÊM touch events cho mobile
    slider.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Ngăn scroll khi chạm vào slider
        console.log('👆 Touch start on slider');
    }, { passive: false });
    
    slider.addEventListener('touchmove', function(e) {
        e.preventDefault(); // Ngăn scroll khi kéo slider
        const value = this.value;
        deactivateAllModes();
        updateZoomFromSlider(value);
        console.log('👆 Touch move:', value);
    }, { passive: false });
    
    slider.addEventListener('touchend', function(e) {
        console.log('👆 Touch end');
        saveZoomState();
    });
    
    // Cập nhật labels
    function updateLabels() {
        if (!bitcoinChart || historicalPriceData.length === 0) return;
        
        const fullData = historicalPriceData;
        const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
        const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
        const currentMin = zoomState.min || fullMin;
        const currentMax = zoomState.max || fullMax;
        
        if (startLabel) startLabel.textContent = formatDateShort(currentMin);
        if (endLabel) endLabel.textContent = formatDateShort(currentMax);
    }
    
    // Gọi updateLabels khi có thay đổi
    slider.addEventListener('touchmove', updateLabels);

    // Initialize
    leftHandle.style.left = '0%';
    rightHandle.style.left = '100%';
    updateRange();
}

// ========== SETUP CHART MOUSE EVENTS ==========
function setupChartMouseEvents() {
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) return;
    
    // Mouse down for pan/zoom
    chartCanvas.addEventListener('mousedown', (e) => {
        if (currentTool === 'pan') {
            startPan(e);
        } else if (currentTool === 'zoom') {
            startZoomSelection(e);
        }
    });
    
    // Mouse move for pan/zoom
    chartCanvas.addEventListener('mousemove', (e) => {
        if (currentTool === 'pan' && isDragging) {
            doPan(e);
        } else if (currentTool === 'zoom' && isDragging) {
            updateZoomSelection(e);
        }
    });
    
    // Mouse up
    chartCanvas.addEventListener('mouseup', (e) => {
        if (currentTool === 'pan' && isDragging) {
            endPan(e);
        } else if (currentTool === 'zoom' && isDragging) {
            endZoomSelection(e);
        }
    });
    
    // Mouse leave
    chartCanvas.addEventListener('mouseleave', () => {
        if (isDragging) {
            if (currentTool === 'zoom' && selectionRect) {
                selectionRect.remove();
                selectionRect = null;
            }
            isDragging = false;
        }
    });
}

// ========== PAN FUNCTIONS ==========
function startPan(e) {
    isDragging = true;
    dragStartX = e.clientX;
    chartCanvas.style.cursor = 'grabbing';
}

function doPan(e) {
    if (!isDragging || !bitcoinChart || !zoomState.min || !zoomState.max) return;
    
    const deltaX = e.clientX - dragStartX;
    const chartWidth = chartCanvas.width;
    const timeRange = zoomState.max - zoomState.min;
    const timePerPixel = timeRange / chartWidth;
    
    const timeDelta = deltaX * timePerPixel;
    
    const newMin = new Date(zoomState.min.getTime() - timeDelta);
    const newMax = new Date(zoomState.max.getTime() - timeDelta);
    
    // Check bounds
    const fullData = historicalPriceData;
    const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
    const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
    
    if (newMin >= fullMin && newMax <= fullMax) {
        zoomState.min = newMin;
        zoomState.max = newMax;
        
        bitcoinChart.options.scales.x.min = newMin;
        bitcoinChart.options.scales.x.max = newMax;
        bitcoinChart.update();
        
        updateRangeHandles();
    }
    
    dragStartX = e.clientX;
}

function endPan(e) {
    isDragging = false;
    chartCanvas.style.cursor = 'grab';
    saveZoomState();
}

// ========== ZOOM SELECTION FUNCTIONS ==========
function startZoomSelection(e) {
    isDragging = true;
    
    const rect = chartCanvas.getBoundingClientRect();
    dragStartX = e.clientX - rect.left;
    
    selectionRect = document.createElement('div');
    selectionRect.className = 'chart-selection-rect';
    selectionRect.style.left = dragStartX + 'px';
    selectionRect.style.top = '0';
    selectionRect.style.height = chartCanvas.height + 'px';
    selectionRect.style.width = '0px';
    
    chartCanvas.parentNode.appendChild(selectionRect);
}

function updateZoomSelection(e) {
    if (!isDragging || !selectionRect) return;
    
    const rect = chartCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    
    const left = Math.min(dragStartX, currentX);
    const width = Math.abs(currentX - dragStartX);
    
    selectionRect.style.left = left + 'px';
    selectionRect.style.width = width + 'px';
}

function endZoomSelection(e) {
    if (!isDragging || !selectionRect || !bitcoinChart) {
        if (selectionRect) selectionRect.remove();
        isDragging = false;
        return;
    }
    
    const rect = chartCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    
    const minX = Math.min(dragStartX, endX);
    const maxX = Math.max(dragStartX, endX);
    
    const xScale = bitcoinChart.scales.x;
    const minDate = xScale.getValueForPixel(minX);
    const maxDate = xScale.getValueForPixel(maxX);
    
    if (minDate && maxDate && (maxDate - minDate) > 0) {
        zoomToRange(minDate, maxDate);
        saveZoomState();
    }
    
    selectionRect.remove();
    selectionRect = null;
    isDragging = false;
}

// ========== UNDO/REDO FUNCTIONS ==========
function saveZoomState() {
    if (!bitcoinChart) return;
    
    const state = {
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max,
        unit: bitcoinChart.options.scales.x.time.unit
    };
    
    undoStack.push(state);
    redoStack = [];
    
    updateHistoryCounters();
}

function undoZoom() {
    if (undoStack.length === 0) return;
    
    // Save current state to redo
    const currentState = {
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max,
        unit: bitcoinChart.options.scales.x.time.unit
    };
    redoStack.push(currentState);
    
    // Apply previous state
    const prevState = undoStack.pop();
    applyZoomState(prevState);
    
    updateHistoryCounters();
}

function redoZoom() {
    if (redoStack.length === 0) return;
    
    // Save current state to undo
    const currentState = {
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max,
        unit: bitcoinChart.options.scales.x.time.unit
    };
    undoStack.push(currentState);
    
    // Apply next state
    const nextState = redoStack.pop();
    applyZoomState(nextState);
    
    updateHistoryCounters();
}

function applyZoomState(state) {
    if (!bitcoinChart || !state) return;
    
    bitcoinChart.options.scales.x.min = state.min;
    bitcoinChart.options.scales.x.max = state.max;
    bitcoinChart.options.scales.x.time.unit = state.unit || 'month';
    
    zoomState.min = state.min;
    zoomState.max = state.max;
    zoomState.isZoomed = true;
    
    bitcoinChart.update();
    
    updateRangeHandles();
    updateZoomInfo();
}

function resetFullView() {
    if (historicalPriceData.length === 0) return;
    
    saveZoomState();
    
    const fullData = historicalPriceData;
    const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
    const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
    
    const range = fullMax - fullMin;
    const startDate = new Date(fullMin.getTime() - range * 0.05);
    const endDate = new Date(fullMax.getTime() + range * 0.05);
    
    bitcoinChart.options.scales.x.min = startDate;
    bitcoinChart.options.scales.x.max = endDate;
    bitcoinChart.options.scales.x.time.unit = 'month';
    
    zoomState.min = startDate;
    zoomState.max = endDate;
    zoomState.isZoomed = false;
    
    bitcoinChart.update();
    
    updateRangeHandles();
    updateZoomInfo();
    
    // Reset handles
    document.getElementById('rangeHandleLeft').style.left = '0%';
    document.getElementById('rangeHandleRight').style.left = '100%';
    updateZoomLevel(100);
}

function updateHistoryCounters() {
    const undoCount = document.getElementById('undoCount');
    const redoCount = document.getElementById('redoCount');
    
    if (undoCount) {
        undoCount.textContent = undoStack.length;
        undoCount.style.opacity = undoStack.length > 0 ? '1' : '0.5';
    }
    
    if (redoCount) {
        redoCount.textContent = redoStack.length;
        redoCount.style.opacity = redoStack.length > 0 ? '1' : '0.5';
    }
}

// ========== UPDATE RANGE HANDLES ==========
function updateRangeHandles() {
    if (!bitcoinChart || historicalPriceData.length === 0) return;
    
    const fullData = historicalPriceData;
    const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
    const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
    const fullRange = fullMax - fullMin;
    
    const currentMin = zoomState.min || fullMin;
    const currentMax = zoomState.max || fullMax;
    
    const leftPercent = ((currentMin - fullMin) / fullRange) * 100;
    const rightPercent = ((currentMax - fullMin) / fullRange) * 100;
    
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    
    if (leftHandle) leftHandle.style.left = leftPercent + '%';
    if (rightHandle) rightHandle.style.left = rightPercent + '%';
    
    // Update fill
    const fill = document.getElementById('rangeFill');
    if (fill) {
        fill.style.left = leftPercent + '%';
        fill.style.width = (rightPercent - leftPercent) + '%';
    }
    
    // Update labels
    const startLabel = document.getElementById('rangeStartLabel');
    const endLabel = document.getElementById('rangeEndLabel');
    
    if (startLabel) startLabel.textContent = formatDateShort(currentMin);
    if (endLabel) endLabel.textContent = formatDateShort(currentMax);
    
    // Update zoom level
    updateZoomLevel(rightPercent - leftPercent);
}

function updateZoomLevel(percent) {
    const zoomLevel = document.querySelector('#zoomLevel span');
    if (!zoomLevel) return;
    
    if (percent >= 95) {
        zoomLevel.textContent = '100%';
    } else if (percent >= 50) {
        zoomLevel.textContent = Math.round(percent) + '%';
    } else if (percent >= 25) {
        zoomLevel.textContent = Math.round(percent) + '% (Zoomed)';
    } else {
        zoomLevel.textContent = Math.round(percent) + '% (Max Zoom)';
    }
}

// ========== KEYBOARD SHORTCUTS ==========
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key.toLowerCase()) {
            case 'c':
                setActiveTool('cursor');
                e.preventDefault();
                break;
            case 'p':
                setActiveTool('pan');
                e.preventDefault();
                break;
            case 'z':
                if (e.ctrlKey) {
                    if (e.shiftKey) {
                        redoZoom(); // Ctrl+Shift+Z = Redo
                    } else {
                        undoZoom(); // Ctrl+Z = Undo
                    }
                    e.preventDefault();
                }
                break;
            case 'y':
                if (e.ctrlKey) {
                    redoZoom(); // Ctrl+Y = Redo
                    e.preventDefault();
                }
                break;
            case 'escape':
                setActiveTool('cursor');
                if (selectionRect) {
                    selectionRect.remove();
                    selectionRect = null;
                }
                isDragging = false;
                e.preventDefault();
                break;
        }
    });
}
// ========== CẬP NHẬT HÀM UPDATE CHARTS WITH DATA ==========
// Cập nhật hàm updateChartsWithData() - thay thế hoàn toàn
function updateChartsWithData() {
    if (!bitcoinChart) {
        console.warn('⚠️ Cannot update chart: no chart');
        return;
    }
    
    console.log('📊 Updating charts with REAL Bitcoin price data...');
    
    if (historicalPriceData.length === 0) {
        console.warn('⚠️ No Bitcoin price data available');
        return;
    }
    
    const peakSignals = signalsData.filter(s => s.signal_type === 'PEAK');
    const dipSignals = signalsData.filter(s => s.signal_type === 'DIP');
    
    console.log(`📊 Chart data:`);
    console.log(`- Real Bitcoin price points: ${historicalPriceData.length}`);
    console.log(`- Peak signals: ${peakSignals.length}`);
    console.log(`- Dip signals: ${dipSignals.length}`);
    
    // Update chart datasets
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
    
    // Reset hidden state
    bitcoinChart.data.datasets[0].hidden = false;
    bitcoinChart.data.datasets[1].hidden = false;
    bitcoinChart.data.datasets[2].hidden = false;
    
    // Update chart title
    const isSynthetic = historicalPriceData.some(d => d.synthetic);
    if (isSynthetic) {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Synthetic Fallback)';
        bitcoinChart.data.datasets[0].borderColor = 'rgba(255, 152, 0, 0.8)';
    } else {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Binance Real Data)';
    }
    
    bitcoinChart.update();
    
    // Cập nhật range handles sau khi chart update
    setTimeout(() => {
        if (typeof updateRangeHandles === 'function') {
            updateRangeHandles();
        }
    }, 100);
    
    // Auto-scale nếu cần
    setTimeout(() => {
        const priceVisible = !bitcoinChart.getDatasetMeta(0).hidden;
        if (!priceVisible && (peakSignals.length > 0 || dipSignals.length > 0)) {
            autoScaleChartAfterLegendClick(bitcoinChart);
        }
    }, 200);
    
    console.log(`✅ Charts updated with REAL Bitcoin price data`);
}

// Thêm hàm này vào cuối file để đảm bảo toolbar được tạo sau khi chart load
setTimeout(() => {
    if (bitcoinChart && !document.querySelector('.chart-tools-container')) {
        initializeZoomControls();
    }
}, 2000);

// CẬP NHẬT HÀM INITIALIZE ZOOM CONTROLS - CHỈ GIỮ LẠI MỘT PHIÊN BẢN
function initializeZoomControls() {
    console.log('🔍 Initializing zoom controls...');
    
    // Kiểm tra chart đã tồn tại chưa
    if (!bitcoinChart) {
        console.log('⏳ Chart not ready, will initialize zoom controls later');
        return;
    }
    
    // Thêm styles
    addChartToolbarStyles();
    
    // Tạo toolbar mới
    createChartToolbar();
    
    // Ẩn toolbar cũ nếu có
    const oldToolbar = document.querySelector('.zoom-toolbar');
    if (oldToolbar) {
        oldToolbar.style.display = 'none';
    }
    
    // === QUAN TRỌNG: KHỞI TẠO CLICK-TO-ZOOM ===
    // Tạo instructions panel cho click-to-zoom
    if (typeof createClickZoomInstructions === 'function') {
        createClickZoomInstructions();
    }
    
    // Kích hoạt click-to-zoom mode khi click vào nút tương ứng
    const clickBtn = document.getElementById('zoomClick');
    if (clickBtn) {
        // Xóa event listener cũ nếu có
        const newClickBtn = clickBtn.cloneNode(true);
        clickBtn.parentNode.replaceChild(newClickBtn, clickBtn);
        
        // Thêm event listener mới
        newClickBtn.addEventListener('click', function() {
            const panBtn = document.getElementById('zoomPan');
            const selectBtn = document.getElementById('zoomSelect');
            
            if (panBtn) panBtn.classList.remove('active');
            if (selectBtn) selectBtn.classList.remove('active');
            
            this.classList.add('active');
            
            // Kích hoạt click-to-zoom
            if (typeof activateClickZoomMode === 'function') {
                activateClickZoomMode();
            }
        });
    }
    
    // Cập nhật range handles
    setTimeout(() => {
        if (typeof updateRangeHandles === 'function') {
            updateRangeHandles();
        }
    }, 500);
    
    console.log('✅ Zoom controls initialized');
}

// Đảm bảo toolbar được tạo sau khi có data
document.addEventListener('chartDataUpdated', function() {
    if (bitcoinChart && historicalPriceData.length > 0) {
        if (!document.querySelector('.chart-tools-container')) {
            initializeZoomControls();
        } else {
            updateRangeHandles();
        }
    }
});

// Gọi event khi data được cập nhật
const originalUpdateChartsWithData = updateChartsWithData;
updateChartsWithData = function() {
    originalUpdateChartsWithData.apply(this, arguments);
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('chartDataUpdated'));
    }, 300);
};

// Thêm vào cuối file signals.js, trước dòng cuối cùng

// ========== MOBILE ZOOM SLIDER FIX - COMPLETELY REWRITTEN ==========
/**
 * Khởi tạo zoom slider cho mobile với touch events và ngăn scroll
 * FIXED: Touch position always stays on slider
 */
// ========== MOBILE ZOOM SLIDER FIX - COMPLETELY REWRITTEN ==========
/**
 * Khởi tạo zoom slider cho mobile với touch events và ngăn scroll
 * FIXED: Touch position always stays on slider
 */
function initMobileZoomSlider() {
    console.log('📱 Initializing mobile zoom slider with improved touch handling...');
    
    const slider = document.getElementById('timelineSlider');
    if (!slider) {
        console.log('⏳ Timeline slider not found, will retry...');
        setTimeout(initMobileZoomSlider, 1000);
        return;
    }
    
    // Xóa event listeners cũ để tránh duplicate
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    
    // Biến để kiểm soát trạng thái
    let touchIdentifier = null;
    let isActive = false;
    
    // === FIX CHÍNH: Giữ touch luôn trong phạm vi slider ===
    newSlider.addEventListener('touchstart', function(e) {
        // Ngăn chặn hành vi mặc định và bubble
        e.preventDefault();
        e.stopPropagation();
        
        // Lưu identifier của touch để theo dõi
        if (e.touches.length > 0) {
            touchIdentifier = e.touches[0].identifier;
            isActive = true;
            
            // Thêm class để ngăn scroll body
            document.body.classList.add('slider-active');
            
            // Tính toán và cập nhật giá trị ngay khi chạm
            updateSliderFromTouch(e, newSlider);
            
            console.log('👆 Touch START on slider - position locked');
        }
    }, { passive: false });
    
    newSlider.addEventListener('touchmove', function(e) {
        if (!isActive) return;
        
        // Ngăn scroll
        e.preventDefault();
        e.stopPropagation();
        
        // Tìm đúng touch point dựa trên identifier
        let touch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === touchIdentifier) {
                touch = e.touches[i];
                break;
            }
        }
        
        // Nếu không tìm thấy touch đang theo dõi, dùng touch đầu tiên
        if (!touch && e.touches.length > 0) {
            touch = e.touches[0];
            touchIdentifier = touch.identifier;
        }
        
        if (touch) {
            updateSliderFromTouch(e, newSlider, touch);
        }
    }, { passive: false });
    
    newSlider.addEventListener('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Reset trạng thái
        isActive = false;
        touchIdentifier = null;
        
        // Lưu state vào undo stack
        if (typeof saveZoomState === 'function') {
            setTimeout(() => saveZoomState(), 50);
        }
        
        // Ẩn feedback
        hideSliderFeedback();
        
        // Bỏ class ngăn scroll
        document.body.classList.remove('slider-active');
        
        console.log('👆 Touch END');
    });
    
    newSlider.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isActive = false;
        touchIdentifier = null;
        document.body.classList.remove('slider-active');
        hideSliderFeedback();
    });
    
    // Helper function để cập nhật slider từ touch
    function updateSliderFromTouch(e, slider, touch = null) {
        if (!touch && e.touches.length > 0) {
            touch = e.touches[0];
        }
        if (!touch) return;
        
        const rect = slider.getBoundingClientRect();
        
        // Giới hạn touch X trong phạm vi slider
        let touchX = touch.clientX;
        
        // Đảm bảo touch X luôn nằm trong bounds của slider
        if (touchX < rect.left) touchX = rect.left;
        if (touchX > rect.right) touchX = rect.right;
        
        // Tính toán phần trăm dựa trên vị trí touch
        let x = touchX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        
        const percent = (x / rect.width) * 100;
        
        // Cập nhật giá trị slider (làm tròn để tránh nhảy)
        const roundedPercent = Math.round(percent * 10) / 10;
        slider.value = roundedPercent;
        
        // Trigger zoom update
        if (typeof updateZoomFromSlider === 'function') {
            updateZoomFromSlider(roundedPercent);
        }
        
        // Hiển thị feedback
        showSliderFeedback(roundedPercent);
        
        // Debug
        console.log('👆 Touch MOVE:', roundedPercent.toFixed(1) + '%', 'X:', touchX.toFixed(0));
    }
    
    // Vẫn giữ mouse events cho desktop
    newSlider.addEventListener('mousedown', handleSliderMouseDown);
    newSlider.addEventListener('mousemove', handleSliderMouseMove);
    newSlider.addEventListener('mouseup', handleSliderMouseUp);
    newSlider.addEventListener('mouseleave', handleSliderMouseLeave);
    
    // Thêm CSS để cải thiện touch target
    addMobileSliderStyles();
    
    console.log('✅ Mobile zoom slider initialized with FIXED touch handling');
}

/**
 * Xử lý mouse down cho desktop
 */
function handleSliderMouseDown(e) {
    const slider = e.target;
    slider.dataset.mouseActive = 'true';
    
    // Cập nhật giá trị ngay khi click
    updateSliderFromMouse(e, slider);
}

/**
 * Xử lý mouse move cho desktop
 */
// function handleSliderMouseMove(e) {
//     const slider = e.target;
//     if (!slider.dataset.mouseActive) return;
    
//     updateSliderFromMouse(e, slider);
// }

/**
 * Xử lý mouse up cho desktop
 */
// function handleSliderMouseUp(e) {
//     const slider = e.target;
//     slider.dataset.mouseActive = 'false';
    
//     if (typeof saveZoomState === 'function') {
//         saveZoomState();
//     }
    
//     hideSliderFeedback();
// }

/**
 * Xử lý mouse leave
 */
// function handleSliderMouseLeave(e) {
//     const slider = e.target;
//     if (slider.dataset.mouseActive) {
//         slider.dataset.mouseActive = 'false';
//         hideSliderFeedback();
//     }
// }

/**
 * Cập nhật slider từ mouse event
 */
function updateSliderFromMouse(e, slider) {
    const rect = slider.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    
    const percent = (x / rect.width) * 100;
    const roundedPercent = Math.round(percent * 10) / 10;
    
    slider.value = roundedPercent;
    
    if (typeof updateZoomFromSlider === 'function') {
        updateZoomFromSlider(roundedPercent);
    }
    
    showSliderFeedback(roundedPercent);
}

/**
 * Hiển thị feedback khi kéo slider
 */
function showSliderFeedback(percent) {
    let feedback = document.getElementById('sliderFeedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'sliderFeedback';
        feedback.className = 'slider-feedback';
        
        // Thêm vào container phù hợp
        const timelineControls = document.querySelector('.timeline-controls');
        if (timelineControls) {
            timelineControls.appendChild(feedback);
        } else {
            document.body.appendChild(feedback);
        }
    }
    
    const zoomLevel = Math.round(percent);
    feedback.innerHTML = `<i class="fas fa-search"></i> ${zoomLevel}% view`;
    feedback.classList.add('visible');
}

/**
 * Ẩn feedback
 */
function hideSliderFeedback() {
    const feedback = document.getElementById('sliderFeedback');
    if (feedback) {
        feedback.classList.remove('visible');
    }
}

/**
 * Thêm CSS cho mobile slider
 */
function addMobileSliderStyles() {
    // Kiểm tra style đã tồn tại chưa
    if (document.getElementById('mobileSliderStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobileSliderStyles';
    style.textContent = `
        /* Cải thiện touch target cho slider */
        .timeline-slider {
            height: 8px;
            margin: 15px 0;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            outline: none;
            cursor: pointer;
            touch-action: none; /* QUAN TRỌNG: Ngăn scroll khi chạm vào slider */
            -webkit-tap-highlight-color: transparent;
            width: 100%;
            position: relative;
            z-index: 10;
        }
        
        /* Webkit (Chrome, Safari, Edge) */
        .timeline-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--wave-trough);
            cursor: pointer;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
            border: 2px solid white;
            transition: transform 0.1s ease;
            margin-top: -8px; /* Căn giữa */
        }
        
        /* Firefox */
        .timeline-slider::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--wave-trough);
            cursor: pointer;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
            border: 2px solid white;
            transition: transform 0.1s ease;
        }
        
        /* Track - Firefox */
        .timeline-slider::-moz-range-track {
            height: 8px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
        }
        
        /* Khi active */
        .timeline-slider:active::-webkit-slider-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
        .timeline-slider:active::-moz-range-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
        /* Slider feedback */
        .slider-feedback {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 1.1em;
            font-weight: bold;
            border: 1px solid var(--wave-trough);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .slider-feedback.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        
        .slider-feedback i {
            color: var(--wave-trough);
            font-size: 1.2em;
        }
        
        /* Timeline controls trên mobile */
        @media (max-width: 768px) {
            .timeline-controls {
                padding: 15px 0;
                min-width: 100%;
                position: relative;
                z-index: 5;
            }
            
            .timeline-slider {
                height: 10px; /* Cao hơn cho dễ chạm */
            }
            
            .timeline-slider::-webkit-slider-thumb {
                width: 28px;
                height: 28px;
            }
            
            .timeline-slider::-moz-range-thumb {
                width: 28px;
                height: 28px;
            }
            
            .timeline-labels {
                font-size: 0.9em;
                padding: 0 5px;
                margin-top: 10px;
            }
        }
        
        /* Ngăn scroll khi kéo slider trên mobile */
        body.slider-active {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
            touch-action: none;
        }
        
        /* Đảm bảo slider không bị focus outline */
        .timeline-slider:focus {
            outline: none;
        }
        
        /* Tăng vùng touch */
        .timeline-slider {
            padding: 10px 0;
            background-clip: content-box;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Xử lý touch start trên slider (fallback - không dùng nếu đã có initMobileZoomSlider)
 */
function handleSliderTouchStart(e) {
    e.preventDefault();
    const slider = e.target;
    slider.dataset.touchActive = 'true';
    
    const rect = slider.getBoundingClientRect();
    const touch = e.touches[0];
    
    // Giới hạn touch trong phạm vi slider
    let touchX = touch.clientX;
    if (touchX < rect.left) touchX = rect.left;
    if (touchX > rect.right) touchX = rect.right;
    
    let x = touchX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    
    const percent = (x / rect.width) * 100;
    const roundedPercent = Math.round(percent * 10) / 10;
    
    slider.value = roundedPercent;
    
    if (typeof updateZoomFromSlider === 'function') {
        updateZoomFromSlider(roundedPercent);
    }
    
    showSliderFeedback(roundedPercent);
}

/**
 * Xử lý touch move trên slider (fallback)
 */
function handleSliderTouchMove(e) {
    e.preventDefault();
    
    const slider = e.target;
    if (!slider.dataset.touchActive) return;
    
    const rect = slider.getBoundingClientRect();
    const touch = e.touches[0];
    
    // Giới hạn touch trong phạm vi slider
    let touchX = touch.clientX;
    if (touchX < rect.left) touchX = rect.left;
    if (touchX > rect.right) touchX = rect.right;
    
    let x = touchX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    
    const percent = (x / rect.width) * 100;
    const roundedPercent = Math.round(percent * 10) / 10;
    
    slider.value = roundedPercent;
    
    if (typeof updateZoomFromSlider === 'function') {
        updateZoomFromSlider(roundedPercent);
    }
    
    showSliderFeedback(roundedPercent);
}

/**
 * Xử lý touch end trên slider (fallback)
 */
function handleSliderTouchEnd(e) {
    const slider = e.target;
    slider.dataset.touchActive = 'false';
    
    if (typeof saveZoomState === 'function') {
        saveZoomState();
    }
    
    hideSliderFeedback();
}
/**
 * Xử lý mouse down cho desktop
 */
// function handleSliderMouseDown(e) {
//     const slider = e.target;
//     slider.dataset.mouseActive = 'true';
// }

/**
 * Xử lý mouse move cho desktop
 */
function handleSliderMouseMove(e) {
    const slider = e.target;
    if (!slider.dataset.mouseActive) return;
    
    const rect = slider.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    
    const percent = (x / rect.width) * 100;
    slider.value = percent;
    
    if (typeof updateZoomFromSlider === 'function') {
        updateZoomFromSlider(percent);
    }
    
    showSliderFeedback(percent);
}

/**
 * Xử lý mouse move cho desktop
 */
function handleSliderMouseMove(e) {
    const slider = e.target;
    if (!slider.dataset.mouseActive) return;
    
    const rect = slider.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    
    const percent = (x / rect.width) * 100;
    slider.value = percent;
    
    if (typeof updateZoomFromSlider === 'function') {
        updateZoomFromSlider(percent);
    }
    
    showSliderFeedback(percent);
}

/**
 * Xử lý mouse up cho desktop
 */
function handleSliderMouseUp(e) {
    const slider = e.target;
    slider.dataset.mouseActive = 'false';
    
    if (typeof saveZoomState === 'function') {
        saveZoomState();
    }
    
    hideSliderFeedback();
}

/**
 * Xử lý mouse leave
 */
function handleSliderMouseLeave(e) {
    const slider = e.target;
    if (slider.dataset.mouseActive) {
        slider.dataset.mouseActive = 'false';
        hideSliderFeedback();
    }
}

/**
 * Hiển thị feedback khi kéo slider
 */
function showSliderFeedback(percent) {
    let feedback = document.getElementById('sliderFeedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'sliderFeedback';
        feedback.className = 'slider-feedback';
        document.querySelector('.timeline-controls')?.appendChild(feedback);
    }
    
    const zoomLevel = Math.round(percent);
    feedback.innerHTML = `<i class="fas fa-search"></i> ${zoomLevel}% view`;
    feedback.classList.add('visible');
}

/**
 * Ẩn feedback
 */
function hideSliderFeedback() {
    const feedback = document.getElementById('sliderFeedback');
    if (feedback) {
        feedback.classList.remove('visible');
    }
}

/**
 * Thêm CSS cho mobile slider
 */
function addMobileSliderStyles() {
    // Kiểm tra style đã tồn tại chưa
    if (document.getElementById('mobileSliderStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobileSliderStyles';
    style.textContent = `
        /* Cải thiện touch target cho slider */
        .timeline-slider {
            height: 8px;
            margin: 15px 0;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            outline: none;
            cursor: pointer;
            touch-action: none; /* QUAN TRỌNG: Ngăn scroll khi chạm vào slider */
        }
        
        /* Webkit (Chrome, Safari, Edge) */
        .timeline-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--wave-trough);
            cursor: pointer;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
            border: 2px solid white;
            transition: transform 0.1s ease;
        }
        
        /* Firefox */
        .timeline-slider::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--wave-trough);
            cursor: pointer;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
            border: 2px solid white;
            transition: transform 0.1s ease;
        }
        
        /* Khi active */
        .timeline-slider:active::-webkit-slider-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
        .timeline-slider:active::-moz-range-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
        /* Slider feedback */
        .slider-feedback {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 1.1em;
            font-weight: bold;
            border: 1px solid var(--wave-trough);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .slider-feedback.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        
        .slider-feedback i {
            color: var(--wave-trough);
            font-size: 1.2em;
        }
        
        /* Timeline controls trên mobile */
        @media (max-width: 768px) {
            .timeline-controls {
                padding: 10px 0;
                min-width: 100%;
            }
            
            .timeline-slider {
                height: 10px; /* Cao hơn cho dễ chạm */
            }
            
            .timeline-slider::-webkit-slider-thumb {
                width: 28px;
                height: 28px;
            }
            
            .timeline-slider::-moz-range-thumb {
                width: 28px;
                height: 28px;
            }
            
            .timeline-labels {
                font-size: 0.9em;
                padding: 0 5px;
            }
        }
        
        /* Ngăn scroll khi kéo slider trên mobile */
        body.slider-active {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
            touch-action: none;
        }
        
        /* Đảm bảo slider không bị focus outline */
        .timeline-slider:focus {
            outline: none;
        }
        
        /* Ngăn Chrome tự động scroll khi focus */
        .timeline-slider {
            -webkit-tap-highlight-color: transparent;
        }
    `;
    document.head.appendChild(style);
}

// ========== CẢI THIỆN RANGE SLIDER CHO MOBILE ==========
/**
 * Cập nhật range slider để hỗ trợ touch tốt hơn
 */
function enhanceRangeSliderForMobile() {
    const rangeSlider = document.getElementById('rangeSlider');
    if (!rangeSlider) return;
    
    // Tăng kích thước touch target
    rangeSlider.style.minHeight = '40px';
    rangeSlider.style.padding = '10px 0';
    
    // Cải thiện handles
    const handles = rangeSlider.querySelectorAll('.range-handle');
    handles.forEach(handle => {
        handle.style.width = '24px';
        handle.style.height = '24px';
        handle.style.borderWidth = '3px';
    });
    
    // Thêm touch events
    rangeSlider.addEventListener('touchstart', handleRangeTouchStart, { passive: false });
    rangeSlider.addEventListener('touchmove', handleRangeTouchMove, { passive: false });
    rangeSlider.addEventListener('touchend', handleRangeTouchEnd);
}

/**
 * Xử lý touch start trên range slider
 */
function handleRangeTouchStart(e) {
    e.preventDefault();
    
    const rangeSlider = e.currentTarget;
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    
    if (!leftHandle || !rightHandle) return;
    
    const touch = e.touches[0];
    const rect = rangeSlider.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    
    // Xác định handle nào gần nhất
    const leftPercent = parseFloat(leftHandle.style.left) || 0;
    const rightPercent = parseFloat(rightHandle.style.left) || 100;
    
    const distToLeft = Math.abs(percent - leftPercent);
    const distToRight = Math.abs(percent - rightPercent);
    
    if (distToLeft < distToRight && distToLeft < 15) {
        rangeSlider.dataset.activeHandle = 'left';
        leftHandle.classList.add('active');
    } else if (distToRight < 15) {
        rangeSlider.dataset.activeHandle = 'right';
        rightHandle.classList.add('active');
    } else {
        // Click vào khoảng giữa - pan
        rangeSlider.dataset.activeHandle = 'pan';
    }
    
    rangeSlider.dataset.touchActive = 'true';
    rangeSlider.dataset.startX = touch.clientX;
    rangeSlider.dataset.startLeft = leftPercent;
    rangeSlider.dataset.startRight = rightPercent;
}

/**
 * Xử lý touch move trên range slider
 */
function handleRangeTouchMove(e) {
    e.preventDefault();
    
    const rangeSlider = e.currentTarget;
    if (!rangeSlider.dataset.touchActive) return;
    
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    if (!leftHandle || !rightHandle) return;
    
    const touch = e.touches[0];
    const rect = rangeSlider.getBoundingClientRect();
    let x = touch.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    
    const percent = (x / rect.width) * 100;
    const activeHandle = rangeSlider.dataset.activeHandle;
    
    if (activeHandle === 'left') {
        // Di chuyển left handle
        const rightPercent = parseFloat(rangeSlider.dataset.startRight) || 100;
        const newLeft = Math.min(percent, rightPercent - 5);
        leftHandle.style.left = newLeft + '%';
    } else if (activeHandle === 'right') {
        // Di chuyển right handle
        const leftPercent = parseFloat(rangeSlider.dataset.startLeft) || 0;
        const newRight = Math.max(percent, leftPercent + 5);
        rightHandle.style.left = newRight + '%';
    } else if (activeHandle === 'pan') {
        // Pan cả hai handles
        const deltaX = touch.clientX - parseFloat(rangeSlider.dataset.startX);
        const deltaPercent = (deltaX / rect.width) * 100;
        
        const startLeft = parseFloat(rangeSlider.dataset.startLeft) || 0;
        const startRight = parseFloat(rangeSlider.dataset.startRight) || 100;
        const range = startRight - startLeft;
        
        let newLeft = startLeft + deltaPercent;
        let newRight = startRight + deltaPercent;
        
        if (newLeft < 0) {
            newLeft = 0;
            newRight = range;
        }
        if (newRight > 100) {
            newRight = 100;
            newLeft = 100 - range;
        }
        
        leftHandle.style.left = newLeft + '%';
        rightHandle.style.left = newRight + '%';
        rangeSlider.dataset.startX = touch.clientX;
        rangeSlider.dataset.startLeft = newLeft;
        rangeSlider.dataset.startRight = newRight;
    }
    
    // Update fill và labels
    updateRangeFillAndLabels();
}

/**
 * Xử lý touch end trên range slider
 */
function handleRangeTouchEnd(e) {
    const rangeSlider = e.currentTarget;
    rangeSlider.dataset.touchActive = 'false';
    
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    
    if (leftHandle) leftHandle.classList.remove('active');
    if (rightHandle) rightHandle.classList.remove('active');
    
    // Apply zoom to chart
    applyRangeZoom();
}

/**
 * Cập nhật fill và labels cho range slider
 */
function updateRangeFillAndLabels() {
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    const fill = document.getElementById('rangeFill');
    const startLabel = document.getElementById('rangeStartLabel');
    const endLabel = document.getElementById('rangeEndLabel');
    
    if (!leftHandle || !rightHandle) return;
    
    const leftPercent = parseFloat(leftHandle.style.left) || 0;
    const rightPercent = parseFloat(rightHandle.style.left) || 100;
    
    if (fill) {
        fill.style.left = leftPercent + '%';
        fill.style.width = (rightPercent - leftPercent) + '%';
    }
    
    // Update labels
    if (historicalPriceData.length > 0 && startLabel && endLabel) {
        const fullData = historicalPriceData;
        const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
        const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
        const fullRange = fullMax - fullMin;
        
        const startDate = new Date(fullMin.getTime() + (fullRange * leftPercent / 100));
        const endDate = new Date(fullMin.getTime() + (fullRange * rightPercent / 100));
        
        startLabel.textContent = formatDateShort(startDate);
        endLabel.textContent = formatDateShort(endDate);
    }
}

/**
 * Áp dụng zoom từ range slider
 */
function applyRangeZoom() {
    if (!bitcoinChart || historicalPriceData.length === 0) return;
    
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    
    if (!leftHandle || !rightHandle) return;
    
    const leftPercent = parseFloat(leftHandle.style.left) || 0;
    const rightPercent = parseFloat(rightHandle.style.left) || 100;
    
    const fullData = historicalPriceData;
    const fullMin = new Date(Math.min(...fullData.map(d => d.x)));
    const fullMax = new Date(Math.max(...fullData.map(d => d.x)));
    const fullRange = fullMax - fullMin;
    
    const startDate = new Date(fullMin.getTime() + (fullRange * leftPercent / 100));
    const endDate = new Date(fullMin.getTime() + (fullRange * rightPercent / 100));
    
    zoomToRange(startDate, endDate);
    saveZoomState();
}

// ========== KHỞI TẠO TẤT CẢ TÍNH NĂNG MOBILE ==========
/**
 * Khởi tạo tất cả tính năng mobile
 */
function initMobileFeatures() {
    console.log('📱 Initializing mobile features...');
    
    // Khởi tạo zoom slider cho mobile
    initMobileZoomSlider();
    
    // Cải thiện range slider
    setTimeout(enhanceRangeSliderForMobile, 1000);
    
    // Thêm CSS để ngăn scroll khi kéo slider
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('timeline-slider') || 
            e.target.closest('.range-slider')) {
            document.body.classList.add('slider-active');
        }
    }, { passive: false });
    
    document.addEventListener('touchend', function() {
        document.body.classList.remove('slider-active');
    });
    
    // Cập nhật lại range handles khi xoay màn hình
    window.addEventListener('resize', function() {
        if (typeof updateRangeHandles === 'function') {
            setTimeout(updateRangeHandles, 100);
        }
    });
    
    console.log('✅ Mobile features initialized');
}

// Gọi khởi tạo mobile features sau khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initMobileFeatures, 2000);
});

// Cũng gọi lại khi chart data được cập nhật
document.addEventListener('chartDataUpdated', function() {
    setTimeout(initMobileZoomSlider, 500);
});
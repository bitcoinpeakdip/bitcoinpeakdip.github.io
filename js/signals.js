// EWS Signals Page JavaScript - FIXED VERSION (REMOVED CLICK-TO-ZOOM)
// Bitcoin PeakDip Early Warning System Signals Log
// Version: 1.4.28 - Removed Click-to-Zoom

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

// ========== ZOOM STATE ==========
let zoomState = {
    min: null,
    max: null,
    isZoomed: false,
    zoomHistory: []
};

// ========== CHART INTERACTION TOOLS ==========
let currentTool = 'cursor'; // 'cursor', 'pan', 'zoom'
let isDragging = false;
let dragStartX = null;
let selectionRect = null;
let undoStack = [];
let redoStack = [];

// ========== VERSION CONTROL & CACHE BUSTING ==========
const APP_VERSION = '1.4.28';
const VERSION_KEY = 'peakdip_version';

// Thêm ở đầu file sau các khai báo biến
console.log('🚀 signals.js loaded - Debug mode ON');

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
    
    // Setup drag scroll
    setTimeout(setupTableDragScroll, 1000);
    
    // Add zoom styles
    addZoomStyles();
    
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

    // Sau khi parse xong, kiểm tra dữ liệu
    setTimeout(() => {
        if (validateHistoricalData()) {
            console.log('✅ Historical price data validated');
            // Cập nhật range handles
            if (typeof updateRangeHandles === 'function') {
                setTimeout(updateRangeHandles, 500);
            }
        } else {
            console.warn('⚠️ Historical price data has invalid dates');
        }
    }, 100);    
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
    if (signalsData.length === 0) {
        // Nếu không có data, vẫn hiển thị mặc định
        const elements = {
            peakCount: document.getElementById('peakCount'),
            dipCount: document.getElementById('dipCount'),
            totalCount: document.getElementById('totalCount'),
            accuracyRate: document.getElementById('accuracyRate')
        };
        
        if (elements.peakCount) elements.peakCount.textContent = '0';
        if (elements.dipCount) elements.dipCount.textContent = '0';
        if (elements.totalCount) elements.totalCount.textContent = '0';
        if (elements.accuracyRate) elements.accuracyRate.textContent = '98%';
        return;
    }
    
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const totalCount = signalsData.length;
    
    // Luôn hiển thị 98% cho Noise Accuracy Reduce
    const accuracyRate = 98;
    
    // Cập nhật tất cả các elements có thể có
    const elements = {
        peakCount: document.getElementById('peakCount'),
        dipCount: document.getElementById('dipCount'),
        totalCount: document.getElementById('totalCount'),
        accuracyRate: document.getElementById('accuracyRate')
    };
    
    // Cập nhật
    if (elements.peakCount) elements.peakCount.textContent = peakCount;
    if (elements.dipCount) elements.dipCount.textContent = dipCount;
    if (elements.totalCount) elements.totalCount.textContent = totalCount;
    if (elements.accuracyRate) elements.accuracyRate.textContent = accuracyRate + '%';
    
    // Cập nhật percentages (nếu còn)
    const peakPercentage = document.getElementById('peakPercentage');
    const dipPercentage = document.getElementById('dipPercentage');
    if (peakPercentage && dipPercentage) {
        peakPercentage.textContent = totalCount > 0 ? Math.round((peakCount / totalCount) * 100) + '%' : '0%';
        dipPercentage.textContent = totalCount > 0 ? Math.round((dipCount / totalCount) * 100) + '%' : '0%';
    }
    
    // Cập nhật confidence stats (nếu còn)
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    
    if (document.getElementById('highConfidence')) {
        document.getElementById('highConfidence').textContent = highConfidence;
    }
    if (document.getElementById('mediumConfidence')) {
        document.getElementById('mediumConfidence').textContent = mediumConfidence;
    }
    
    // Log để debug
    console.log('📊 Stats updated:', {
        peak: peakCount,
        dip: dipCount,
        total: totalCount,
        accuracy: accuracyRate + '%'
    });
}

// Thêm hàm kiểm tra để đảm bảo stats được cập nhật khi data thay đổi
function ensureStatsUpdated() {
    // Kiểm tra xem stats đã được cập nhật chưa
    const peakElement = document.getElementById('peakCount');
    if (peakElement && peakElement.textContent === '0' && signalsData.length > 0) {
        console.log('🔄 Forcing stats update...');
        updateStats();
    }
}

// Gọi ensureStatsUpdated sau khi data load
setTimeout(ensureStatsUpdated, 2000);
setTimeout(ensureStatsUpdated, 5000);

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
                    hidden: false
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
                    hidden: false
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
                    hidden: false
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
                        filter: function(item, chart) {
                            return true;
                        }
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        
                        const meta = ci.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                        
                        ci.update();
                        
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

function autoScaleChartAfterLegendClick(chart) {
    if (!chart) return;
    
    const priceDatasetVisible = !chart.getDatasetMeta(0).hidden;
    const peakDatasetVisible = !chart.getDatasetMeta(1).hidden;
    const dipDatasetVisible = !chart.getDatasetMeta(2).hidden;
    
    console.log('🔄 Auto-scaling chart - Price visible:', priceDatasetVisible, 
                'Peak visible:', peakDatasetVisible, 'Dip visible:', dipDatasetVisible);
    
    if (!priceDatasetVisible && (peakDatasetVisible || dipDatasetVisible)) {
        console.log('📊 Scaling chart to fit Peak/Dip signals only');
        
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
            const dates = allSignals.map(s => s.x.getTime());
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            
            const range = maxDate - minDate;
            const padding = range * 0.1;
            
            const startDate = new Date(minDate.getTime() - padding);
            const endDate = new Date(maxDate.getTime() + padding);
            
            console.log(`📅 Scaling to signals range: ${formatDate(startDate)} - ${formatDate(endDate)}`);
            
            zoomState.zoomHistory.push({
                min: chart.options.scales.x.min,
                max: chart.options.scales.x.max
            });
            
            chart.options.scales.x.min = startDate;
            chart.options.scales.x.max = endDate;
            
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
            
            updateZoomInfo();
            updateTimelineSlider();
            
            showNotification('Chart auto-scaled to show all signals', 'info', 2000);
        }
    }
    else if (priceDatasetVisible && !zoomState.isZoomed) {
        console.log('📊 Restoring full price range');
        
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
    
    bitcoinChart.data.datasets[0].hidden = false;
    bitcoinChart.data.datasets[1].hidden = false;
    bitcoinChart.data.datasets[2].hidden = false;
    
    const isSynthetic = historicalPriceData.some(d => d.synthetic);
    if (isSynthetic) {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Synthetic Fallback)';
        bitcoinChart.data.datasets[0].borderColor = 'rgba(255, 152, 0, 0.8)';
    } else {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Binance Real Data)';
    }
    
    bitcoinChart.update();
    
    setTimeout(() => {
        const priceVisible = !bitcoinChart.getDatasetMeta(0).hidden;
        if (!priceVisible && (peakSignals.length > 0 || dipSignals.length > 0)) {
            autoScaleChartAfterLegendClick(bitcoinChart);
        }
    }, 100);
    
    console.log(`✅ Charts updated with REAL Bitcoin price data`);
}

const additionalStyle = document.createElement('style');
additionalStyle.textContent = `
    .chartjs-legend li:hover {
        opacity: 0.8;
        cursor: pointer;
    }
    
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
        zoomChart(0.8);
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', function() {
        zoomChart(1.2);
    });
    
    document.getElementById('zoomReset')?.addEventListener('click', function() {
        resetZoom();
    });
    
    document.getElementById('zoomPan')?.addEventListener('click', function() {
        togglePanMode();
    });
    
    document.getElementById('zoomSelect')?.addEventListener('click', function() {
        toggleSelectMode();
    });
    
    const timelineSlider = document.getElementById('timelineSlider');
    if (timelineSlider) {
        timelineSlider.addEventListener('input', function() {
            updateZoomFromSlider(this.value);
        });
    }
    
    document.getElementById('zoomBack')?.addEventListener('click', function() {
        zoomBack();
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
    if (!bitcoinChart || !historicalPriceData || historicalPriceData.length === 0) {
        console.log('⏳ Cannot update zoom: no data');
        return;
    }
    
    try {
        const fullData = historicalPriceData;
        
        const validDates = fullData
            .map(d => d.x)
            .filter(date => date && date instanceof Date && !isNaN(date.getTime()));
        
        if (validDates.length === 0) {
            console.warn('No valid dates for zoom');
            return;
        }
        
        const fullMin = new Date(Math.min(...validDates.map(d => d.getTime())));
        const fullMax = new Date(Math.max(...validDates.map(d => d.getTime())));
        
        if (isNaN(fullMin.getTime()) || isNaN(fullMax.getTime())) {
            console.error('Invalid full range dates for zoom');
            return;
        }
        
        const fullRange = fullMax - fullMin;
        
        const visiblePercentage = Math.min(100, Math.max(0, parseFloat(value) || 100)) / 100;
        
        if (isNaN(visiblePercentage) || visiblePercentage < 0.01) {
            return;
        }
        
        const visibleRange = fullRange * visiblePercentage;
        
        const startDate = new Date(fullMax.getTime() - visibleRange);
        const endDate = new Date(fullMax.getTime());
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('Invalid zoom dates calculated');
            return;
        }
        
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
        
        const startLabel = document.getElementById('zoomStartLabel');
        const endLabel = document.getElementById('zoomEndLabel');
        if (startLabel) startLabel.textContent = formatDateShort(startDate);
        if (endLabel) endLabel.textContent = formatDateShort(endDate);
        
    } catch (error) {
        console.error('Error in updateZoomFromSlider:', error);
    }
}

function validateHistoricalData() {
    if (!historicalPriceData || historicalPriceData.length === 0) {
        console.warn('No historical price data');
        return false;
    }
    
    const sampleSize = Math.min(5, historicalPriceData.length);
    let validCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        const point = historicalPriceData[i];
        if (point && point.x && point.x instanceof Date && !isNaN(point.x.getTime())) {
            validCount++;
        }
    }
    
    console.log(`Data validation: ${validCount}/${sampleSize} valid dates`);
    return validCount > 0;
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
    
    // Xóa hoàn toàn phần xử lý resetBtn vì đã xóa khỏi HTML
    
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
    if (!date) {
        return 'N/A';
    }
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid';
    }
    
    try {
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
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date error';
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
// Xóa các dòng export click-to-zoom

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

// ========== CHART INTERACTION TOOLS ==========
// Đã khai báo ở đầu file

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

// ========== TẠO TOOLBAR MỚI VỚI ZOOM CONTROLS Ở BOTTOM ==========
function createChartToolbar() {
    const chartSection = document.querySelector('.chart-section');
    if (!chartSection) return;

    if (!bitcoinChart || historicalPriceData.length === 0) {
        console.log('⏳ Waiting for chart data before creating toolbar');
        return;
    }    
    
    const oldToolbar = document.querySelector('.zoom-toolbar');
    if (oldToolbar) oldToolbar.remove();
    
    const oldBottomContainer = document.querySelector('.zoom-bottom-container');
    if (oldBottomContainer) oldBottomContainer.remove();
    
    const chartContainer = chartSection.querySelector('.chart-container');
    if (!chartContainer) return;
    
    const bottomContainer = document.createElement('div');
    bottomContainer.className = 'zoom-bottom-container';
    bottomContainer.id = 'zoomBottomContainer';
    
    const useRangeSlider = document.querySelector('.chart-tools-container') !== null;
    
    if (useRangeSlider) {
        bottomContainer.innerHTML = `
            <div class="zoom-controls-group">
                <button class="zoom-btn" id="zoomIn" data-tooltip="Zoom In (Ctrl+↑)">
                    <i class="fas fa-search-plus"></i>
                </button>
                <button class="zoom-btn" id="zoomOut" data-tooltip="Zoom Out (Ctrl+↓)">
                    <i class="fas fa-search-minus"></i>
                </button>
                <button class="zoom-btn" id="zoomPan" data-tooltip="Pan Mode (P)">
                    <i class="fas fa-arrows-alt"></i>
                </button>
                <button class="zoom-btn" id="zoomSelect" data-tooltip="Select Area (Z)">
                    <i class="fas fa-vector-square"></i>
                </button>
                <button class="zoom-btn" id="zoomBack" data-tooltip="Undo Zoom">
                    <i class="fas fa-undo-alt"></i>
                </button>
            </div>
            
            <div class="range-slider-container">
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
            
            <div class="reset-btn-group">
                <div class="zoom-info" id="zoomInfo">Full Range</div>
                <button class="zoom-btn" id="zoomReset" data-tooltip="Reset Zoom">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
        `;
    } else {
        bottomContainer.innerHTML = `
            <div class="zoom-controls-group">
                <button class="zoom-btn" id="zoomIn" data-tooltip="Zoom In (Ctrl+↑)">
                    <i class="fas fa-search-plus"></i>
                </button>
                <button class="zoom-btn" id="zoomOut" data-tooltip="Zoom Out (Ctrl+↓)">
                    <i class="fas fa-search-minus"></i>
                </button>
                <button class="zoom-btn" id="zoomPan" data-tooltip="Pan Mode (P)">
                    <i class="fas fa-arrows-alt"></i>
                </button>
                <button class="zoom-btn" id="zoomSelect" data-tooltip="Select Area (Z)">
                    <i class="fas fa-vector-square"></i>
                </button>
                <button class="zoom-btn" id="zoomBack" data-tooltip="Undo Zoom">
                    <i class="fas fa-undo-alt"></i>
                </button>
            </div>
            
            <div class="timeline-controls">
                <input type="range" id="timelineSlider" class="timeline-slider" min="0" max="100" value="100">
                <div class="timeline-labels">
                    <span id="zoomStartLabel">Start</span>
                    <span id="zoomEndLabel">End</span>
                </div>
            </div>
            
            <div class="reset-btn-group">
                <div class="zoom-info" id="zoomInfo">Full Range</div>
                <button class="zoom-btn" id="zoomReset" data-tooltip="Reset Zoom">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
        `;
    }
    
    chartContainer.parentNode.insertBefore(bottomContainer, chartContainer.nextSibling);
    
    const oldToolsContainer = document.querySelector('.chart-tools-container');
    if (oldToolsContainer) {
        oldToolsContainer.style.display = 'none';
    }
    
    setupZoomEventListeners();
    
    if (useRangeSlider) {
        setTimeout(() => {
            setupRangeSlider();
            updateRangeHandles();
        }, 100);
    }
    
    setTimeout(() => {
        updateTimelineSlider();
        updateZoomInfo();
    }, 200);
    
    console.log('✅ Zoom controls moved to bottom');
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
    
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tool !== 'undo' && tool !== 'redo') {
        const activeBtn = document.getElementById(`tool${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
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
        
        fill.style.left = leftPercent + '%';
        fill.style.width = (rightPercent - leftPercent) + '%';
        
        const fullRange = getFullRange();
        const rangeMs = fullRange.max - fullRange.min;
        
        const startDate = new Date(fullRange.min.getTime() + (rangeMs * leftPercent / 100));
        const endDate = new Date(fullRange.min.getTime() + (rangeMs * rightPercent / 100));
        
        startLabel.textContent = formatDateShort(startDate);
        endLabel.textContent = formatDateShort(endDate);
        
        if (bitcoinChart) {
            zoomToRange(startDate, endDate);
        }
        
        updateZoomLevel(rightPercent - leftPercent);
    };
    
    leftHandle.addEventListener('mousedown', (e) => {
        activeHandle = leftHandle;
        e.stopPropagation();
    });
    
    rightHandle.addEventListener('mousedown', (e) => {
        activeHandle = rightHandle;
        e.stopPropagation();
    });
    
    slider.addEventListener('mousedown', (e) => {
        if (e.target === leftHandle || e.target === rightHandle) return;
        
        const rect = slider.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width) * 100;
        
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
    
    document.addEventListener('mousemove', (e) => {
        if (!activeHandle) return;
        
        const rect = slider.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        
        let percent = (x / rect.width) * 100;
        
        if (activeHandle === leftHandle) {
            const rightPercent = parseFloat(rightHandle.style.left) || 100;
            percent = Math.min(percent, rightPercent - 5);
            leftHandle.style.left = percent + '%';
        } else {
            const leftPercent = parseFloat(leftHandle.style.left) || 0;
            percent = Math.max(percent, leftPercent + 5);
            rightHandle.style.left = percent + '%';
        }
        
        updateRange();
    });
    
    document.addEventListener('mouseup', () => {
        if (activeHandle) {
            saveZoomState();
            activeHandle = null;
        }
    });

    slider.addEventListener('touchstart', function(e) {
        e.preventDefault();
        console.log('👆 Touch start on slider');
    }, { passive: false });
    
    slider.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const value = this.value;
        updateZoomFromSlider(value);
        console.log('👆 Touch move:', value);
    }, { passive: false });
    
    slider.addEventListener('touchend', function(e) {
        console.log('👆 Touch end');
        saveZoomState();
    });
    
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
    
    slider.addEventListener('touchmove', updateLabels);

    leftHandle.style.left = '0%';
    rightHandle.style.left = '100%';
    updateRange();
}

// ========== SETUP CHART MOUSE EVENTS ==========
function setupChartMouseEvents() {
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) return;
    
    chartCanvas.addEventListener('mousedown', (e) => {
        if (currentTool === 'pan') {
            startPan(e);
        } else if (currentTool === 'zoom') {
            startZoomSelection(e);
        }
    });
    
    chartCanvas.addEventListener('mousemove', (e) => {
        if (currentTool === 'pan' && isDragging) {
            doPan(e);
        } else if (currentTool === 'zoom' && isDragging) {
            updateZoomSelection(e);
        }
    });
    
    chartCanvas.addEventListener('mouseup', (e) => {
        if (currentTool === 'pan' && isDragging) {
            endPan(e);
        } else if (currentTool === 'zoom' && isDragging) {
            endZoomSelection(e);
        }
    });
    
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
    
    const currentState = {
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max,
        unit: bitcoinChart.options.scales.x.time.unit
    };
    redoStack.push(currentState);
    
    const prevState = undoStack.pop();
    applyZoomState(prevState);
    
    updateHistoryCounters();
}

function redoZoom() {
    if (redoStack.length === 0) return;
    
    const currentState = {
        min: bitcoinChart.options.scales.x.min,
        max: bitcoinChart.options.scales.x.max,
        unit: bitcoinChart.options.scales.x.time.unit
    };
    undoStack.push(currentState);
    
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

function updateRangeHandles() {
    if (!bitcoinChart || !historicalPriceData || historicalPriceData.length === 0) {
        console.log('⏳ Cannot update range handles: no data');
        return;
    }
    
    try {
        const fullData = historicalPriceData;
        
        const validDates = fullData
            .map(d => d.x)
            .filter(date => date && date instanceof Date && !isNaN(date.getTime()));
        
        if (validDates.length === 0) {
            console.warn('No valid dates in historical data');
            return;
        }
        
        const fullMin = new Date(Math.min(...validDates.map(d => d.getTime())));
        const fullMax = new Date(Math.max(...validDates.map(d => d.getTime())));
        
        if (isNaN(fullMin.getTime()) || isNaN(fullMax.getTime())) {
            console.error('Invalid full range dates');
            return;
        }
        
        const fullRange = fullMax - fullMin;
        
        let currentMin = zoomState.min;
        let currentMax = zoomState.max;
        
        if (!currentMin || !currentMax || isNaN(currentMin.getTime()) || isNaN(currentMax.getTime())) {
            currentMin = fullMin;
            currentMax = fullMax;
        }
        
        const leftPercent = Math.max(0, Math.min(100, ((currentMin - fullMin) / fullRange) * 100));
        const rightPercent = Math.max(0, Math.min(100, ((currentMax - fullMin) / fullRange) * 100));
        
        const leftHandle = document.getElementById('rangeHandleLeft');
        const rightHandle = document.getElementById('rangeHandleRight');
        
        if (leftHandle) leftHandle.style.left = leftPercent + '%';
        if (rightHandle) rightHandle.style.left = rightPercent + '%';
        
        const fill = document.getElementById('rangeFill');
        if (fill) {
            fill.style.left = leftPercent + '%';
            fill.style.width = (rightPercent - leftPercent) + '%';
        }
        
        const startLabel = document.getElementById('rangeStartLabel');
        const endLabel = document.getElementById('rangeEndLabel');
        
        if (startLabel && endLabel) {
            startLabel.textContent = formatDateShort(currentMin);
            endLabel.textContent = formatDateShort(currentMax);
        }
        
        updateZoomLevel(rightPercent - leftPercent);
        
    } catch (error) {
        console.error('Error in updateRangeHandles:', error);
    }
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
                        redoZoom();
                    } else {
                        undoZoom();
                    }
                    e.preventDefault();
                }
                break;
            case 'y':
                if (e.ctrlKey) {
                    redoZoom();
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
    
    bitcoinChart.data.datasets[0].hidden = false;
    bitcoinChart.data.datasets[1].hidden = false;
    bitcoinChart.data.datasets[2].hidden = false;
    
    const isSynthetic = historicalPriceData.some(d => d.synthetic);
    if (isSynthetic) {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Synthetic Fallback)';
        bitcoinChart.data.datasets[0].borderColor = 'rgba(255, 152, 0, 0.8)';
    } else {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Binance Real Data)';
    }
    
    bitcoinChart.update();
    
    setTimeout(() => {
        if (typeof updateRangeHandles === 'function') {
            updateRangeHandles();
        }
    }, 100);
    
    setTimeout(() => {
        const priceVisible = !bitcoinChart.getDatasetMeta(0).hidden;
        if (!priceVisible && (peakSignals.length > 0 || dipSignals.length > 0)) {
            autoScaleChartAfterLegendClick(bitcoinChart);
        }
    }, 200);
    
    console.log(`✅ Charts updated with REAL Bitcoin price data`);
}

setTimeout(() => {
    if (bitcoinChart && !document.querySelector('.chart-tools-container')) {
        initializeZoomControls();
    }
}, 2000);

function initializeZoomControls() {
    console.log('🔍 Initializing zoom controls...');
    
    if (!bitcoinChart) {
        console.log('⏳ Chart not ready, will initialize zoom controls later');
        return;
    }
    
    addChartToolbarStyles();
    
    createChartToolbar();
    
    const oldToolbar = document.querySelector('.zoom-toolbar');
    if (oldToolbar) {
        oldToolbar.style.display = 'none';
    }
    
    setTimeout(() => {
        if (typeof updateRangeHandles === 'function') {
            updateRangeHandles();
        }
        if (typeof updateTimelineSlider === 'function') {
            updateTimelineSlider();
        }
    }, 500);
    
    console.log('✅ Zoom controls initialized with bottom layout');
}

document.addEventListener('chartDataUpdated', function() {
    if (bitcoinChart && historicalPriceData.length > 0) {
        if (!document.querySelector('.chart-tools-container')) {
            initializeZoomControls();
        } else {
            updateRangeHandles();
        }
    }
});

const originalUpdateChartsWithData = updateChartsWithData;
updateChartsWithData = function() {
    originalUpdateChartsWithData.apply(this, arguments);
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('chartDataUpdated'));
    }, 300);
};

// ========== MOBILE ZOOM SLIDER FIX - COMPLETELY REWRITTEN ==========
function initMobileZoomSlider() {
    console.log('📱 Initializing mobile zoom slider with improved touch handling...');
    
    const slider = document.getElementById('timelineSlider');
    if (!slider) {
        console.log('⏳ Timeline slider not found, will retry...');
        setTimeout(initMobileZoomSlider, 1000);
        return;
    }
    
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    
    let touchIdentifier = null;
    let isActive = false;
    
    newSlider.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.touches.length > 0) {
            touchIdentifier = e.touches[0].identifier;
            isActive = true;
            
            document.body.classList.add('slider-active');
            
            updateSliderFromTouch(e, newSlider);
            
            console.log('👆 Touch START on slider - position locked');
        }
    }, { passive: false });
    
    newSlider.addEventListener('touchmove', function(e) {
        if (!isActive) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        let touch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === touchIdentifier) {
                touch = e.touches[i];
                break;
            }
        }
        
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
        
        isActive = false;
        touchIdentifier = null;
        
        if (typeof saveZoomState === 'function') {
            setTimeout(() => saveZoomState(), 50);
        }
        
        hideSliderFeedback();
        
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
    
    newSlider.addEventListener('mousedown', handleSliderMouseDown);
    newSlider.addEventListener('mousemove', handleSliderMouseMove);
    newSlider.addEventListener('mouseup', handleSliderMouseUp);
    newSlider.addEventListener('mouseleave', handleSliderMouseLeave);
    
    addMobileSliderStyles();
    
    console.log('✅ Mobile zoom slider initialized with FIXED touch handling');
}

function updateSliderFromTouch(e, slider, touch = null) {
    if (!touch && e.touches.length > 0) {
        touch = e.touches[0];
    }
    if (!touch) return;
    
    try {
        const rect = slider.getBoundingClientRect();
        
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
        
    } catch (error) {
        console.error('Error updating slider from touch:', error);
    }
}

function handleSliderMouseDown(e) {
    const slider = e.target;
    slider.dataset.mouseActive = 'true';
    
    updateSliderFromMouse(e, slider);
}

function handleSliderMouseMove(e) {
    const slider = e.target;
    if (!slider.dataset.mouseActive) return;
    
    updateSliderFromMouse(e, slider);
}

function handleSliderMouseUp(e) {
    const slider = e.target;
    slider.dataset.mouseActive = 'false';
    
    if (typeof saveZoomState === 'function') {
        saveZoomState();
    }
    
    hideSliderFeedback();
}

function handleSliderMouseLeave(e) {
    const slider = e.target;
    if (slider.dataset.mouseActive) {
        slider.dataset.mouseActive = 'false';
        hideSliderFeedback();
    }
}

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

function showSliderFeedback(percent) {
    let feedback = document.getElementById('sliderFeedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'sliderFeedback';
        feedback.className = 'slider-feedback';
        
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

function hideSliderFeedback() {
    const feedback = document.getElementById('sliderFeedback');
    if (feedback) {
        feedback.classList.remove('visible');
    }
}

function addMobileSliderStyles() {
    if (document.getElementById('mobileSliderStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobileSliderStyles';
    style.textContent = `
        .timeline-slider {
            height: 8px;
            margin: 15px 0;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            outline: none;
            cursor: pointer;
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
            width: 100%;
            position: relative;
            z-index: 10;
        }
        
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
            margin-top: -8px;
        }
        
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
        
        .timeline-slider::-moz-range-track {
            height: 8px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
        }
        
        .timeline-slider:active::-webkit-slider-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
        .timeline-slider:active::-moz-range-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
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
        
        @media (max-width: 768px) {
            .timeline-controls {
                padding: 15px 0;
                min-width: 100%;
                position: relative;
                z-index: 5;
            }
            
            .timeline-slider {
                height: 10px;
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
        
        body.slider-active {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
            touch-action: none;
        }
        
        .timeline-slider:focus {
            outline: none;
        }
        
        .timeline-slider {
            padding: 10px 0;
            background-clip: content-box;
        }
    `;
    document.head.appendChild(style);
}

function handleSliderTouchStart(e) {
    e.preventDefault();
    const slider = e.target;
    slider.dataset.touchActive = 'true';
    
    const rect = slider.getBoundingClientRect();
    const touch = e.touches[0];
    
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

function handleSliderTouchMove(e) {
    e.preventDefault();
    
    const slider = e.target;
    if (!slider.dataset.touchActive) return;
    
    const rect = slider.getBoundingClientRect();
    const touch = e.touches[0];
    
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

function handleSliderTouchEnd(e) {
    const slider = e.target;
    slider.dataset.touchActive = 'false';
    
    if (typeof saveZoomState === 'function') {
        saveZoomState();
    }
    
    hideSliderFeedback();
}

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

function handleSliderMouseUp(e) {
    const slider = e.target;
    slider.dataset.mouseActive = 'false';
    
    if (typeof saveZoomState === 'function') {
        saveZoomState();
    }
    
    hideSliderFeedback();
}

function handleSliderMouseLeave(e) {
    const slider = e.target;
    if (slider.dataset.mouseActive) {
        slider.dataset.mouseActive = 'false';
        hideSliderFeedback();
    }
}

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

function hideSliderFeedback() {
    const feedback = document.getElementById('sliderFeedback');
    if (feedback) {
        feedback.classList.remove('visible');
    }
}

function addMobileSliderStyles() {
    if (document.getElementById('mobileSliderStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobileSliderStyles';
    style.textContent = `
        .timeline-slider {
            height: 8px;
            margin: 15px 0;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            outline: none;
            cursor: pointer;
            touch-action: none;
        }
        
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
        
        .timeline-slider:active::-webkit-slider-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
        .timeline-slider:active::-moz-range-thumb {
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.9);
        }
        
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
        
        @media (max-width: 768px) {
            .timeline-controls {
                padding: 10px 0;
                min-width: 100%;
            }
            
            .timeline-slider {
                height: 10px;
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
        
        body.slider-active {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
            touch-action: none;
        }
        
        .timeline-slider:focus {
            outline: none;
        }
        
        .timeline-slider {
            -webkit-tap-highlight-color: transparent;
        }
    `;
    document.head.appendChild(style);
}

function enhanceRangeSliderForMobile() {
    const rangeSlider = document.getElementById('rangeSlider');
    if (!rangeSlider) return;
    
    rangeSlider.style.minHeight = '40px';
    rangeSlider.style.padding = '10px 0';
    
    const handles = rangeSlider.querySelectorAll('.range-handle');
    handles.forEach(handle => {
        handle.style.width = '24px';
        handle.style.height = '24px';
        handle.style.borderWidth = '3px';
    });
    
    rangeSlider.addEventListener('touchstart', handleRangeTouchStart, { passive: false });
    rangeSlider.addEventListener('touchmove', handleRangeTouchMove, { passive: false });
    rangeSlider.addEventListener('touchend', handleRangeTouchEnd);
}

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
        rangeSlider.dataset.activeHandle = 'pan';
    }
    
    rangeSlider.dataset.touchActive = 'true';
    rangeSlider.dataset.startX = touch.clientX;
    rangeSlider.dataset.startLeft = leftPercent;
    rangeSlider.dataset.startRight = rightPercent;
}

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
        const rightPercent = parseFloat(rangeSlider.dataset.startRight) || 100;
        const newLeft = Math.min(percent, rightPercent - 5);
        leftHandle.style.left = newLeft + '%';
    } else if (activeHandle === 'right') {
        const leftPercent = parseFloat(rangeSlider.dataset.startLeft) || 0;
        const newRight = Math.max(percent, leftPercent + 5);
        rightHandle.style.left = newRight + '%';
    } else if (activeHandle === 'pan') {
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
    
    updateRangeFillAndLabels();
}

function handleRangeTouchEnd(e) {
    const rangeSlider = e.currentTarget;
    rangeSlider.dataset.touchActive = 'false';
    
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    
    if (leftHandle) leftHandle.classList.remove('active');
    if (rightHandle) rightHandle.classList.remove('active');
    
    applyRangeZoom();
}

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
    
    if (startLabel && endLabel) {
        if (historicalPriceData && historicalPriceData.length > 0) {
            try {
                const fullData = historicalPriceData;
                
                const validDates = fullData
                    .map(d => d.x)
                    .filter(date => date && date instanceof Date && !isNaN(date.getTime()));
                
                if (validDates.length === 0) {
                    startLabel.textContent = 'No data';
                    endLabel.textContent = 'No data';
                    return;
                }
                
                const fullMin = new Date(Math.min(...validDates.map(d => d.getTime())));
                const fullMax = new Date(Math.max(...validDates.map(d => d.getTime())));
                
                if (isNaN(fullMin.getTime()) || isNaN(fullMax.getTime())) {
                    startLabel.textContent = 'Invalid range';
                    endLabel.textContent = 'Invalid range';
                    return;
                }
                
                const fullRange = fullMax - fullMin;
                
                const startTime = fullMin.getTime() + (fullRange * leftPercent / 100);
                const endTime = fullMin.getTime() + (fullRange * rightPercent / 100);
                
                const startDate = new Date(startTime);
                const endDate = new Date(endTime);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    startLabel.textContent = 'Invalid date';
                    endLabel.textContent = 'Invalid date';
                    return;
                }
                
                startLabel.textContent = formatDateShort(startDate);
                endLabel.textContent = formatDateShort(endDate);
                
            } catch (error) {
                console.error('Error updating range labels:', error);
                startLabel.textContent = 'Error';
                endLabel.textContent = 'Error';
            }
        } else {
            startLabel.textContent = 'Loading...';
            endLabel.textContent = 'Loading...';
        }
    }
}

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

function initMobileFeatures() {
    console.log('📱 Initializing mobile features...');
    
    initMobileZoomSlider();
    
    setTimeout(enhanceRangeSliderForMobile, 1000);
    
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('timeline-slider') || 
            e.target.closest('.range-slider')) {
            document.body.classList.add('slider-active');
        }
    }, { passive: false });
    
    document.addEventListener('touchend', function() {
        document.body.classList.remove('slider-active');
    });
    
    window.addEventListener('resize', function() {
        if (typeof updateRangeHandles === 'function') {
            setTimeout(updateRangeHandles, 100);
        }
    });
    
    console.log('✅ Mobile features initialized');
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initMobileFeatures, 2000);
});

document.addEventListener('chartDataUpdated', function() {
    setTimeout(initMobileZoomSlider, 500);
});

function fixMobileZoomSlider() {
    console.log('🔧 Fixing mobile zoom slider...');
    
    const timelineSlider = document.getElementById('timelineSlider');
    const rangeSlider = document.getElementById('rangeSlider');
    
    if (rangeSlider && !document.querySelector('.range-slider-improved')) {
        console.log('📱 Adding touch support to range slider');
        
        rangeSlider.classList.add('range-slider-improved');
        
        rangeSlider.style.minHeight = '44px';
        rangeSlider.style.padding = '10px 0';
        rangeSlider.style.touchAction = 'none';
        
        const leftHandle = document.getElementById('rangeHandleLeft');
        const rightHandle = document.getElementById('rangeHandleRight');
        
        if (leftHandle && rightHandle) {
            [leftHandle, rightHandle].forEach(handle => {
                handle.style.width = '28px';
                handle.style.height = '28px';
                handle.style.borderWidth = '3px';
                handle.style.touchAction = 'none';
            });
        }
        
        setupRangeSliderTouchEvents();
    }
    
    if (timelineSlider && !timelineSlider.classList.contains('touch-fixed')) {
        console.log('📱 Re-initializing timeline slider with touch support');
        timelineSlider.classList.add('touch-fixed');
        initMobileZoomSlider();
    }
}

function setupRangeSliderTouchEvents() {
    const rangeSlider = document.getElementById('rangeSlider');
    const leftHandle = document.getElementById('rangeHandleLeft');
    const rightHandle = document.getElementById('rangeHandleRight');
    
    if (!rangeSlider || !leftHandle || !rightHandle) return;
    
    let activeTouch = null;
    let activeHandleType = null;
    let startLeft, startRight, startX;
    
    rangeSlider.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = rangeSlider.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const percent = (touchX / rect.width) * 100;
            
            const leftPercent = parseFloat(leftHandle.style.left) || 0;
            const rightPercent = parseFloat(rightHandle.style.left) || 100;
            
            const distToLeft = Math.abs(percent - leftPercent);
            const distToRight = Math.abs(percent - rightPercent);
            
            if (distToLeft < distToRight && distToLeft < 20) {
                activeHandleType = 'left';
                leftHandle.classList.add('active');
            } else if (distToRight < 20) {
                activeHandleType = 'right';
                rightHandle.classList.add('active');
            } else {
                activeHandleType = 'pan';
            }
            
            activeTouch = touch.identifier;
            startLeft = leftPercent;
            startRight = rightPercent;
            startX = touch.clientX;
            
            document.body.classList.add('slider-active');
        }
    }, { passive: false });
    
    rangeSlider.addEventListener('touchmove', function(e) {
        e.preventDefault();
        
        if (activeTouch === null) return;
        
        let touch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === activeTouch) {
                touch = e.touches[i];
                break;
            }
        }
        
        if (!touch && e.touches.length > 0) {
            touch = e.touches[0];
            activeTouch = touch.identifier;
        }
        
        if (!touch) return;
        
        const rect = rangeSlider.getBoundingClientRect();
        let touchX = touch.clientX - rect.left;
        touchX = Math.max(0, Math.min(rect.width, touchX));
        
        const percent = (touchX / rect.width) * 100;
        
        if (activeHandleType === 'left') {
            const newLeft = Math.min(percent, startRight - 5);
            leftHandle.style.left = newLeft + '%';
        } 
        else if (activeHandleType === 'right') {
            const newRight = Math.max(percent, startLeft + 5);
            rightHandle.style.left = newRight + '%';
        } 
        else if (activeHandleType === 'pan') {
            const deltaX = touch.clientX - startX;
            const deltaPercent = (deltaX / rect.width) * 100;
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
        }
        
        updateRangeFillAndLabels();
        
        showRangeFeedback(percent, activeHandleType);
        
    }, { passive: false });
    
    rangeSlider.addEventListener('touchend', function(e) {
        e.preventDefault();
        
        activeTouch = null;
        activeHandleType = null;
        
        leftHandle.classList.remove('active');
        rightHandle.classList.remove('active');
        
        document.body.classList.remove('slider-active');
        hideRangeFeedback();
        
        applyRangeZoom();
    });
    
    rangeSlider.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        
        activeTouch = null;
        activeHandleType = null;
        
        leftHandle.classList.remove('active');
        rightHandle.classList.remove('active');
        
        document.body.classList.remove('slider-active');
        hideRangeFeedback();
    });
}

function showRangeFeedback(percent, type) {
    let feedback = document.getElementById('rangeFeedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'rangeFeedback';
        feedback.className = 'slider-feedback';
        document.querySelector('.chart-tools-container')?.appendChild(feedback);
    }
    
    let message = '';
    if (type === 'left') {
        message = `Start: ${Math.round(percent)}%`;
    } else if (type === 'right') {
        message = `End: ${Math.round(percent)}%`;
    } else {
        message = `Pan: ${Math.round(percent)}%`;
    }
    
    feedback.innerHTML = `<i class="fas fa-arrows-alt-h"></i> ${message}`;
    feedback.classList.add('visible');
}

function hideRangeFeedback() {
    const feedback = document.getElementById('rangeFeedback');
    if (feedback) {
        feedback.classList.remove('visible');
    }
}

function addMobileRangeStyles() {
    if (document.getElementById('mobileRangeStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobileRangeStyles';
    style.textContent = `
        @media (max-width: 768px) {
            .range-slider {
                min-height: 44px !important;
                padding: 10px 0 !important;
                touch-action: none !important;
            }
            
            .range-handle {
                width: 32px !important;
                height: 32px !important;
                border-width: 3px !important;
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.8) !important;
            }
            
            .range-handle.active {
                transform: translate(-50%, -50%) scale(1.2) !important;
                background: var(--wave-trough) !important;
            }
            
            .range-labels {
                font-size: 0.9em !important;
                margin-top: 12px !important;
            }
            
            .slider-feedback {
                bottom: 20px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                padding: 12px 24px !important;
                font-size: 1em !important;
                border-radius: 30px !important;
                background: rgba(0, 0, 0, 0.95) !important;
                border: 2px solid var(--wave-trough) !important;
                z-index: 10001 !important;
            }
        }
        
        body.slider-active {
            overflow: hidden !important;
            position: fixed !important;
            width: 100% !important;
            height: 100% !important;
            touch-action: none !important;
        }
        
        .range-handle.active {
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.9) !important;
            animation: handlePulse 1s infinite !important;
        }
        
        @keyframes handlePulse {
            0% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.5); }
            50% { box-shadow: 0 0 30px rgba(0, 212, 255, 0.9); }
            100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.5); }
        }
    `;
    
    document.head.appendChild(style);
}

const originalCreateChartToolbar = createChartToolbar;

createChartToolbar = function() {
    const result = originalCreateChartToolbar.apply(this, arguments);
    
    setTimeout(() => {
        fixMobileZoomSlider();
        addMobileRangeStyles();
    }, 500);
    
    return result;
};

document.addEventListener('DOMContentLoaded', function() {
    addMobileRangeStyles();
    
    setTimeout(() => {
        fixMobileZoomSlider();
    }, 3000);
    
    setTimeout(() => {
        fixMobileZoomSlider();
    }, 5000);
});

document.addEventListener('chartDataUpdated', function() {
    setTimeout(fixMobileZoomSlider, 500);
});

console.log('✅ Mobile zoom slider fix loaded');

// ========== FIX PAN MODE - THÊM VÀO CUỐI FILE signals.js ==========

/**
 * FIX: Pan Mode không hoạt động
 * Nguyên nhân: Biến chartCanvas không được định nghĩa trong các hàm pan
 * Giải pháp: Sửa lại các hàm startPan, doPan, endPan
 */

// Lưu lại reference đến chart canvas
let panCanvas = null;

// Override hàm startPan
function startPan(e) {
    console.log('🖱️ Pan mode STARTED');
    
    // Lấy canvas reference
    if (!panCanvas) {
        panCanvas = document.getElementById('bitcoinChart');
    }
    
    if (!panCanvas || !bitcoinChart || !zoomState.min || !zoomState.max) {
        console.warn('⚠️ Cannot pan: missing chart data');
        return;
    }
    
    isDragging = true;
    dragStartX = e.clientX;
    
    // Lưu trạng thái zoom hiện tại
    if (!panZoomStartState) {
        panZoomStartState = {
            min: new Date(zoomState.min.getTime()),
            max: new Date(zoomState.max.getTime())
        };
    }
    
    panCanvas.style.cursor = 'grabbing';
    
    // Ngăn chặn sự kiện mặc định
    e.preventDefault();
    e.stopPropagation();
}

// Lưu trạng thái zoom khi bắt đầu pan
let panZoomStartState = null;

// Override hàm doPan
function doPan(e) {
    if (!isDragging || !bitcoinChart || !zoomState.min || !zoomState.max) {
        return;
    }
    
    if (!panCanvas) {
        panCanvas = document.getElementById('bitcoinChart');
    }
    
    if (!panCanvas) return;
    
    // Tính toán delta
    const deltaX = e.clientX - dragStartX;
    const chartWidth = panCanvas.width || panCanvas.clientWidth;
    
    // Tính range thời gian
    const timeRange = zoomState.max.getTime() - zoomState.min.getTime();
    const timePerPixel = timeRange / chartWidth;
    
    // Tính delta thời gian
    const timeDelta = deltaX * timePerPixel;
    
    // Tính new min/max
    let newMinTime = zoomState.min.getTime() - timeDelta;
    let newMaxTime = zoomState.max.getTime() - timeDelta;
    
    // Giới hạn trong phạm vi dữ liệu
    const fullData = historicalPriceData;
    if (fullData && fullData.length > 0) {
        const validDates = fullData
            .map(d => d.x)
            .filter(date => date && date instanceof Date && !isNaN(date.getTime()));
        
        if (validDates.length > 0) {
            const fullMinTime = Math.min(...validDates.map(d => d.getTime()));
            const fullMaxTime = Math.max(...validDates.map(d => d.getTime()));
            
            // Thêm padding
            const range = fullMaxTime - fullMinTime;
            const paddedMin = fullMinTime - range * 0.05;
            const paddedMax = fullMaxTime + range * 0.05;
            
            // Giới hạn
            newMinTime = Math.max(paddedMin, Math.min(paddedMax - (newMaxTime - newMinTime), newMinTime));
            newMaxTime = newMinTime + (newMaxTime - newMinTime);
            
            if (newMaxTime > paddedMax) {
                newMaxTime = paddedMax;
                newMinTime = newMaxTime - (newMaxTime - newMinTime);
            }
        }
    }
    
    // Tạo Date objects mới
    const newMin = new Date(newMinTime);
    const newMax = new Date(newMaxTime);
    
    // Cập nhật zoom state
    zoomState.min = newMin;
    zoomState.max = newMax;
    
    // Cập nhật chart
    bitcoinChart.options.scales.x.min = newMin;
    bitcoinChart.options.scales.x.max = newMax;
    bitcoinChart.update('none'); // 'none' để tránh animation giật
    
    // Cập nhật UI
    updateRangeHandles();
    updateZoomInfo();
    updateTimelineSlider();
    
    // Cập nhật drag start
    dragStartX = e.clientX;
    
    e.preventDefault();
    e.stopPropagation();
}

// Override hàm endPan
function endPan(e) {
    if (!isDragging) return;
    
    console.log('🖱️ Pan mode ENDED');
    isDragging = false;
    
    if (panCanvas) {
        panCanvas.style.cursor = currentTool === 'pan' ? 'grab' : '';
    }
    
    // Lưu trạng thái zoom
    if (bitcoinChart) {
        saveZoomState();
    }
    
    panZoomStartState = null;
    
    e.preventDefault();
    e.stopPropagation();
}

// Cập nhật hàm setActiveTool để đảm bảo cursor đúng
const originalSetActiveTool = setActiveTool;
setActiveTool = function(tool) {
    // Gọi hàm gốc
    if (originalSetActiveTool) {
        originalSetActiveTool(tool);
    }
    
    // Cập nhật cursor
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) return;
    
    switch(tool) {
        case 'pan':
            chartCanvas.style.cursor = 'grab';
            break;
        case 'zoom':
            chartCanvas.style.cursor = 'crosshair';
            break;
        default:
            chartCanvas.style.cursor = 'default';
    }
};

// Thêm event listeners trực tiếp cho chart canvas
function setupPanModeDirectly() {
    console.log('🔧 Setting up Pan Mode directly...');
    
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) {
        setTimeout(setupPanModeDirectly, 500);
        return;
    }
    
    // Xóa event listeners cũ (nếu có)
    chartCanvas.removeEventListener('mousedown', handlePanMouseDown);
    chartCanvas.removeEventListener('mousemove', handlePanMouseMove);
    chartCanvas.removeEventListener('mouseup', handlePanMouseUp);
    chartCanvas.removeEventListener('mouseleave', handlePanMouseLeave);
    
    // Thêm event listeners mới
    chartCanvas.addEventListener('mousedown', handlePanMouseDown);
    chartCanvas.addEventListener('mousemove', handlePanMouseMove);
    chartCanvas.addEventListener('mouseup', handlePanMouseUp);
    chartCanvas.addEventListener('mouseleave', handlePanMouseLeave);
    
    // Touch events cho mobile
    chartCanvas.addEventListener('touchstart', handlePanTouchStart, { passive: false });
    chartCanvas.addEventListener('touchmove', handlePanTouchMove, { passive: false });
    chartCanvas.addEventListener('touchend', handlePanTouchEnd);
    chartCanvas.addEventListener('touchcancel', handlePanTouchEnd);
    
    console.log('✅ Pan Mode direct setup complete');
}

// Handlers cho mouse events
function handlePanMouseDown(e) {
    if (currentTool !== 'pan') return;
    startPan(e);
}

function handlePanMouseMove(e) {
    if (currentTool !== 'pan' || !isDragging) return;
    doPan(e);
}

function handlePanMouseUp(e) {
    if (currentTool !== 'pan' || !isDragging) return;
    endPan(e);
}

function handlePanMouseLeave(e) {
    if (currentTool === 'pan' && isDragging) {
        endPan(e);
    }
}

// Handlers cho touch events
function handlePanTouchStart(e) {
    if (currentTool !== 'pan') return;
    e.preventDefault();
    
    if (e.touches.length > 0) {
        // Tạo fake mouse event từ touch
        const touch = e.touches[0];
        const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        startPan(fakeEvent);
    }
}

function handlePanTouchMove(e) {
    if (currentTool !== 'pan' || !isDragging) return;
    e.preventDefault();
    
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        doPan(fakeEvent);
    }
}

function handlePanTouchEnd(e) {
    if (currentTool !== 'pan' || !isDragging) return;
    e.preventDefault();
    
    const fakeEvent = {
        preventDefault: () => {},
        stopPropagation: () => {}
    };
    endPan(fakeEvent);
}

// Khởi tạo pan mode sau khi chart load
document.addEventListener('DOMContentLoaded', function() {
    // Đợi chart load xong
    setTimeout(setupPanModeDirectly, 2000);
});

// Khởi tạo lại khi chart được cập nhật
document.addEventListener('chartDataUpdated', function() {
    setTimeout(setupPanModeDirectly, 500);
});

// Export các hàm cần thiết
window.startPan = startPan;
window.doPan = doPan;
window.endPan = endPan;
window.setupPanModeDirectly = setupPanModeDirectly;

console.log('✅ Pan Mode fix loaded - Press P key to activate Pan Mode');

function debugStats() {
    console.log('🔍 Debug Stats:');
    console.log('- peakCount element:', document.getElementById('peakCount'));
    console.log('- dipCount element:', document.getElementById('dipCount'));
    console.log('- totalCount element:', document.getElementById('totalCount'));
    console.log('- accuracyRate element:', document.getElementById('accuracyRate'));
    console.log('- signalsData length:', signalsData.length);
    
    if (signalsData.length > 0) {
        console.log('- First signal:', signalsData[0]);
    }
}

setTimeout(debugStats, 3000);
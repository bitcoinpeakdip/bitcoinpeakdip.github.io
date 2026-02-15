// EWS Signals Page JavaScript - FIXED VERSION (USES REAL BITCOIN PRICE DATA)
// Bitcoin PeakDip Early Warning System Signals Log
// Version: 1.4.10 - Real Bitcoin Price Data Integration

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
const APP_VERSION = '1.4.10'; // TĂNG SỐ NÀY MỖI LẦN CẬP NHẬT
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
    
    // Thêm dòng này để setup drag scroll
    setTimeout(setupTableDragScroll, 1000);

    // Thêm CSS cho click zoom
    addClickZoomStyles();    
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

// ========== CHART FUNCTIONS ==========
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
                    label: 'Bitcoin Price (Binance)',
                    data: [],
                    borderColor: 'rgba(247, 147, 26, 0.9)',
                    backgroundColor: 'rgba(247, 147, 26, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 3
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
    
    // Update chart title to show data source
    const isSynthetic = historicalPriceData.some(d => d.synthetic);
    if (isSynthetic) {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Synthetic Fallback)';
        bitcoinChart.data.datasets[0].borderColor = 'rgba(255, 152, 0, 0.8)';
    } else {
        bitcoinChart.data.datasets[0].label = 'Bitcoin Price (Binance Real Data)';
    }
    
    bitcoinChart.update();
    
    console.log(`✅ Charts updated with REAL Bitcoin price data`);
}

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

// ========== ZOOM & TIMELINE FUNCTIONS ==========
let zoomState = {
    min: null,
    max: null,
    isZoomed: false,
    zoomHistory: []
};

function initializeZoomControls() {
    console.log('🔍 Initializing zoom controls...');
    
    if (document.querySelector('.zoom-toolbar')) {
        console.log('✅ Zoom toolbar already exists');
        return;
    }
    
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
    
    addZoomStyles();
    setupZoomEventListeners();
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
    
    window.addEventListener('resize', () => {
        // No-op, just keep the function
    });
    
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
        // Kích hoạt click-to-zoom ngay sau khi khởi tạo
        setTimeout(() => {
            activateClickZoomMode();
        }, 100);
    };
    
    chartSection.querySelector('.chart-controls').appendChild(manualBtn);
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

// ========== CLICK-TO-ZOOM FEATURE ==========
let clickZoomPoints = [];
let clickZoomInstructions = null;

function initializeClickToZoom() {
    console.log('🔍 Initializing click-to-zoom feature...');
    
    // Tạo instruction panel
    createClickZoomInstructions();
    
    // Thêm event listener cho chart
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas) return;
    
    // Xóa event listener cũ nếu có
    chartCanvas.removeEventListener('click', handleChartClick);
    chartCanvas.addEventListener('click', handleChartClick);
}

function createClickZoomInstructions() {
    // Xóa instruction cũ nếu có
    const oldInstructions = document.getElementById('clickZoomInstructions');
    if (oldInstructions) oldInstructions.remove();
    
    // Tạo instruction mới
    clickZoomInstructions = document.createElement('div');
    clickZoomInstructions.id = 'clickZoomInstructions';
    clickZoomInstructions.className = 'click-zoom-instructions';
    clickZoomInstructions.innerHTML = `
        <div class="instructions-header">
            <i class="fas fa-mouse-pointer"></i>
            <span>Click-to-Zoom Mode</span>
            <button class="close-instructions" onclick="closeClickZoomInstructions()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="instructions-body">
            <p>👆 <strong>Hướng dẫn:</strong> Click vào hai điểm bất kỳ trên biểu đồ</p>
            <p>📊 Chart sẽ tự động zoom vào khoảng thời gian giữa hai lần click</p>
            <p class="instruction-status" id="clickZoomStatus">
                ⏳ Chờ click lần 1...
            </p>
        </div>
        <div class="instructions-footer">
            <button class="reset-zoom-btn" onclick="resetZoomFromInstructions()">
                <i class="fas fa-undo"></i> Reset Zoom
            </button>
            <button class="exit-zoom-btn" onclick="exitClickZoomMode()">
                <i class="fas fa-sign-out-alt"></i> Thoát
            </button>
        </div>
    `;
    
    // Thêm vào chart section
    const chartSection = document.querySelector('.chart-section');
    if (chartSection) {
        chartSection.appendChild(clickZoomInstructions);
    }
    
    updateClickZoomStatus('Chờ click lần 1...', 'waiting');
}

function updateClickZoomStatus(message, type = 'info') {
    const statusEl = document.getElementById('clickZoomStatus');
    if (!statusEl) return;
    
    statusEl.innerHTML = '';
    statusEl.className = 'instruction-status';
    
    if (type === 'success') {
        statusEl.classList.add('status-success');
        statusEl.innerHTML = `✅ ${message}`;
    } else if (type === 'error') {
        statusEl.classList.add('status-error');
        statusEl.innerHTML = `❌ ${message}`;
    } else if (type === 'info') {
        statusEl.classList.add('status-info');
        statusEl.innerHTML = `ℹ️ ${message}`;
    } else if (type === 'waiting') {
        statusEl.classList.add('status-waiting');
        statusEl.innerHTML = `⏳ ${message}`;
    }
}

function handleChartClick(event) {
    // Chỉ xử lý khi đang ở chế độ click-to-zoom
    if (!clickZoomInstructions || clickZoomInstructions.style.display === 'none') return;
    
    const chartCanvas = document.getElementById('bitcoinChart');
    if (!chartCanvas || !bitcoinChart) return;
    
    // Lấy tọa độ click
    const rect = chartCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Chuyển đổi tọa độ pixel thành thời gian
    const xScale = bitcoinChart.scales.x;
    const clickDate = xScale.getValueForPixel(x);
    
    if (!clickDate) return;
    
    // Thêm điểm click vào mảng
    clickZoomPoints.push({
        date: clickDate,
        x: x,
        time: clickDate.getTime()
    });
    
    // Hiển thị marker tạm thời
    showClickMarker(x, clickZoomPoints.length);
    
    // Cập nhật trạng thái
    if (clickZoomPoints.length === 1) {
        updateClickZoomStatus('Đã ghi nhận điểm 1, chờ điểm 2...', 'success');
    } else if (clickZoomPoints.length === 2) {
        // Thực hiện zoom
        performClickZoom();
    }
}

function showClickMarker(x, pointNumber) {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    const marker = document.createElement('div');
    marker.className = `click-marker marker-${pointNumber}`;
    marker.style.left = `${x}px`;
    marker.innerHTML = `<span>${pointNumber}</span>`;
    
    chartContainer.appendChild(marker);
    
    // Xóa marker sau 2 giây
    setTimeout(() => {
        if (marker.parentNode) {
            marker.remove();
        }
    }, 2000);
}

function performClickZoom() {
    if (clickZoomPoints.length !== 2) return;
    
    // Lấy hai thời điểm
    const time1 = clickZoomPoints[0].time;
    const time2 = clickZoomPoints[1].time;
    
    // Xác định min và max (không phân biệt thứ tự)
    const minTime = Math.min(time1, time2);
    const maxTime = Math.max(time1, time2);
    
    // Thêm padding 5% mỗi bên
    const range = maxTime - minTime;
    const padding = range * 0.05;
    
    const startDate = new Date(minTime - padding);
    const endDate = new Date(maxTime + padding);
    
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
    updateClickZoomStatus(`Đã zoom ${days} ngày (${formatDate(startDate)} - ${formatDate(endDate)})`, 'success');
    
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
    if (days <= 90) return 'month';
    return 'month';
}

function flashChart() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    chartContainer.classList.add('chart-flash');
    setTimeout(() => {
        chartContainer.classList.remove('chart-flash');
    }, 300);
}

function resetZoomFromInstructions() {
    resetZoom();
    updateClickZoomStatus('Đã reset zoom, chờ click lần 1...', 'waiting');
    clickZoomPoints = [];
}

function exitClickZoomMode() {
    if (clickZoomInstructions) {
        clickZoomInstructions.style.display = 'none';
    }
    clickZoomPoints = [];
    
    // Reset cursor
    document.getElementById('bitcoinChart').style.cursor = '';
    
    showNotification('Đã thoát chế độ click-to-zoom', 'info');
}

function closeClickZoomInstructions() {
    exitClickZoomMode();
}

function initializeZoomControls() {
    console.log('🔍 Initializing zoom controls...');
    
    if (document.querySelector('.zoom-toolbar')) {
        console.log('✅ Zoom toolbar already exists');
        return;
    }
    
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
            <button class="zoom-btn" id="zoomClick" title="Click to Zoom (2 clicks)">
                <i class="fas fa-mouse-pointer"></i>
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
    
    addZoomStyles();
    setupZoomEventListeners();
    setupDragToZoom();
    
    // QUAN TRỌNG: Gọi hàm này để tạo instructions
    createClickZoomInstructions();
    
    // Mặc định kích hoạt chế độ click-to-zoom
    activateClickZoomMode();
}

function activateClickZoomMode() {
    // Deactivate các chế độ khác
    const panBtn = document.getElementById('zoomPan');
    const selectBtn = document.getElementById('zoomSelect');
    const clickBtn = document.getElementById('zoomClick');
    
    if (panBtn) panBtn.classList.remove('active');
    if (selectBtn) selectBtn.classList.remove('active');
    
    if (clickBtn) {
        clickBtn.classList.add('active');
    }
    
    // Hiển thị instructions
    if (clickZoomInstructions) {
        clickZoomInstructions.style.display = 'block';
    } else {
        initializeClickToZoom();
    }
    
    // Reset points
    clickZoomPoints = [];
    
    // Update cursor
    document.getElementById('bitcoinChart').style.cursor = 'crosshair';
    
    showNotification('Chế độ click-to-zoom: Click 2 điểm bất kỳ trên biểu đồ để zoom', 'info', 4000);
}

// Cập nhật setupZoomEventListeners
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
    });
    
    document.getElementById('zoomSelect')?.addEventListener('click', function() {
        toggleSelectMode();
        if (clickZoomInstructions) clickZoomInstructions.style.display = 'none';
    });
    
    document.getElementById('zoomClick')?.addEventListener('click', function() {
        const panBtn = document.getElementById('zoomPan');
        const selectBtn = document.getElementById('zoomSelect');
        
        if (panBtn) panBtn.classList.remove('active');
        if (selectBtn) selectBtn.classList.remove('active');
        
        this.classList.add('active');
        document.getElementById('bitcoinChart').style.cursor = 'crosshair';
        
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

function deactivateAllModes() {
    const panBtn = document.getElementById('zoomPan');
    const selectBtn = document.getElementById('zoomSelect');
    const clickBtn = document.getElementById('zoomClick');
    
    if (panBtn) panBtn.classList.remove('active');
    if (selectBtn) selectBtn.classList.remove('active');
    if (clickBtn) clickBtn.classList.remove('active');
    
    document.getElementById('bitcoinChart').style.cursor = '';
    
    if (clickZoomInstructions) {
        clickZoomInstructions.style.display = 'none';
    }
    
    clickZoomPoints = [];
}

// Thêm CSS cho click markers và instructions
function addClickZoomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .click-zoom-instructions {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid var(--wave-trough);
            border-radius: 10px;
            padding: 15px;
            width: 280px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.3s ease;
        }
        
        .instructions-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .instructions-header i {
            color: var(--wave-trough);
            font-size: 1.2em;
        }
        
        .instructions-header span {
            flex: 1;
            font-weight: bold;
            color: white;
        }
        
        .close-instructions {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 5px;
        }
        
        .close-instructions:hover {
            color: white;
        }
        
        .instructions-body {
            margin-bottom: 15px;
        }
        
        .instructions-body p {
            color: rgba(255, 255, 255, 0.9);
            margin: 8px 0;
            font-size: 0.9em;
        }
        
        .instruction-status {
            margin-top: 10px;
            padding: 8px;
            border-radius: 5px;
            font-size: 0.9em;
            text-align: center;
        }
        
        .status-waiting {
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid #ffc107;
            color: #ffc107;
        }
        
        .status-success {
            background: rgba(40, 167, 69, 0.2);
            border: 1px solid #28a745;
            color: #28a745;
        }
        
        .status-error {
            background: rgba(220, 53, 69, 0.2);
            border: 1px solid #dc3545;
            color: #dc3545;
        }
        
        .status-info {
            background: rgba(23, 162, 184, 0.2);
            border: 1px solid #17a2b8;
            color: #17a2b8;
        }
        
        .instructions-footer {
            display: flex;
            gap: 8px;
        }
        
        .reset-zoom-btn, .exit-zoom-btn {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            transition: all 0.2s ease;
        }
        
        .reset-zoom-btn {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .reset-zoom-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .exit-zoom-btn {
            background: var(--wave-trough);
            color: white;
            border: 1px solid var(--wave-trough);
        }
        
        .exit-zoom-btn:hover {
            background: var(--wave-mid);
        }
        
        .click-marker {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: rgba(255, 255, 255, 0.5);
            pointer-events: none;
            z-index: 100;
            animation: markerPulse 1s ease;
        }
        
        .click-marker span {
            position: absolute;
            top: 10px;
            left: -10px;
            background: var(--wave-trough);
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .marker-2 span {
            background: #ff2e63;
        }
        
        @keyframes markerPulse {
            0% {
                opacity: 0;
                transform: scaleY(0.5);
            }
            50% {
                opacity: 1;
                transform: scaleY(1);
            }
            100% {
                opacity: 0;
                transform: scaleY(0.5);
            }
        }
        
        .chart-flash {
            animation: chartFlash 0.3s ease;
        }
        
        @keyframes chartFlash {
            0% {
                box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.7);
            }
            50% {
                box-shadow: 0 0 30px 10px rgba(0, 212, 255, 0.7);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(0, 212, 255, 0);
            }
        }
        
        #zoomClick.active {
            background: var(--wave-trough);
            color: white;
            border-color: var(--wave-trough);
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }
    `;
    document.head.appendChild(style);
}

window.closeClickZoomInstructions = closeClickZoomInstructions;
window.resetZoomFromInstructions = resetZoomFromInstructions;
window.exitClickZoomMode = exitClickZoomMode;

// Thêm vào cuối file js/signals.js

// ========== CLICK-TO-ZOOM FIX ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing Click-to-Zoom fix...');
    
    // Đợi chart được khởi tạo
    setTimeout(initClickZoomFeature, 1500);
});

function initClickZoomFeature() {
    console.log('🎯 Setting up Click-to-Zoom feature');
    
    // Kiểm tra chart đã tồn tại chưa
    if (!window.bitcoinChart || !window.bitcoinChart.canvas) {
        console.log('⏳ Chart not ready, retrying in 1 second...');
        setTimeout(initClickZoomFeature, 1000);
        return;
    }
    
    // Tạo window hướng dẫn với vị trí phù hợp
    createZoomInstructions();
    
    // Thêm nút Active Zoom Controls vào toolbar
    addZoomControlButton();
    
    // Gán sự kiện click cho chart
    setupChartClickEvents();
}

function createZoomInstructions() {
    // Xóa window cũ nếu có
    const oldInstructions = document.querySelector('.click-zoom-instructions');
    if (oldInstructions) {
        oldInstructions.remove();
    }
    
    // Tạo window mới
    const instructions = document.createElement('div');
    instructions.className = 'click-zoom-instructions';
    instructions.id = 'clickZoomInstructions';
    instructions.innerHTML = `
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
            <div class="instruction-status status-waiting" id="zoomStatus">
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
    
    // Đặt vị trí phù hợp (không bị chèn vào menu)
    instructions.style.position = 'fixed';
    instructions.style.top = '120px';
    instructions.style.right = '20px';
    instructions.style.zIndex = '10000';
    instructions.style.width = '300px';
    instructions.style.background = 'rgba(0, 0, 0, 0.95)';
    instructions.style.border = '1px solid #00d4ff';
    instructions.style.borderRadius = '10px';
    instructions.style.padding = '15px';
    instructions.style.backdropFilter = 'blur(10px)';
    instructions.style.boxShadow = '0 5px 25px rgba(0, 0, 0, 0.7)';
    instructions.style.borderLeft = '4px solid #00d4ff';
    
    document.body.appendChild(instructions);
    
    // Khởi tạo biến lưu điểm click
    window.clickZoomPoints = [];
    window.clickZoomMode = true;
}

function addZoomControlButton() {
    // Tìm zoom toolbar
    const zoomToolbar = document.getElementById('zoomToolbar');
    if (!zoomToolbar) return;
    
    // Hiện toolbar nếu đang ẩn
    zoomToolbar.style.display = 'flex';
    
    // Kiểm tra nếu đã có nút thì không thêm nữa
    if (document.getElementById('manualZoomBtn')) return;
    
    // Tạo nút mới
    const manualZoomBtn = document.createElement('button');
    manualZoomBtn.id = 'manualZoomBtn';
    manualZoomBtn.className = 'zoom-btn active';
    manualZoomBtn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Active Zoom';
    manualZoomBtn.style.width = 'auto';
    manualZoomBtn.style.padding = '0 15px';
    manualZoomBtn.style.background = 'linear-gradient(135deg, #00d4ff, #f7931a)';
    manualZoomBtn.style.color = 'white';
    manualZoomBtn.style.border = 'none';
    manualZoomBtn.style.fontWeight = 'bold';
    
    manualZoomBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleClickZoomMode();
    };
    
    // Thêm vào zoom toolbar
    zoomToolbar.appendChild(manualZoomBtn);
}

function setupChartClickEvents() {
    const canvas = window.bitcoinChart.canvas;
    
    // Xóa event cũ nếu có
    if (window._chartClickHandler) {
        canvas.removeEventListener('click', window._chartClickHandler);
    }
    
    // Tạo handler mới
    window._chartClickHandler = function(e) {
        if (!window.clickZoomMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Lấy thông tin điểm click từ chart
        const points = window.bitcoinChart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, true);
        
        if (points && points.length > 0) {
            const firstPoint = points[0];
            const datasetIndex = firstPoint.datasetIndex;
            const index = firstPoint.index;
            
            // Lấy timestamp từ data
            const timestamp = window.bitcoinChart.data.labels[index];
            
            console.log(`📌 Clicked at index ${index}, timestamp: ${timestamp}`);
            
            // Thêm vào danh sách điểm click
            window.clickZoomPoints.push({
                index: index,
                timestamp: timestamp,
                x: x,
                y: y
            });
            
            // Hiển thị marker trên chart
            showClickMarker(x, y, window.clickZoomPoints.length);
            
            // Cập nhật status
            updateClickZoomStatus(`Đã chọn điểm ${window.clickZoomPoints.length}, chờ click lần ${window.clickZoomPoints.length + 1}...`, 'success');
            
            // Nếu đã có 2 điểm, thực hiện zoom
            if (window.clickZoomPoints.length === 2) {
                performClickZoom();
            }
        } else {
            console.log('❌ No data point at click position');
            updateClickZoomStatus('Không tìm thấy điểm dữ liệu tại vị trí click!', 'error');
        }
    };
    
    canvas.addEventListener('click', window._chartClickHandler);
    console.log('✅ Click events attached to chart');
}

function showClickMarker(x, y, pointNumber) {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    const marker = document.createElement('div');
    marker.className = `click-marker marker-${pointNumber}`;
    marker.style.position = 'absolute';
    marker.style.left = x + 'px';
    marker.style.top = '0';
    marker.style.bottom = '0';
    marker.style.width = '2px';
    marker.style.background = 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,0.8) 80%, transparent 100%)';
    marker.style.pointerEvents = 'none';
    marker.style.zIndex = '100';
    
    const markerNumber = document.createElement('span');
    markerNumber.style.position = 'absolute';
    markerNumber.style.top = '20px';
    markerNumber.style.left = '-12px';
    markerNumber.style.background = pointNumber === 1 ? '#00d4ff' : '#ff2e63';
    markerNumber.style.color = 'white';
    markerNumber.style.width = '26px';
    markerNumber.style.height = '26px';
    markerNumber.style.borderRadius = '50%';
    markerNumber.style.display = 'flex';
    markerNumber.style.alignItems = 'center';
    markerNumber.style.justifyContent = 'center';
    markerNumber.style.fontWeight = 'bold';
    markerNumber.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
    markerNumber.style.border = '2px solid white';
    markerNumber.innerText = pointNumber;
    
    marker.appendChild(markerNumber);
    
    // Xóa marker cũ nếu có
    const oldMarkers = chartContainer.querySelectorAll('.click-marker');
    oldMarkers.forEach(m => m.remove());
    
    chartContainer.appendChild(marker);
}

function updateClickZoomStatus(message, type = 'waiting') {
    const statusEl = document.getElementById('zoomStatus');
    if (!statusEl) return;
    
    statusEl.innerHTML = `<i class="fas fa-${type === 'waiting' ? 'hourglass-half' : (type === 'success' ? 'check-circle' : 'exclamation-circle')}"></i> ${message}`;
    
    // Update class
    statusEl.className = `instruction-status status-${type}`;
}

function performClickZoom() {
    if (!window.clickZoomPoints || window.clickZoomPoints.length !== 2) return;
    
    // Sắp xếp điểm theo thời gian
    const points = [...window.clickZoomPoints].sort((a, b) => a.index - b.index);
    const startPoint = points[0];
    const endPoint = points[1];
    
    console.log(`🔍 Zooming from index ${startPoint.index} to ${endPoint.index}`);
    
    // Lấy timestamps
    const startTime = startPoint.timestamp;
    const endTime = endPoint.timestamp;
    
    if (!startTime || !endTime) {
        updateClickZoomStatus('Không thể xác định thời gian!', 'error');
        return;
    }
    
    // Thực hiện zoom trên chart
    if (window.bitcoinChart && window.bitcoinChart.zoomScale) {
        try {
            // Cách 1: Dùng zoomScale nếu có
            window.bitcoinChart.zoomScale('x', {
                min: new Date(startTime),
                max: new Date(endTime)
            });
        } catch (e) {
            console.log('ZoomScale không hoạt động, thử cách khác');
            
            // Cách 2: Set min/max trực tiếp
            try {
                const xAxis = window.bitcoinChart.scales.x;
                if (xAxis) {
                    xAxis.options.min = new Date(startTime);
                    xAxis.options.max = new Date(endTime);
                    window.bitcoinChart.update();
                }
            } catch (e2) {
                console.error('Không thể zoom chart:', e2);
            }
        }
        
        // Hiệu ứng flash
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.add('chart-flash');
            setTimeout(() => {
                chartContainer.classList.remove('chart-flash');
            }, 500);
        }
        
        updateClickZoomStatus('✅ Đã zoom thành công! Click để chọn lại', 'success');
        
        // Reset điểm click
        window.clickZoomPoints = [];
    } else {
        updateClickZoomStatus('Không thể zoom chart!', 'error');
    }
}

// Global functions
window.toggleClickZoomMode = function() {
    window.clickZoomMode = !window.clickZoomMode;
    
    const btn = document.getElementById('manualZoomBtn');
    if (btn) {
        if (window.clickZoomMode) {
            btn.style.background = 'linear-gradient(135deg, #00d4ff, #f7931a)';
            btn.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.7)';
            btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Active Zoom (ON)';
            
            // Hiện instructions
            const instructions = document.getElementById('clickZoomInstructions');
            if (instructions) {
                instructions.style.display = 'block';
            } else {
                createZoomInstructions();
            }
            
            // Reset points
            window.clickZoomPoints = [];
            updateClickZoomStatus('Chờ click lần 1...', 'waiting');
            
            // Xóa markers
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                const markers = chartContainer.querySelectorAll('.click-marker');
                markers.forEach(m => m.remove());
            }
        } else {
            btn.style.background = '';
            btn.style.boxShadow = '';
            btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Active Zoom';
            
            // Ẩn instructions
            const instructions = document.getElementById('clickZoomInstructions');
            if (instructions) {
                instructions.style.display = 'none';
            }
            
            // Xóa markers
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                const markers = chartContainer.querySelectorAll('.click-marker');
                markers.forEach(m => m.remove());
            }
        }
    }
};

window.closeClickZoomInstructions = function() {
    window.clickZoomMode = false;
    
    const instructions = document.getElementById('clickZoomInstructions');
    if (instructions) {
        instructions.style.display = 'none';
    }
    
    const btn = document.getElementById('manualZoomBtn');
    if (btn) {
        btn.style.background = '';
        btn.style.boxShadow = '';
        btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Active Zoom';
    }
    
    // Xóa markers
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        const markers = chartContainer.querySelectorAll('.click-marker');
        markers.forEach(m => m.remove());
    }
    
    window.clickZoomPoints = [];
};

window.resetZoomFromInstructions = function() {
    // Reset chart zoom
    if (window.bitcoinChart && window.bitcoinChart.resetZoom) {
        window.bitcoinChart.resetZoom();
    } else {
        // Reset min/max
        try {
            const xAxis = window.bitcoinChart.scales.x;
            if (xAxis) {
                xAxis.options.min = null;
                xAxis.options.max = null;
                window.bitcoinChart.update();
            }
        } catch (e) {
            console.error('Cannot reset zoom:', e);
        }
    }
    
    // Reset points
    window.clickZoomPoints = [];
    
    // Xóa markers
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        const markers = chartContainer.querySelectorAll('.click-marker');
        markers.forEach(m => m.remove());
    }
    
    updateClickZoomStatus('Đã reset zoom, chờ click lần 1...', 'waiting');
};

window.exitClickZoomMode = function() {
    window.clickZoomMode = false;
    
    const instructions = document.getElementById('clickZoomInstructions');
    if (instructions) {
        instructions.remove();
    }
    
    const btn = document.getElementById('manualZoomBtn');
    if (btn) {
        btn.style.background = '';
        btn.style.boxShadow = '';
        btn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Active Zoom';
    }
    
    // Xóa markers
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        const markers = chartContainer.querySelectorAll('.click-marker');
        markers.forEach(m => m.remove());
    }
    
    window.clickZoomPoints = [];
};

// Thêm CSS cần thiết
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
        
        #manualZoomBtn {
            transition: all 0.3s ease;
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
    `;
    document.head.appendChild(style);
}

// Gọi khi trang load
addClickZoomStyles();

// ========== TIME RANGE SELECTOR FEATURE ==========
// Thêm sau phần Click-to-Zoom code

document.addEventListener('DOMContentLoaded', function() {
    console.log('⏰ Initializing Time Range Selector...');
    
    // Đợi chart và data load xong
    setTimeout(initTimeRangeSelector, 2000);
});

function initTimeRangeSelector() {
    if (!window.bitcoinChart || !window.signalsData) {
        console.log('⏳ Waiting for chart and signals data...');
        setTimeout(initTimeRangeSelector, 1000);
        return;
    }
    
    createTimeRangeSelector();
    setupTimeRangeEvents();
}

function createTimeRangeSelector() {
    // Tìm chart section để thêm time range selector
    const chartSection = document.querySelector('.chart-section');
    if (!chartSection) return;
    
    // Kiểm tra nếu đã có thì không thêm nữa
    if (document.getElementById('timeRangeSelector')) return;
    
    // Tạo time range selector container
    const timeRangeContainer = document.createElement('div');
    timeRangeContainer.className = 'time-range-selector';
    timeRangeContainer.id = 'timeRangeSelector';
    timeRangeContainer.innerHTML = `
        <div class="time-range-header">
            <i class="fas fa-calendar-alt"></i>
            <span>Time Range Selection</span>
            <span class="time-range-badge">Select period to view Peak/Dip signals</span>
        </div>
        
        <div class="time-range-controls">
            <!-- Quick preset buttons -->
            <div class="range-presets">
                <button class="range-preset-btn" data-days="1">24H</button>
                <button class="range-preset-btn" data-days="7">7D</button>
                <button class="range-preset-btn" data-days="30">30D</button>
                <button class="range-preset-btn" data-days="90">90D</button>
                <button class="range-preset-btn" data-days="180">6M</button>
                <button class="range-preset-btn" data-days="365">1Y</button>
                <button class="range-preset-btn" data-all="true">All Time</button>
            </div>
            
            <!-- Custom date range picker -->
            <div class="custom-range">
                <div class="date-input-group">
                    <label for="startDate">From:</label>
                    <input type="datetime-local" id="startDate" class="date-input">
                </div>
                
                <div class="date-input-group">
                    <label for="endDate">To:</label>
                    <input type="datetime-local" id="endDate" class="date-input">
                </div>
                
                <button class="apply-range-btn" id="applyCustomRange">
                    <i class="fas fa-check"></i> Apply
                </button>
                
                <button class="reset-range-btn" id="resetRange">
                    <i class="fas fa-undo-alt"></i> Reset
                </button>
            </div>
        </div>
        
        <!-- Range info display -->
        <div class="range-info" id="rangeInfo">
            <div class="range-stats">
                <span><i class="fas fa-chart-line"></i> <span id="rangeDataPoints">0</span> data points</span>
                <span><i class="fas fa-mountain"></i> <span id="rangePeaks">0</span> peaks</span>
                <span><i class="fas fa-water"></i> <span id="rangeDips">0</span> dips</span>
                <span><i class="fas fa-calendar"></i> <span id="rangePeriod">All time</span></span>
            </div>
        </div>
    `;
    
    // Thêm CSS cho time range selector
    addTimeRangeStyles();
    
    // Chèn sau chart container
    const chartContainer = chartSection.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.insertAdjacentElement('afterend', timeRangeContainer);
    } else {
        chartSection.appendChild(timeRangeContainer);
    }
}

function addTimeRangeStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .time-range-selector {
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .time-range-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .time-range-header i {
            color: var(--wave-trough);
            font-size: 1.3em;
        }
        
        .time-range-header span {
            color: white;
            font-size: 1.2em;
            font-weight: 600;
        }
        
        .time-range-badge {
            background: rgba(0, 212, 255, 0.1);
            color: var(--wave-trough) !important;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em !important;
            margin-left: auto;
            border: 1px solid rgba(0, 212, 255, 0.3);
        }
        
        .time-range-controls {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .range-presets {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 10px;
        }
        
        .range-preset-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--text-glow);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 60px;
        }
        
        .range-preset-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .range-preset-btn.active {
            background: var(--wave-trough);
            color: white;
            border-color: var(--wave-trough);
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
        }
        
        .custom-range {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 15px;
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 10px;
        }
        
        .date-input-group {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 200px;
        }
        
        .date-input-group label {
            color: var(--text-glow);
            font-size: 0.9em;
            min-width: 40px;
        }
        
        .date-input {
            flex: 1;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 10px;
            color: white;
            font-size: 0.9em;
        }
        
        .date-input:focus {
            outline: none;
            border-color: var(--wave-trough);
            box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
        }
        
        .apply-range-btn, .reset-range-btn {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.9em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
        }
        
        .apply-range-btn {
            background: linear-gradient(to right, var(--wave-trough), var(--wave-mid));
            color: white;
        }
        
        .apply-range-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
        }
        
        .reset-range-btn {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-glow);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .reset-range-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .range-info {
            margin-top: 20px;
            padding: 15px;
            background: rgba(0, 212, 255, 0.05);
            border-radius: 8px;
            border-left: 4px solid var(--wave-trough);
        }
        
        .range-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            align-items: center;
            justify-content: space-between;
        }
        
        .range-stats span {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-glow);
            font-size: 0.95em;
        }
        
        .range-stats i {
            color: var(--wave-trough);
            font-size: 1.1em;
        }
        
        .range-stats span:nth-child(2) i {
            color: var(--wave-peak);
        }
        
        .range-stats span:nth-child(3) i {
            color: var(--wave-trough);
        }
        
        @media (max-width: 768px) {
            .custom-range {
                flex-direction: column;
                align-items: stretch;
            }
            
            .date-input-group {
                min-width: 100%;
            }
            
            .range-stats {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .range-presets {
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
}

function setupTimeRangeEvents() {
    // Preset buttons
    document.querySelectorAll('.range-preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all preset buttons
            document.querySelectorAll('.range-preset-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            if (this.hasAttribute('data-all')) {
                // Show all data
                resetToFullRange();
            } else {
                const days = parseInt(this.getAttribute('data-days'));
                applyPresetRange(days);
            }
        });
    });
    
    // Apply custom range
    document.getElementById('applyCustomRange').addEventListener('click', function() {
        applyCustomRange();
    });
    
    // Reset range
    document.getElementById('resetRange').addEventListener('click', function() {
        resetToFullRange();
        // Remove active class from all preset buttons
        document.querySelectorAll('.range-preset-btn').forEach(b => b.classList.remove('active'));
    });
    
    // Set default dates for custom range
    setDefaultDateInputs();
}

function setDefaultDateInputs() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const formatDateForInput = (date) => {
        return date.toISOString().slice(0, 16);
    };
    
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    
    if (startInput && endInput) {
        startInput.value = formatDateForInput(thirtyDaysAgo);
        endInput.value = formatDateForInput(now);
    }
}

function applyPresetRange(days) {
    if (!window.bitcoinChart || !window.signalsData) return;
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // Lấy tất cả timestamps từ chart labels
    const allTimestamps = window.bitcoinChart.data.labels.map(ts => new Date(ts));
    
    // Tìm index của start date gần nhất
    let startIndex = 0;
    for (let i = 0; i < allTimestamps.length; i++) {
        if (allTimestamps[i] >= startDate) {
            startIndex = i;
            break;
        }
    }
    
    // Zoom chart đến range
    zoomChartToRange(startIndex, allTimestamps.length - 1);
    
    // Cập nhật thông tin range
    updateRangeInfo(startDate, now);
}

function applyCustomRange() {
    const startInput = document.getElementById('startDate').value;
    const endInput = document.getElementById('endDate').value;
    
    if (!startInput || !endInput) {
        alert('Please select both start and end dates');
        return;
    }
    
    const startDate = new Date(startInput);
    const endDate = new Date(endInput);
    
    if (startDate >= endDate) {
        alert('End date must be after start date');
        return;
    }
    
    if (!window.bitcoinChart || !window.signalsData) return;
    
    const allTimestamps = window.bitcoinChart.data.labels.map(ts => new Date(ts));
    
    // Tìm index gần nhất với startDate và endDate
    let startIndex = 0;
    let endIndex = allTimestamps.length - 1;
    
    for (let i = 0; i < allTimestamps.length; i++) {
        if (allTimestamps[i] >= startDate) {
            startIndex = i;
            break;
        }
    }
    
    for (let i = allTimestamps.length - 1; i >= 0; i--) {
        if (allTimestamps[i] <= endDate) {
            endIndex = i;
            break;
        }
    }
    
    if (startIndex > endIndex) {
        alert('No data in selected range');
        return;
    }
    
    // Zoom chart
    zoomChartToRange(startIndex, endIndex);
    
    // Cập nhật thông tin
    updateRangeInfo(startDate, endDate);
}

function zoomChartToRange(startIndex, endIndex) {
    if (!window.bitcoinChart) return;
    
    try {
        // Lấy timestamps tương ứng
        const startTime = window.bitcoinChart.data.labels[startIndex];
        const endTime = window.bitcoinChart.data.labels[endIndex];
        
        // Zoom chart
        const xAxis = window.bitcoinChart.scales.x;
        if (xAxis) {
            xAxis.options.min = new Date(startTime);
            xAxis.options.max = new Date(endTime);
            window.bitcoinChart.update();
        }
        
        // Highlight các signal points trong range
        highlightSignalsInRange(startTime, endTime);
        
        // Hiệu ứng flash
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.add('chart-flash');
            setTimeout(() => {
                chartContainer.classList.remove('chart-flash');
            }, 500);
        }
        
        console.log(`🔍 Zoomed to range: ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`);
    } catch (e) {
        console.error('Error zooming chart:', e);
    }
}

function highlightSignalsInRange(startTime, endTime) {
    if (!window.signalsData) return;
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    // Đếm signals trong range
    let peaksInRange = 0;
    let dipsInRange = 0;
    
    window.signalsData.forEach(signal => {
        const signalTime = new Date(signal.timestamp).getTime();
        if (signalTime >= start && signalTime <= end) {
            if (signal.signal_type === 'PEAK') peaksInRange++;
            else if (signal.signal_type === 'DIP') dipsInRange++;
        }
    });
    
    // Cập nhật range info
    const rangePeaks = document.getElementById('rangePeaks');
    const rangeDips = document.getElementById('rangeDips');
    const rangeDataPoints = document.getElementById('rangeDataPoints');
    
    if (rangePeaks) rangePeaks.textContent = peaksInRange;
    if (rangeDips) rangeDips.textContent = dipsInRange;
    if (rangeDataPoints) {
        const dataPoints = window.bitcoinChart.data.labels.filter(ts => {
            const t = new Date(ts).getTime();
            return t >= start && t <= end;
        }).length;
        rangeDataPoints.textContent = dataPoints;
    }
}

function updateRangeInfo(startDate, endDate) {
    const rangePeriod = document.getElementById('rangePeriod');
    if (rangePeriod) {
        const formatDate = (date) => {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        };
        rangePeriod.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    
    // Cập nhật số liệu signals trong range
    if (window.signalsData) {
        const start = startDate.getTime();
        const end = endDate.getTime();
        
        let peaks = 0, dips = 0;
        window.signalsData.forEach(signal => {
            const signalTime = new Date(signal.timestamp).getTime();
            if (signalTime >= start && signalTime <= end) {
                if (signal.signal_type === 'PEAK') peaks++;
                else if (signal.signal_type === 'DIP') dips++;
            }
        });
        
        const rangePeaks = document.getElementById('rangePeaks');
        const rangeDips = document.getElementById('rangeDips');
        const rangeDataPoints = document.getElementById('rangeDataPoints');
        
        if (rangePeaks) rangePeaks.textContent = peaks;
        if (rangeDips) rangeDips.textContent = dips;
        if (rangeDataPoints) {
            const dataPoints = window.bitcoinChart.data.labels.filter(ts => {
                const t = new Date(ts).getTime();
                return t >= start && t <= end;
            }).length;
            rangeDataPoints.textContent = dataPoints;
        }
    }
}

function resetToFullRange() {
    if (!window.bitcoinChart) return;
    
    try {
        const xAxis = window.bitcoinChart.scales.x;
        if (xAxis) {
            xAxis.options.min = null;
            xAxis.options.max = null;
            window.bitcoinChart.update();
        }
        
        // Reset range info
        const rangePeriod = document.getElementById('rangePeriod');
        if (rangePeriod) rangePeriod.textContent = 'All time';
        
        // Reset counts to total
        if (window.signalsData) {
            const peaks = window.signalsData.filter(s => s.signal_type === 'PEAK').length;
            const dips = window.signalsData.filter(s => s.signal_type === 'DIP').length;
            
            const rangePeaks = document.getElementById('rangePeaks');
            const rangeDips = document.getElementById('rangeDips');
            const rangeDataPoints = document.getElementById('rangeDataPoints');
            
            if (rangePeaks) rangePeaks.textContent = peaks;
            if (rangeDips) rangeDips.textContent = dips;
            if (rangeDataPoints) rangeDataPoints.textContent = window.bitcoinChart.data.labels.length;
        }
        
        // Hiệu ứng flash
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.classList.add('chart-flash');
            setTimeout(() => {
                chartContainer.classList.remove('chart-flash');
            }, 500);
        }
        
        // Reset date inputs to default
        setDefaultDateInputs();
        
        // Remove active class from preset buttons
        document.querySelectorAll('.range-preset-btn').forEach(b => b.classList.remove('active'));
        
        console.log('🔄 Reset to full range');
    } catch (e) {
        console.error('Error resetting range:', e);
    }
}

// Thêm event listener cho chart data loaded
document.addEventListener('signalsDataLoaded', function(e) {
    console.log('📊 Signals data loaded, updating range info...');
    setTimeout(() => {
        if (document.getElementById('timeRangeSelector')) {
            resetToFullRange();
        }
    }, 1000);
});
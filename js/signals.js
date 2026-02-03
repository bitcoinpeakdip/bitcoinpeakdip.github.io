// EWS Signals Page JavaScript

let signalsData = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredSignals = [];
let currentFilter = 'all';
let bitcoinChart = null;
let analysisCharts = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Bitcoin PeakDip EWS Signals Initialized');
    
    // Load signals data
    loadSignalsData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
});

// Load signals data from CSV (embedded JSON for demo)
function loadSignalsData() {
    try {
        const csvDataElement = document.getElementById('csvData');
        if (csvDataElement) {
            const data = JSON.parse(csvDataElement.textContent);
            signalsData = data.signals.map(signal => ({
                ...signal,
                timestamp: new Date(signal.timestamp),
                id: generateSignalId()
            }));
            
            updateLastUpdated();
            updateStats();
            renderTable();
            updateChartsWithData();
        } else {
            // Fallback to demo data
            loadDemoData();
        }
    } catch (error) {
        console.error('Error loading signals data:', error);
        loadDemoData();
    }
}

// Fallback demo data
function loadDemoData() {
    const demoData = [
        {
            timestamp: new Date('2024-01-15T08:30:00'),
            signal_type: 'PEAK',
            price: 45000.50,
            confidence: 85,
            distance: 2.5,
            validation: 'VALIDATED',
            strategy: 'RECLAIM_FAILURE'
        },
        {
            timestamp: new Date('2024-01-15T12:45:00'),
            signal_type: 'DIP',
            price: 44200.75,
            confidence: 92,
            distance: 1.8,
            validation: 'VALIDATED',
            strategy: 'DISTRIBUTION_FADE'
        },
        {
            timestamp: new Date('2024-01-15T16:20:00'),
            signal_type: 'PEAK',
            price: 45200.25,
            confidence: 78,
            distance: 3.2,
            validation: 'PENDING',
            strategy: 'HEDGE_FLIP'
        },
        {
            timestamp: new Date('2024-01-16T09:15:00'),
            signal_type: 'DIP',
            price: 43800.50,
            confidence: 88,
            distance: 2.1,
            validation: 'VALIDATED',
            strategy: 'CONTINUATION'
        },
        {
            timestamp: new Date('2024-01-16T14:30:00'),
            signal_type: 'PEAK',
            price: 45700.75,
            confidence: 91,
            distance: 1.5,
            validation: 'VALIDATED',
            strategy: 'MOMENTUM_BREAKDOWN'
        },
        {
            timestamp: new Date('2024-01-17T10:45:00'),
            signal_type: 'DIP',
            price: 43200.25,
            confidence: 76,
            distance: 3.8,
            validation: 'VALIDATED',
            strategy: 'MULTI_TF_CONFLUENCE'
        },
        {
            timestamp: new Date('2024-01-17T18:20:00'),
            signal_type: 'PEAK',
            price: 45900.50,
            confidence: 82,
            distance: 2.3,
            validation: 'PENDING',
            strategy: 'VOLATILITY_EXPANSION'
        },
        {
            timestamp: new Date('2024-01-18T11:30:00'),
            signal_type: 'DIP',
            price: 42800.75,
            confidence: 95,
            distance: 1.2,
            validation: 'VALIDATED',
            strategy: 'DERIVATIVES_DIVERGENCE'
        },
        {
            timestamp: new Date('2024-01-18T15:45:00'),
            signal_type: 'PEAK',
            price: 46100.25,
            confidence: 79,
            distance: 2.9,
            validation: 'VALIDATED',
            strategy: 'RECLAIM_FAILURE'
        },
        {
            timestamp: new Date('2024-01-19T09:20:00'),
            signal_type: 'DIP',
            price: 42500.50,
            confidence: 87,
            distance: 2.0,
            validation: 'PENDING',
            strategy: 'DISTRIBUTION_FADE'
        }
    ];
    
    signalsData = demoData.map(signal => ({
        ...signal,
        id: generateSignalId()
    }));
    
    updateLastUpdated();
    updateStats();
    renderTable();
    updateChartsWithData();
}

function generateSignalId() {
    return 'signal_' + Math.random().toString(36).substr(2, 9);
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString();
    }
}

function updateStats() {
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const totalCount = signalsData.length;
    const validatedCount = signalsData.filter(s => s.validation === 'VALIDATED').length;
    const accuracyRate = totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0;
    
    document.getElementById('peakCount').textContent = peakCount;
    document.getElementById('dipCount').textContent = dipCount;
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('accuracyRate').textContent = accuracyRate + '%';
    
    // Update percentages
    const peakPercentage = document.getElementById('peakPercentage');
    const dipPercentage = document.getElementById('dipPercentage');
    if (peakPercentage && dipPercentage) {
        peakPercentage.textContent = Math.round((peakCount / totalCount) * 100) + '%';
        dipPercentage.textContent = Math.round((dipCount / totalCount) * 100) + '%';
    }
    
    // Update confidence stats
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    
    document.getElementById('highConfidence').textContent = highConfidence;
    document.getElementById('mediumConfidence').textContent = mediumConfidence;
    
    // Update time stats
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const signalsToday = signalsData.filter(s => s.timestamp >= todayStart).length;
    const signalsWeek = signalsData.filter(s => s.timestamp >= weekAgo).length;
    
    document.getElementById('signalsToday').textContent = signalsToday;
    document.getElementById('signalsWeek').textContent = signalsWeek;
}

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
    document.getElementById('prevPage').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', function() {
        const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    
    // Timeframe controls
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateChartTimeframe(this.dataset.timeframe);
        });
    });
    
    // Refresh data
    document.getElementById('refreshData').addEventListener('click', function() {
        refreshData();
    });
    
    // CSV upload
    document.getElementById('uploadCsv').addEventListener('click', function() {
        document.getElementById('csvFileInput').click();
    });
    
    document.getElementById('csvFileInput').addEventListener('change', function(e) {
        handleCsvUpload(e.target.files[0]);
    });
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
    
    currentPage = 1; // Reset to first page when filtering
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
                    <span class="distance">${signal.distance}%</span>
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
                    ${signal.strategy}
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
                    <span class="detail-value">${signal.strategy}</span>
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
                    <span class="detail-value">${signal.distance}% from ideal entry</span>
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

function getChartPositionDescription(signal) {
    const price = signal.price;
    if (price > 46000) return 'Near All-Time High';
    if (price > 45000) return 'High Price Zone';
    if (price > 44000) return 'Mid Price Zone';
    if (price > 43000) return 'Support Zone';
    return 'Low Price Zone';
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
        const priceVariation = (Math.random() - 0.5) * 1000;
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
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });
}

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
                    tension: 0.3
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
                legend: {
                    display: false
                },
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
                    time: {
                        unit: 'day'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
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
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false,
                        beginAtZero: true
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
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false,
                        beginAtZero: true
                    }
                }
            }
        });
        analysisCharts.push(timeChart);
    }
}

function updateChartsWithData() {
    if (!bitcoinChart) return;
    
    // Generate Bitcoin price data (simulated)
    const priceData = generateBitcoinPriceData();
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

function generateBitcoinPriceData() {
    const data = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
    const basePrice = 42000;
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const volatility = Math.random() * 0.02 - 0.01;
        const price = basePrice * (1 + volatility * (currentDate - startDate) / (1000 * 60 * 60 * 24));
        
        data.push({
            x: new Date(currentDate),
            y: price + (Math.random() * 2000 - 1000)
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
}

function updateAnalysisCharts() {
    if (analysisCharts.length < 3) return;
    
    const peakCount = signalsData.filter(s => s.signal_type === 'PEAK').length;
    const dipCount = signalsData.filter(s => s.signal_type === 'DIP').length;
    const highConfidence = signalsData.filter(s => s.confidence >= 80).length;
    const mediumConfidence = signalsData.filter(s => s.confidence >= 60 && s.confidence < 80).length;
    const lowConfidence = signalsData.filter(s => s.confidence < 60).length;
    
    // Type distribution
    analysisCharts[0].data.datasets[0].data = [peakCount, dipCount];
    analysisCharts[0].update();
    
    // Confidence distribution
    analysisCharts[1].data.datasets[0].data = [highConfidence, mediumConfidence, lowConfidence];
    analysisCharts[1].update();
    
    // Time distribution (by day of week)
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
    }
    
    bitcoinChart.options.scales.x.time.unit = unit;
    bitcoinChart.options.scales.x.time.displayFormats = displayFormats;
    bitcoinChart.update();
}

function highlightSignalOnChart(signal) {
    // In a real implementation, this would highlight the specific signal point
    // For now, we'll just update the tooltip
    console.log('Highlighting signal:', signal);
}

function refreshData() {
    const refreshBtn = document.getElementById('refreshData');
    const originalHTML = refreshBtn.innerHTML;
    
    // Show loading state
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        // Reload data
        loadSignalsData();
        
        // Restore button
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        // Show success message
        showNotification('Data refreshed successfully!', 'success');
    }, 1500);
}

function handleCsvUpload(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const parsedData = parseCSV(csvText);
            
            if (parsedData.length > 0) {
                signalsData = parsedData.map((row, index) => ({
                    timestamp: new Date(row.timestamp),
                    signal_type: row.signal_type,
                    price: parseFloat(row.price),
                    confidence: parseInt(row.confidence),
                    distance: parseFloat(row.distance),
                    validation: row.validation,
                    strategy: row.strategy,
                    id: 'uploaded_' + index
                }));
                
                updateLastUpdated();
                updateStats();
                renderTable();
                updateChartsWithData();
                
                showNotification('CSV file uploaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Error parsing CSV:', error);
            showNotification('Error parsing CSV file. Please check the format.', 'error');
        }
    };
    
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Helper functions
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
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    }
}

function getConfidenceLevel(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    border-left: 4px solid var(--wave-mid);
    transition: all 0.3s ease;
}

.notification-success {
    border-left-color: #4CAF50;
}

.notification-error {
    border-left-color: #f44336;
}

.notification i {
    font-size: 1.2em;
}

.no-results {
    text-align: center;
    padding: 50px 20px;
    color: var(--text-glow);
    opacity: 0.7;
}

.no-results i {
    font-size: 2em;
    margin-bottom: 15px;
    color: var(--wave-mid);
}

.distance-bar {
    width: 60px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin-top: 5px;
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
}
`;
document.head.appendChild(style);
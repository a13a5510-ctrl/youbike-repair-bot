// js/app.js
let isLightMode = true; 
let twGeoJson = null;
let currentMode = 'stats'; 
let showingFleetDetails = false;
let showingSimDetails = false;
let isDataView = false; 
let showVariance = false; 
let isPresentationMode = false; 
let isLaserMode = false;        
let isDataZoomed = false; // 數字放大狀態
let dataFontBoost = 1;    // 數字放大倍率

// 🌟 修改點：將預設指標改為綜合分數
let currentStatsMetric = 'overall'; 
let currentMaintenanceMetric = 'maintenance_rate';
let currentSimulationMetric = 'sim_a';

let globalFontScale = 1;

const mapChart = echarts.init(document.getElementById('mapChart'));
const barChart = echarts.init(document.getElementById('barChart'));

function injectSimData() {
    if (typeof simJsonData !== 'undefined') {
        simJsonData.forEach(sim => {
            let target = rawData.find(r => r.region === sim.region);
            if (target) {
                if (sim.current_month) {
                    target.sim_total = sim.current_month.total;
                    target.sim_a_count = sim.current_month.a;
                    target.sim_b_count = sim.current_month.b;
                    target.sim_c_count = sim.current_month.c;

                    target.sim_a_ratio = target.sim_total > 0 ? parseFloat((target.sim_a_count / target.sim_total * 100).toFixed(1)) : 0;
                    target.sim_b_ratio = target.sim_total > 0 ? parseFloat((target.sim_b_count / target.sim_total * 100).toFixed(1)) : 0;
                    target.sim_c_ratio = target.sim_total > 0 ? parseFloat((target.sim_c_count / target.sim_total * 100).toFixed(1)) : 0;

                    target.top_problems = sim.current_month.top_problems;
                }
                if (sim.prev_month) {
                    target.sim_a_lm = sim.prev_month.total > 0 ? parseFloat((sim.prev_month.a / sim.prev_month.total * 100).toFixed(1)) : 0;
                    target.sim_b_lm = sim.prev_month.total > 0 ? parseFloat((sim.prev_month.b / sim.prev_month.total * 100).toFixed(1)) : 0;
                    target.sim_c_lm = sim.prev_month.total > 0 ? parseFloat((sim.prev_month.c / sim.prev_month.total * 100).toFixed(1)) : 0;
                }
            }
        });
    }
}
injectSimData();

// 🌟 動態注入「綜合分數」到指標清單中 (確保只加入一次)
if (typeof statsMetrics !== 'undefined' && !statsMetrics.find(m => m.key === 'overall')) {
    statsMetrics.unshift({ key: 'overall', label: '綜合分數' });
}

function renderSubButtons() {
    const btnContainer = document.getElementById('button-container');
    btnContainer.innerHTML = ''; 
    let metrics = [];
    if (currentMode === 'stats') metrics = statsMetrics;
    else if (currentMode === 'maintenance') metrics = maintenanceMetrics;
    else if (currentMode === 'simulation') metrics = simulationMetrics;

    metrics.forEach((metric) => {
        const btn = document.createElement('button');
        btn.innerText = metric.label;
        btn.dataset.key = metric.key; 
        
        let isActive = (currentStatsMetric === metric.key && currentMode === 'stats') || (currentMaintenanceMetric === metric.key && currentMode === 'maintenance') || (currentSimulationMetric === metric.key && currentMode === 'simulation');
        if (isActive) btn.classList.add('active');

        btn.addEventListener('click', () => {
            if (btn.classList.contains('active') && !isDataView) return; 

            document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if(currentMode === 'stats') {
                currentStatsMetric = metric.key;
                document.getElementById('floating-stats-area').classList.add('hidden');
            }
            if(currentMode === 'maintenance') currentMaintenanceMetric = metric.key;
            if(currentMode === 'simulation') currentSimulationMetric = metric.key;

            showVariance = false; 
            updateVarianceBtnUI();
            toggleDataView();
            if (isDataView) renderDataView(); 
            
            if (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info') {
                if (layoutState === 'left') { layoutState = 'right'; }
                document.getElementById('barChart').classList.add('hidden');
                document.getElementById('varianceToggleBtn').classList.add('hidden');
                document.getElementById('maintenance-info-area').classList.remove('hidden');
            } else {
                document.getElementById('barChart').classList.remove('hidden');
                document.getElementById('maintenance-info-area').classList.add('hidden');
                setTimeout(() => { mapChart.resize(); barChart.resize(); }, 350);
                updateBarChart(); 
                updateMapTheme();
            }

            applyLayoutState();
        });
        btnContainer.appendChild(btn);
    });
}

window.triggerSubMetric = function(key) {
    const btns = document.querySelectorAll('.controls button');
    for (let b of btns) {
        if (b.dataset.key === key) {
            b.click(); 
            break;
        }
    }
};

document.getElementById('nav-stats').addEventListener('click', (e) => switchMode('stats', e.target));
document.getElementById('nav-tire').addEventListener('click', (e) => switchMode('tire', e.target));
document.getElementById('nav-operability').addEventListener('click', (e) => switchMode('operability', e.target));
document.getElementById('nav-maintenance').addEventListener('click', (e) => switchMode('maintenance', e.target));
document.getElementById('nav-simulation').addEventListener('click', (e) => switchMode('simulation', e.target));

function switchMode(mode, targetElement) {
    document.querySelectorAll('.top-nav button').forEach(btn => btn.classList.remove('active'));
    targetElement.classList.add('active');
    currentMode = mode;
    showVariance = false; 
    updateVarianceBtnUI();

    const maintMetricsArea = document.getElementById('maintenance-metrics-area');
    const simMetricsArea = document.getElementById('simulation-metrics-area');
    const detailPanel = document.getElementById('cityDetailPanel');
    const infoArea = document.getElementById('maintenance-info-area');
    const dashboard = document.getElementById('main-dashboard');
    const floatingStats = document.getElementById('floating-stats-area');

    maintMetricsArea.classList.add('hidden');
    simMetricsArea.classList.add('hidden');
    infoArea.classList.add('hidden');
    floatingStats.classList.add('hidden');
    document.getElementById('barChart').classList.remove('hidden');

    if (mode === 'stats') {
        currentStatsMetric = 'overall'; 
    } else {
        if (mode === 'maintenance') maintMetricsArea.classList.remove('hidden');
        else if (mode === 'simulation') simMetricsArea.classList.remove('hidden');
    }
    
    detailPanel.style.display = 'none';
    renderSubButtons();
    updateLegendBox();
    updateMapTheme(); 
    toggleDataView();
    
    applyLayoutState();
    
    if(currentMode !== 'stats' && (currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info')) {
        updateBarChart(); 
    }
}

let layoutState = 'split';
document.getElementById('layoutToggleBtn').addEventListener('click', () => {
    if (layoutState === 'split') layoutState = 'left';
    else if (layoutState === 'left') layoutState = 'right';
    else layoutState = 'split';
    applyLayoutState();
});

function applyLayoutState() {
    const dashboard = document.getElementById('main-dashboard');
    const left = document.getElementById('map-panel-container');
    const right = document.getElementById('right-chart-panel');
    const btn = document.getElementById('layoutToggleBtn');
    
    if (!btn || !dashboard || !left || !right) return;

    if (currentMode === 'stats' && currentStatsMetric === '') {
        btn.style.display = 'none'; 
        left.style.display = 'flex'; left.style.flex = '1';
        right.style.display = 'none'; right.style.flex = '0';
        dashboard.className = 'dashboard layout-left';
    } else {
        btn.style.display = 'inline-block';
        dashboard.className = `dashboard layout-${layoutState}`;
        if (layoutState === 'split') { 
            left.style.display = 'flex'; left.style.flex = '1';
            right.style.display = 'flex'; right.style.flex = '1';
            btn.innerText = '🔀 雙拼視圖'; 
        } else if (layoutState === 'left') { 
            left.style.display = 'flex'; left.style.flex = '1';
            right.style.display = 'none'; right.style.flex = '0';
            btn.innerText = '🗺️ 滿版左區'; 
        } else if (layoutState === 'right') { 
            left.style.display = 'none'; left.style.flex = '0';
            right.style.display = 'flex'; right.style.flex = '1';
            btn.innerText = '📊 滿版右區'; 
        }
    }

    let startTime = Date.now();
    function smoothResize() {
        if(mapChart) mapChart.resize(); 
        if(barChart) barChart.resize();
        if (Date.now() - startTime < 450) { 
            requestAnimationFrame(smoothResize);
        }
    }
    requestAnimationFrame(smoothResize);
}

document.getElementById('mapDataToggleBtn').addEventListener('click', () => { isDataView = !isDataView; toggleDataView(); });

const varianceToggleBtn = document.getElementById('varianceToggleBtn');
if (varianceToggleBtn) {
    varianceToggleBtn.addEventListener('click', () => { showVariance = !showVariance; updateVarianceBtnUI(); updateBarChart(); });
}

function updateVarianceBtnUI() {
    if (!varianceToggleBtn) return;
    if (currentMode === 'tire' || currentMode === 'stats' && currentStatsMetric === '') { varianceToggleBtn.classList.add('hidden'); return; }
    varianceToggleBtn.classList.remove('hidden');
    let textEl = document.getElementById('varianceToggleText');
    let iconEl = document.querySelector('#varianceToggleBtn .btn-icon');
    if(textEl) textEl.innerText = showVariance ? '還原數值' : '較上月變動';
    if(iconEl) iconEl.innerText = showVariance ? '🔙' : '🔄';
    varianceToggleBtn.classList.toggle('active-mode', showVariance);
}

function toggleDataView() {
    const dataContainer = document.getElementById('data-view-container');
    const toggleBtn = document.getElementById('mapDataToggleBtn');
    const legendBox = document.getElementById('legend-box-content');
    const detailPanel = document.getElementById('cityDetailPanel');
    const floatingStats = document.getElementById('floating-stats-area');

    if (!toggleBtn) return;

    if (currentMode === 'stats' && currentStatsMetric === '') {
        isDataView = false; toggleBtn.classList.add('hidden'); 
        if(dataContainer) dataContainer.classList.add('hidden');
        if(legendBox) legendBox.classList.remove('hidden'); 
        if(floatingStats) floatingStats.classList.remove('hidden');
        if(varianceToggleBtn) varianceToggleBtn.classList.add('hidden'); return;
    }
    toggleBtn.classList.remove('hidden');
    let textEl = document.getElementById('mapDataToggleText');
    let iconEl = document.querySelector('#mapDataToggleBtn .btn-icon');
    if(textEl) textEl.innerText = isDataView ? '切換地圖顯示' : '切換數據報表';
    if(iconEl) iconEl.innerText = isDataView ? '🗺️' : '📋';
    updateVarianceBtnUI();

    if (isDataView) {
        if(dataContainer) dataContainer.classList.remove('hidden'); 
        if(legendBox) legendBox.classList.add('hidden');
        if(detailPanel) detailPanel.style.display = 'none'; 
        if(currentMode === 'stats' && floatingStats) floatingStats.classList.add('hidden');
        renderDataView();
    } else {
        if(dataContainer) dataContainer.classList.add('hidden'); 
        if(legendBox) legendBox.classList.remove('hidden');
        if(currentMode === 'stats' && currentStatsMetric === '' && floatingStats) floatingStats.classList.remove('hidden');
    }
}

window.highlightRow = function(region) {
    if (!isDataView) document.getElementById('mapDataToggleBtn').click();
    document.querySelectorAll('.clean-data-table tbody tr').forEach(tr => tr.classList.remove('row-highlight'));
    const targetRow = document.getElementById(`row-${region}`);
    if (targetRow) { targetRow.classList.add('row-highlight'); targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    barChart.dispatchAction({ type: 'downplay' });
    barChart.dispatchAction({ type: 'highlight', name: region, seriesName: region });
    let dIdx = barChart.getOption().xAxis[0].data.findIndex(d => d === region);
    barChart.dispatchAction({ type: 'showTip', seriesIndex: currentMode === 'tire' ? barChart.getOption().series.findIndex(s => s.name === region) : (showVariance ? 0 : 1), dataIndex: dIdx > -1 ? dIdx : 5, name: region });
};

window.handleRowDblClick = function(region) {
    if (currentMode === 'simulation') {
        const item = rawData.find(r => r.region === region);
        let grade = currentSimulationMetric.replace('sim_', ''); 
        let gDesc = "", gColor = "";
        if (grade === 'a') { gDesc = "重大問題 (安全)"; gColor = "var(--danger-color)"; }
        else if (grade === 'b') { gDesc = "重點問題 (觀感)"; gColor = "var(--warning-color)"; }
        else if (grade === 'c') { gDesc = "一般問題 (內部管理)"; gColor = "var(--text-secondary)"; }

        if (item && item.top_problems && item.top_problems[grade]) {
            document.getElementById('simModalTitle').innerHTML = `${region} <span style="color:${gColor}; font-size:18px;">[${grade.toUpperCase()}級: ${gDesc}]</span>`;
            let probsArray = item.top_problems[grade].split(')、');
            let probs = probsArray.map((p, index) => {
                let text = index === probsArray.length - 1 ? p : p + ')';
                return `<li style="border-left: 5px solid ${gColor};">${text}</li>`;
            }).join('');

            document.getElementById('simModalBody').innerHTML = `<ul>${probs}</ul>`;
            document.getElementById('simModal').classList.remove('hidden');
        } else {
            document.getElementById('simModalTitle').innerHTML = `${region} - ${grade.toUpperCase()}級異常`;
            document.getElementById('simModalBody').innerHTML = `<p style="padding: 10px; color: var(--text-secondary);">此縣市目前無具體問題紀錄。</p>`;
            document.getElementById('simModal').classList.remove('hidden');
        }
    }
};

barChart.on('click', (params) => { let r = currentMode === 'tire' ? params.seriesName : params.name; if (r) highlightRow(r); });

const helpFabBtn = document.getElementById('helpFabBtn');
if (helpFabBtn) {
    helpFabBtn.addEventListener('click', () => document.getElementById('helpModal').classList.remove('hidden'));
}
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden'); }));

// 🌟 劇院模式 (收合選單) 控制
document.getElementById('zenToggleBtn').addEventListener('click', () => {
    document.body.classList.add('zen-mode');
    setTimeout(() => { mapChart.resize(); barChart.resize(); }, 150); // 重新計算圖表空間
});

document.getElementById('zenRestoreBtn').addEventListener('click', () => {
    document.body.classList.remove('zen-mode');
    setTimeout(() => { mapChart.resize(); barChart.resize(); }, 150);
});

// 🌟 長官護眼術 (數字放大) 控制
document.getElementById('dataZoomBtn').addEventListener('click', (e) => {
    isDataZoomed = !isDataZoomed;
    dataFontBoost = isDataZoomed ? 1.5 : 1; // ECharts 放大 1.5 倍
    
    // 設定 CSS 變數，讓表格與數據卡跟著放大
    document.documentElement.style.setProperty('--data-scale', isDataZoomed ? '1.5' : '1');
    
    // 按鈕 UI 變化
    e.target.innerText = isDataZoomed ? '🔍 還原數字' : '🔎 數字放大';
    e.target.style.background = isDataZoomed ? 'var(--warning-color)' : 'transparent';
    e.target.style.color = isDataZoomed ? '#fff' : 'var(--warning-color)';
    
    // 重新繪製圖表套用新數字大小
    updateMapTheme();
    updateBarChart();
});

document.getElementById('themeToggleBtn').addEventListener('click', (e) => {
    isLightMode = !isLightMode; document.body.classList.toggle('light-mode', isLightMode);
    e.target.innerText = isLightMode ? '🌙 深色模式' : '🌞 淺色模式';
    updateMapTheme(); if(currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info') updateBarChart(); 
});

window.adjustZoom = (val) => { document.getElementById('fontSizeSlider').value = val; document.getElementById('fontSizeSlider').dispatchEvent(new Event('input')); };
document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    globalFontScale = parseFloat(e.target.value); document.querySelectorAll('.zoom-target').forEach(el => el.style.zoom = globalFontScale);
    updateMapTheme(); updateBarChart();
});

const presentationBtn = document.getElementById('presentationToggleBtn');
if (presentationBtn) {
    presentationBtn.addEventListener('click', async () => {
        isPresentationMode = !isPresentationMode;
        if (isPresentationMode) { 
            if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => {}); 
            presentationBtn.classList.add('active'); presentationBtn.innerText = '🖥️ 退出投影'; adjustZoom(2.0); 
        } else { 
            if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen(); 
            presentationBtn.classList.remove('active'); presentationBtn.innerText = '📺 投影模式'; adjustZoom(1); 
        }
        setTimeout(() => { mapChart.resize(); barChart.resize(); }, 150);
    });
}

const laserDot = document.getElementById('laser-dot');
const laserToggleBtn = document.getElementById('laserToggleBtn');
if (laserToggleBtn && laserDot) {
    laserToggleBtn.addEventListener('click', (e) => {
        isLaserMode = !isLaserMode; document.body.classList.toggle('laser-active', isLaserMode);
        if (isLaserMode) { e.target.classList.add('active'); e.target.innerText = '❌ 關閉雷射'; laserDot.classList.add('active'); }
        else { e.target.classList.remove('active'); e.target.innerText = '🔴 雷射筆'; laserDot.classList.remove('active'); }
    });
    document.addEventListener('mousemove', (e) => { if (isLaserMode) laserDot.style.transform = `translate(${e.clientX - 8}px, ${e.clientY - 8}px)`; });
}

// 🌟 核心：確保地圖也能動態根據目前選中的子指標改變顏色！
function getMapValue(item) {
    if (currentMode === 'stats') return item[currentStatsMetric] || item.overall;
    else if (currentMode === 'tire') return item.tire_history[6]; 
    else if (currentMode === 'operability') return item.operability;
    else if (currentMode === 'maintenance') return item.maintenance_rate; 
    else if (currentMode === 'simulation') return item[currentSimulationMetric + '_ratio']; 
}

function getVisualMapOption() {
    const style = getComputedStyle(document.body);
    const dangerColor = style.getPropertyValue('--danger-color').trim();
    const safeColor = style.getPropertyValue('--safe-color').trim();
    
    if (currentMode === 'stats') return { show: false, min: 86, max: 94, inRange: { color: [dangerColor, '#f97316', '#eab308', safeColor] } };
    else if (currentMode === 'tire') return { show: false, min: 0, max: 8, inRange: { color: [safeColor, '#eab308', '#f97316', dangerColor] } };
    else if (currentMode === 'operability') return { show: false, min: 90, max: 99, inRange: { color: [dangerColor, '#f97316', '#eab308', safeColor] } };
    else if (currentMode === 'maintenance') return { show: false, min: 80, max: 100, inRange: { color: [dangerColor, '#f97316', '#eab308', safeColor] } };
    else if (currentMode === 'simulation') {
        let maxVal = currentSimulationMetric === 'sim_a' ? 10 : (currentSimulationMetric === 'sim_b' ? 25 : 60);
        return { show: false, min: 0, max: maxVal, inRange: { color: [safeColor, '#eab308', '#f97316', dangerColor] } };
    }
}

function renderInitialMap() {
    updateMapTheme(); 
}

function updateMapTheme() {
    if (!twGeoJson) return;
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-primary').trim();
    const mapBaseColor = style.getPropertyValue('--map-base').trim();
    const accentColor = style.getPropertyValue('--accent-color').trim();

    let mapData = [], lineData = [], scatterData = [];
    rawData.forEach(item => {
        let val = getMapValue(item);
        item.mapNames.forEach(name => mapData.push({ name: name, value: val, customRegion: item.region }));
        lineData.push({ coords: [item.mapCenter, item.labelPos], value: val });
        scatterData.push({ name: item.region, value: [item.labelPos[0], item.labelPos[1], val, item.tire_count] });
    });

    mapChart.setOption({
        geo: { map: 'Taiwan', roam: true, scaleLimit: { min: 0.8, max: 5 }, itemStyle: { areaColor: mapBaseColor, borderColor: isLightMode ? '#ffffff' : '#334155', borderWidth: 1 }, emphasis: { itemStyle: { areaColor: accentColor }, label: { show: false } } },
        visualMap: getVisualMapOption(),
        series: [
            { type: 'map', geoIndex: 0, data: mapData }, 
            { type: 'lines', coordinateSystem: 'geo', zlevel: 2, lineStyle: { color: isLightMode ? '#94a3b8' : '#64748b', width: 1.5, opacity: 0.6, curveness: 0.2 }, data: lineData }, 
            { 
                type: 'scatter', coordinateSystem: 'geo', zlevel: 3, symbolSize: 0, data: scatterData, itemStyle: { color: accentColor }, 
                label: {
                    show: true, position: 'center', 
                    formatter: function(params) { 
                        if (currentMode === 'tire') return `{region|${params.name}}\n{score|${params.value[3]} 輛}`;
                        let unit = '%'; if(currentMode === 'stats') unit = '分';
                        return `{region|${params.name}}\n{score|${params.value[2]} ${unit}}`; 
                    },
                    backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.8)', borderColor: isLightMode ? '#94a3b8' : '#334155', borderWidth: 1, padding: [6, 8], borderRadius: 4, 
                    rich: { 
                        region: { color: textColor, fontSize: 13 * globalFontScale, fontWeight: 'bold', align: 'center', padding: [0, 0, 4, 0] }, 
                        score: { color: accentColor, fontSize: 14 * globalFontScale * dataFontBoost, fontWeight: 'bold', align: 'center' } 
                    }
                } 
            }
        ]
    }, false); 
}

function updateBarChart() {
    if (!twGeoJson) return;
    if (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info') return;
    if (currentMode === 'stats' && currentStatsMetric === '') return; 
    
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-primary').trim();
    const gridColor = style.getPropertyValue('--chart-grid').trim();
    const accentColor = style.getPropertyValue('--accent-color').trim();
    const dangerColor = style.getPropertyValue('--danger-color').trim();
    const safeColor = style.getPropertyValue('--safe-color').trim();

    if (currentMode === 'tire') {
        const sortedData = [...rawData].sort((a, b) => b.tire_history[6] - a.tire_history[6]); 
        const regions = sortedData.map(item => item.region);
        const months = ['25/11', '25/12', '26/01', '26/02', '26/03', '26/04'];
        const dangerColors = ['#e11d48', '#be185d', '#7e22ce', '#b45309', '#a21caf', '#c2410c', '#1d4ed8'];
        let colorIdx = 0; const seriesData = [];

        sortedData.forEach((item, index) => {
            let val = item.tire_history[6]; let isBad = val > 4.5; 
            let lineColor = isBad ? dangerColors[colorIdx++ % dangerColors.length] : (isLightMode ? '#94a3b8' : '#475569');
            seriesData.push({
                name: item.region, type: 'line', data: item.tire_history.slice(1), smooth: true, symbol: isBad ? 'circle' : 'none', symbolSize: 8,
                lineStyle: { width: isBad ? 4 : 2, opacity: isBad ? 1 : 0.4 }, itemStyle: { color: lineColor },
                emphasis: { focus: 'series', lineStyle: { width: 7, shadowBlur: 15, shadowColor: lineColor, opacity: 1 }, label: { show: true, fontSize: 16 * globalFontScale, fontWeight: 'bold' } },
                label: { show: false }, endLabel: { show: true, formatter: '{a} {c}%', color: 'inherit', fontSize: (isBad ? 14 : 11) * globalFontScale * dataFontBoost, fontWeight: isBad ? 'bold' : 'normal' },
                labelLayout: { moveOverlap: 'shiftY' }, zlevel: isBad ? 10 : 1
            });
        });

        barChart.setOption({
            title: { text: '全國各縣市前後胎壓未達標趨勢 (近 6 個月)', left: 'center', textStyle: { color: textColor, fontSize: 15 * globalFontScale } },
            tooltip: { trigger: 'axis', backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor }, valueFormatter: (value) => value + '%' },
            legend: { show: false }, grid: { left: '3%', right: '12%', bottom: '10%', top: '15%', containLabel: true }, 
            xAxis: { type: 'category', data: months, axisLabel: { color: textColor, fontSize: 12 * globalFontScale }, axisLine: { lineStyle: { color: gridColor } } },
            yAxis: { type: 'value', axisLabel: { color: textColor, formatter: '{value} %', fontSize: 12 * globalFontScale }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
            series: seriesData
        }, true);
        return;
    }

    let regions, currentValues, previousValues, varianceValues, chartTitle, avgValue, isPercentage = false;

    const getVarColor = (val) => {
        if (val === 0) return isLightMode ? '#94a3b8' : '#475569';
        if (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_accident') return val > 0 ? dangerColor : safeColor;
        if (currentMode === 'simulation') return val > 0 ? dangerColor : safeColor;
        return val > 0 ? safeColor : dangerColor;
    };

    if (currentMode === 'stats') {
        const sortedData = [...rawData].sort((a, b) => a[currentStatsMetric] - b[currentStatsMetric]);
        regions = sortedData.map(item => item.region); 
        currentValues = sortedData.map(item => item[currentStatsMetric]); 
        previousValues = sortedData.map(item => item[currentStatsMetric + '_feb']);
        varianceValues = sortedData.map(item => parseFloat((item[currentStatsMetric] - item[currentStatsMetric + '_feb']).toFixed(2)));
        chartTitle = `各區指標對比 - ${statsMetrics.find(m => m.key === currentStatsMetric).label} (由低至高)`;
    } else if (currentMode === 'operability') {
        isPercentage = true;
        const sortedData = [...rawData].sort((a, b) => a.operability - b.operability);
        regions = sortedData.map(item => item.region); 
        currentValues = sortedData.map(item => item.operability); 
        previousValues = sortedData.map(item => item.operability_feb);
        varianceValues = sortedData.map(item => parseFloat((item.operability - item.operability_feb).toFixed(2)));
        chartTitle = `各縣市場站可動率對比 (由低至高)`;
    } else if (currentMode === 'maintenance') {
        isPercentage = currentMaintenanceMetric === 'maintenance_rate';
        const sortLogic = currentMaintenanceMetric === 'm_accident' ? (a, b) => b[currentMaintenanceMetric] - a[currentMaintenanceMetric] : (a, b) => a[currentMaintenanceMetric] - b[currentMaintenanceMetric];
        const sortedData = [...rawData].sort(sortLogic);
        regions = sortedData.map(item => item.region); 
        currentValues = sortedData.map(item => item[currentMaintenanceMetric]); 
        previousValues = sortedData.map(item => item[currentMaintenanceMetric + '_feb']);
        varianceValues = sortedData.map(item => parseFloat((item[currentMaintenanceMetric] - item[currentMaintenanceMetric + '_feb']).toFixed(2)));
        chartTitle = `各縣市${maintenanceMetrics.find(m => m.key === currentMaintenanceMetric).label}對比`;
    } else if (currentMode === 'simulation') {
        isPercentage = true;
        const sortedData = [...rawData].sort((a, b) => b[currentSimulationMetric + '_ratio'] - a[currentSimulationMetric + '_ratio']);
        regions = sortedData.map(item => item.region); 
        currentValues = sortedData.map(item => item[currentSimulationMetric + '_ratio']); 
        previousValues = sortedData.map(item => item[currentSimulationMetric + '_lm']);
        varianceValues = sortedData.map(item => parseFloat((item[currentSimulationMetric + '_ratio'] - item[currentSimulationMetric + '_lm']).toFixed(2)));
        chartTitle = `${simulationMetrics.find(m => m.key === currentSimulationMetric).label}異常占比對比 (由高至低)`;
    }

    let displayData = showVariance ? varianceValues : currentValues;
    avgValue = (displayData.reduce((acc, curr) => acc + curr, 0) / displayData.length).toFixed(isPercentage ? 2 : 1);

    let seriesConfig = [];
    if (showVariance) {
        seriesConfig = [{
            name: '較上月變動', type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] },
            data: varianceValues.map(val => ({ value: val, itemStyle: { color: getVarColor(val) } })),
            label: { show: true, position: 'top', color: textColor, fontWeight: 'bold', formatter: val => (val.value > 0 ? '+' : '') + val.value + (isPercentage?'%':''), fontSize: 13 * globalFontScale * dataFontBoost },
            markLine: { symbol: 'none', data: [{ type: 'average', name: '平均變動' }], label: { formatter: `平均\n${avgValue > 0 ? '+':''}${avgValue}${isPercentage?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold', fontSize: 11 * globalFontScale }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } }
        }];
    } else {
        seriesConfig = [
            { name: '3月 (前月)', type: 'bar', barWidth: '30%', itemStyle: { color: isLightMode ? '#94a3b8' : '#475569', borderRadius: [4, 4, 0, 0] }, label: { show: false }, data: previousValues },
            {
                name: '4月 (當月)', type: 'bar', barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] },
                data: currentValues.map((val, idx) => {
                    let barColor = accentColor;
                    if (currentMode === 'stats' || currentMode === 'operability') barColor = val < avgValue ? dangerColor : accentColor;
                    else if (currentMode === 'simulation') barColor = val > avgValue ? dangerColor : safeColor;
                    else if (currentMode === 'maintenance') {
                        if (currentMaintenanceMetric === 'm_accident') barColor = val > avgValue ? dangerColor : safeColor;
                        else if (currentMaintenanceMetric === 'maintenance_rate') barColor = val < avgValue ? dangerColor : accentColor;
                    }
                    return { value: val, itemStyle: { color: barColor } };
                }),
                label: { show: true, position: 'top', color: textColor, fontWeight: 'bold', formatter: isPercentage ? '{c}%' : '{c}', fontSize: 12 * globalFontScale * dataFontBoost },
                markLine: { symbol: 'none', data: [{ type: 'average', name: '平均' }], label: { formatter: `4月平均\n${avgValue}${isPercentage?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold', fontSize: 11 * globalFontScale }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } }
            }
        ];
    }

    barChart.setOption({
        title: { text: chartTitle + (showVariance ? ' - 較上月變動' : ' - 本月數值'), left: 'center', textStyle: { color: textColor, fontSize: 15 * globalFontScale } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor }, formatter: (p) => { let h = `<div style="font-weight:bold;margin-bottom:5px;">${p[0].axisValue}</div>`; p.forEach(x => { h += `${x.marker} ${x.seriesName}: <b style="color:${x.color}">${(x.value > 0 && showVariance ? '+' : '')}${x.value}${isPercentage ? '%' : ''}</b><br/>`; }); return h; } },
        legend: { show: !showVariance, data: ['3月 (前月)', '4月 (當月)'], bottom: 0, textStyle: { color: textColor, fontSize: 12 * globalFontScale } },
        grid: { left: '3%', right: '8%', bottom: '15%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: regions, axisLabel: { color: textColor, fontSize: 12 * globalFontScale }, axisLine: { lineStyle: { color: gridColor } } },
        yAxis: { type: 'value', min: (v) => (isPercentage && !showVariance) ? Math.max(0, Math.floor(v.min - 5)) : null, axisLabel: { color: textColor, formatter: isPercentage ? '{value} %' : '{value}', fontSize: 12 * globalFontScale }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
        series: seriesConfig
    }, true);
}

// 🌟 核心：透過 HTML 標籤點擊呼叫對應按鈕，並加入高級雙層微排版
function renderDataView() {
    const container = document.getElementById('data-view-container');
    let title = document.querySelector('.top-nav button.active').innerText;
    let html = `<h3 style="margin-top:0; color:var(--accent-color); border-bottom:1px solid var(--border-color); padding-bottom:10px;">${title} - 各縣市明細報表</h3>`;
    
    if(currentMode === 'simulation') {
        html += `<div style="font-size:12px; color:var(--warning-color); margin-bottom:10px;">💡 提示：雙擊縣市列可顯示 A/B/C 級異常詳細分析</div>`;
    }
    
    html += '<table class="clean-data-table"><thead><tr>';
    const trStr = (r) => `<tr id="row-${r.region}" onclick="highlightRow('${r.region}')" ondblclick="handleRowDblClick('${r.region}')">`;

    if (currentMode === 'stats') {
        let th = (key, label) => `<th class="${currentStatsMetric === key ? 'active-col' : 'clickable-th'}" onclick="triggerSubMetric('${key}')">${label}</th>`;
        html += `<th>縣市</th>${th('overall', '綜合分數')}${th('station', '場站妥善度')}${th('appearance', '外觀標示')}${th('functionality', '重要機能')}${th('ems', 'EMS維護率')}${th('operability', '可動率')}</tr></thead><tbody>`;
        rawData.forEach(r => {
            let cl = (key) => currentStatsMetric === key ? 'class="active-col"' : '';
            
            // 🌟 大師級微排版：計算與上月的差異，並設定趨勢顏色與箭頭
            let diff = (r.overall - r.overall_feb).toFixed(2);
            let diffIcon = diff > 0 ? '▲' : (diff < 0 ? '▼' : '-');
            let diffColor = diff > 0 ? 'var(--safe-color)' : (diff < 0 ? 'var(--danger-color)' : 'var(--text-secondary)');

            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td ${cl('overall')}>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.3;">
                        <span style="color:var(--accent-color); font-weight:bold; font-size: 14px;">${r.overall} 分</span>
                        <span style="font-size: 11px; color: var(--text-secondary); font-weight: normal; letter-spacing: 0.5px;">
                            上月 ${r.overall_feb} <span style="color: ${diffColor}; margin-left: 2px; font-size: 10px;">${diffIcon}</span>
                        </span>
                    </div>
                </td>
                <td ${cl('station')}>${r.station} 分</td><td ${cl('appearance')}>${r.appearance} 分</td>
                <td ${cl('functionality')}>${r.functionality} 分</td><td ${cl('ems')}>${r.ems}%</td><td ${cl('operability')}>${r.operability}%</td></tr>`;
        });
    } else if (currentMode === 'tire') {
        html += '<th>縣市</th><th>25年11月</th><th>25年12月</th><th>26年01月</th><th>26年02月</th><th>26年03月</th><th>26年04月 (當月)</th></tr></thead><tbody>';
        rawData.forEach(r => {
            let v4m = r.tire_history[6];
            let v4mColor = v4m > 4.5 ? 'var(--danger-color)' : (v4m > 4.0 ? 'var(--warning-color)' : 'var(--safe-color)');
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td>${r.tire_history[1]}%</td><td>${r.tire_history[2]}%</td><td>${r.tire_history[3]}%</td>
                <td>${r.tire_history[4]}%</td><td>${r.tire_history[5]}%</td>
                <td style="color:${v4mColor};font-weight:bold;">${v4m}% (${r.tire_count}輛)</td></tr>`;
        });
    } else if (currentMode === 'operability') {
        html += '<th>縣市</th><th>3月可動率</th><th>4月可動率</th><th>月度變動</th></tr></thead><tbody>';
        rawData.forEach(r => {
            let variance = (r.operability - r.operability_feb).toFixed(2);
            let varianceSign = variance > 0 ? '+' : '';
            let varColor = variance < 0 ? 'var(--danger-color)' : 'var(--safe-color)';
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td>${r.operability_feb.toFixed(2)}%</td>
                <td style="color:var(--accent-color);font-weight:bold;">${r.operability.toFixed(2)}%</td>
                <td style="color:${varColor};font-weight:bold;">${varianceSign}${variance}%</td></tr>`;
        });
    } else if (currentMode === 'maintenance') {
        let th = (key, label) => `<th class="${currentMaintenanceMetric === key ? 'active-col' : 'clickable-th'}" onclick="triggerSubMetric('${key}')">${label}</th>`;
        html += `<th>縣市</th><th>總營運車輛</th>${th('m_accident', '事故車輛數')}${th('m_records', '維護記錄數')}${th('maintenance_rate', '一級維護率')}<th>較上月變動</th></tr></thead><tbody>`;
        rawData.forEach(r => {
            let cl = (key) => currentMaintenanceMetric === key ? 'class="active-col"' : '';
            let varColor = r.m_var.includes('-') ? 'var(--danger-color)' : 'var(--safe-color)';
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td>${r.m_fleet.toLocaleString()}</td><td ${cl('m_accident')} style="color:var(--danger-color);font-weight:bold;">${r.m_accident}</td>
                <td ${cl('m_records')}>${r.m_records.toLocaleString()}</td><td ${cl('maintenance_rate')} style="color:var(--accent-color);font-weight:bold;">${r.maintenance_rate}%</td>
                <td style="color:${varColor};font-weight:bold;">${r.m_var}</td></tr>`;
        });
    } else if (currentMode === 'simulation') {
        let th = (key, label) => `<th class="${currentSimulationMetric === key ? 'active-col' : 'clickable-th'}" onclick="triggerSubMetric('${key}')">${label}</th>`;
        html += `<th>縣市</th>${th('sim_a', 'A級異常')}${th('sim_b', 'B級異常')}${th('sim_c', 'C級異常')}</tr></thead><tbody>`;
        rawData.forEach(r => {
            let cl = (key) => currentSimulationMetric === key ? 'class="active-col"' : '';
            let aColor = r.sim_a_ratio > 5.0 ? 'var(--danger-color)' : 'var(--text-primary)';
            let bColor = r.sim_b_ratio > 20.0 ? 'var(--danger-color)' : 'var(--text-primary)';
            let cColor = r.sim_c_ratio > 50.0 ? 'var(--danger-color)' : 'var(--text-primary)';
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td ${cl('sim_a')} style="color:${aColor};font-weight:bold;">${r.sim_a_count} 輛 (${r.sim_a_ratio}%)</td>
                <td ${cl('sim_b')} style="color:${bColor};font-weight:bold;">${r.sim_b_count} 輛 (${r.sim_b_ratio}%)</td>
                <td ${cl('sim_c')} style="color:${cColor};font-weight:bold;">${r.sim_c_count} 輛 (${r.sim_c_ratio}%)</td></tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderFleetDetails() {
    const container = document.getElementById('fleet-detail-grid');
    const simContainer = document.getElementById('sim-detail-grid');
    let htmlFleet = '', htmlSim = '';
    rawData.forEach(item => {
        htmlFleet += `<div class="metric-card hover-glow" style="padding: 8px;"><div style="font-size: 13px; font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">${item.region}</div><div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;"><span>3月:</span><span>${item.m_fleet_feb.toLocaleString()}</span></div><div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--accent-color); font-weight: bold;"><span>4月:</span><span>${item.m_fleet.toLocaleString()}</span></div></div>`;
        htmlSim += `<div class="metric-card hover-glow" style="padding: 8px;"><div style="font-size: 13px; font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">${item.region}</div><div style="font-size: 16px; color: var(--accent-color); font-weight: bold;">${item.sim_total.toLocaleString()} 輛</div></div>`;
    });
    container.innerHTML = htmlFleet;
    simContainer.innerHTML = htmlSim;
}

function toggleFleetDetails() {
    showingFleetDetails = !showingFleetDetails;
    document.getElementById('fleet-summary').classList.toggle('hidden', showingFleetDetails);
    document.getElementById('fleet-details').classList.toggle('hidden', !showingFleetDetails);
    document.getElementById('fleet-title-hint').innerText = showingFleetDetails ? '(點擊收合回總計)' : '(點擊展開各縣市明細)';
}

function toggleSimDetails() {
    showingSimDetails = !showingSimDetails;
    document.getElementById('sim-summary').classList.toggle('hidden', showingSimDetails);
    document.getElementById('sim-details').classList.toggle('hidden', !showingSimDetails);
    document.getElementById('sim-title-hint').innerText = showingSimDetails ? '(點擊收合回總計)' : '(點擊展開各縣市數量)';
}

function updateLegendBox() {
    const legendBox = document.getElementById('legend-box-content');
    if (currentMode === 'stats') {
        legendBox.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">地圖綜合分數</div><div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>大於等於 92分</div><div class="legend-item"><div class="color-box" style="background: #eab308;"></div>90 - 91.9分</div><div class="legend-item"><div class="color-box" style="background: #f97316;"></div>88 - 89.9分</div><div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>低於 88分</div>`;
    } else if (currentMode === 'tire') {
        legendBox.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">胎壓未達標率</div><div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>0% - 2%</div><div class="legend-item"><div class="color-box" style="background: #eab308;"></div>3% - 4%</div><div class="legend-item"><div class="color-box" style="background: #f97316;"></div>5% - 7%</div><div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>大於 7%</div>`;
    } else if (currentMode === 'operability') {
        legendBox.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">場站可動率 (總分扣分)</div><div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>99% ~ 100% (扣 0 分)</div><div class="legend-item"><div class="color-box" style="background: #eab308;"></div>95% ~ 99% (扣 1~2 分)</div><div class="legend-item"><div class="color-box" style="background: #f97316;"></div>91% ~ 95% (扣 3~4 分)</div><div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>未達 91% (扣 5 分)</div><div style="margin-top: 5px; color: var(--text-secondary); font-size: 11px;">*計分邏輯：含下不含上</div>`;
    } else if (currentMode === 'maintenance') {
        legendBox.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">一級維護率</div><div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>95% - 100%</div><div class="legend-item"><div class="color-box" style="background: #eab308;"></div>90% - 94.9%</div><div class="legend-item"><div class="color-box" style="background: #f97316;"></div>85% - 89.9%</div><div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>未達 85%</div>`;
    } else if (currentMode === 'simulation') {
        let gradeStr = currentSimulationMetric === 'sim_a' ? 'A級' : (currentSimulationMetric === 'sim_b' ? 'B級' : 'C級');
        let ranges = currentSimulationMetric === 'sim_a' ? ['0% - 3%', '4% - 5%', '6% - 10%', '大於 10%'] : 
                     (currentSimulationMetric === 'sim_b' ? ['0% - 10%', '11% - 19%', '20% - 25%', '大於 25%'] : 
                     ['0% - 30%', '31% - 45%', '46% - 55%', '大於 55%']);

        legendBox.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">${gradeStr} 異常占比</div>
            <div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>${ranges[0]}</div>
            <div class="legend-item"><div class="color-box" style="background: #eab308;"></div>${ranges[1]}</div>
            <div class="legend-item"><div class="color-box" style="background: #f97316;"></div>${ranges[2]}</div>
            <div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>${ranges[3]}</div>
            <div style="margin-top: 5px; color: var(--text-secondary); font-size: 11px;">*不同異常級別有不同的警示門檻</div>`;
    }
}

function setupMapClickEvent() {
    mapChart.on('click', (p) => {
        let cr = (p.seriesType === 'map') ? rawData.find(r => r.mapNames.includes(p.name)) : rawData.find(r => r.region === p.name);
        if (cr) {
            const panel = document.getElementById('cityDetailPanel');
            if (currentMode === 'stats') { panel.querySelector('#detail-title').innerText = `${cr.region} 指標細節 (4月)`; panel.querySelector('#detail-content').innerHTML = `<div class="detail-row"><span>綜合分數:</span><span style="color:var(--accent-color); font-weight:bold;">${cr.overall}</span></div><div class="detail-row"><span>場站妥善度:</span><span>${cr.station}</span></div><div class="detail-row"><span>外觀標示:</span><span>${cr.appearance}</span></div><div class="detail-row"><span>重要機能:</span><span>${cr.functionality}</span></div><div class="detail-row"><span>EMS維護率:</span><span>${cr.ems}%</span></div><div class="detail-row"><span>可動率:</span><span>${cr.operability}%</span></div>`; }
            else if (currentMode === 'tire') { panel.querySelector('#detail-title').innerText = `${cr.region} 胎壓未達標趨勢`; panel.querySelector('#detail-content').innerHTML = `<div class="detail-row"><span>26年 04月:</span><span style="color:var(--accent-color); font-weight:bold;">${cr.tire_history[6]}% (${cr.tire_count}輛)</span></div>`; }
            else if (currentMode === 'operability') { let v = (cr.operability - cr.operability_feb).toFixed(2); panel.querySelector('#detail-title').innerText = `${cr.region} 月度分析`; panel.querySelector('#detail-content').innerHTML = `<div class="detail-row"><span>4月可動率:</span><span style="color:var(--accent-color); font-weight:bold;">${cr.operability.toFixed(2)}%</span></div><div class="detail-row"><span>變動:</span><span style="color:${v < 0 ? 'var(--danger-color)' : 'var(--safe-color)'}; font-weight:bold;">${v > 0 ? '+' : ''}${v}%</span></div>`; }
            else if (currentMode === 'maintenance') { panel.querySelector('#detail-title').innerText = `${cr.region} 維護統計`; panel.querySelector('#detail-content').innerHTML = `<div class="detail-row"><span>事故車:</span><span style="color:var(--danger-color); font-weight:bold;">${cr.m_accident} 輛</span></div><div class="detail-row"><span>維護率:</span><span style="color:var(--accent-color); font-weight:bold;">${cr.maintenance_rate}%</span></div>`; }
            else if (currentMode === 'simulation') { panel.querySelector('#detail-title').innerText = `${cr.region} 模擬體驗`; panel.querySelector('#detail-content').innerHTML = `<div class="detail-row"><span>A級異常:</span><span style="font-weight:bold;">${cr.sim_a_count} 輛 (${cr.sim_a_ratio}%)</span></div><div class="detail-row"><span>B級異常:</span><span style="font-weight:bold;">${cr.sim_b_count} 輛 (${cr.sim_b_ratio}%)</span></div>`; }
            panel.style.display = 'block';
        }
    });
    mapChart.getZr().on('click', (e) => { if (!e.target) document.getElementById('cityDetailPanel').style.display = 'none'; });
}

// 初始化佈局與圖表
async function initDashboard() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json');
        twGeoJson = await response.json();
        echarts.registerMap('Taiwan', twGeoJson);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('mapChart').style.opacity = '1';
        
        renderSubButtons();
        renderFleetDetails(); 
        updateLegendBox();
        applyLayoutState(); 
        
        renderInitialMap();
        updateBarChart();
        setupMapClickEvent();
        
        setTimeout(() => { mapChart.resize(); }, 350);

    } catch (error) {
        document.getElementById('loading').innerText = '地圖載入失敗，請檢查網路連線。';
    }
}

initDashboard();

// 防抖重繪
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if(mapChart) mapChart.resize(); 
        if(barChart) barChart.resize();
    }, 200); 
});

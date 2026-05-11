// js/app.js
let isLightMode = true; 
let twGeoJson = null;
let currentMode = 'stats'; 
let showingFleetDetails = false;
let showingSimDetails = false;
let isDataView = false; 
let showVariance = false; 

let currentStatsMetric = 'station';
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
        let isActive = (currentStatsMetric === metric.key && currentMode === 'stats') || (currentMaintenanceMetric === metric.key && currentMode === 'maintenance') || (currentSimulationMetric === metric.key && currentMode === 'simulation');
        if (isActive) btn.classList.add('active');

        btn.addEventListener('click', () => {
            // 🌟 防呆優化：如果點擊的已經是當前正在顯示的按鈕，就直接 return 不做事，避免浪費效能重複繪製！
            if (btn.classList.contains('active')) return;
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
            
            // 🌟 智慧防呆：點擊「補充說明」時，若地圖為滿版左側，則流暢滑向右側
            if (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info') {
                if (layoutState === 'left') { 
                    layoutState = 'right'; 
                }
                document.getElementById('barChart').classList.add('hidden');
                document.getElementById('varianceToggleBtn').classList.add('hidden');
                document.getElementById('maintenance-info-area').classList.remove('hidden');
            } else {
                document.getElementById('barChart').classList.remove('hidden');
                document.getElementById('maintenance-info-area').classList.add('hidden');
                updateBarChart(); 
                updateMapTheme();
            }

            // 觸發全新的絲滑佈局引擎
            applyLayoutState();
        });
        btnContainer.appendChild(btn);
    });
}

// 導覽列與模式切換
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
    const floatingStats = document.getElementById('floating-stats-area');

    maintMetricsArea.classList.add('hidden');
    simMetricsArea.classList.add('hidden');
    infoArea.classList.add('hidden');
    floatingStats.classList.add('hidden');
    document.getElementById('barChart').classList.remove('hidden');

    if (mode === 'stats') {
        currentStatsMetric = ''; 
    } else {
        if (mode === 'maintenance') maintMetricsArea.classList.remove('hidden');
        else if (mode === 'simulation') simMetricsArea.classList.remove('hidden');
    }
    
    detailPanel.style.display = 'none';
    renderSubButtons();
    updateLegendBox();
    updateMapTheme(); 
    toggleDataView();
    
    // 觸發佈局
    applyLayoutState();
    
    if(currentMode !== 'stats' && (currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info')) {
        updateBarChart(); 
    }
}

// 🌟 升級版：三段佈局絲滑切換引擎
let layoutState = 'split';
document.getElementById('layoutToggleBtn').addEventListener('click', () => {
    if (layoutState === 'split') layoutState = 'left';
    else if (layoutState === 'left') layoutState = 'right';
    else layoutState = 'split';
    applyLayoutState();
});

function applyLayoutState() {
    const dashboard = document.getElementById('main-dashboard');
    const btn = document.getElementById('layoutToggleBtn');
    
    if (!btn || !dashboard) return;

    // 清除舊版的硬核 display 設定，全部交由 CSS 的 class 去處理滑動
    document.getElementById('map-panel-container').style.display = '';
    document.getElementById('right-chart-panel').style.display = '';

    // 首頁強制隱藏按鈕，並設為左滿版
    if (currentMode === 'stats' && currentStatsMetric === '') {
        btn.style.display = 'none'; 
        dashboard.className = 'dashboard layout-left';
    } else {
        btn.style.display = 'inline-block';
        dashboard.className = `dashboard layout-${layoutState}`;
        if (layoutState === 'split') { btn.innerText = '🔀 雙拼視圖'; }
        else if (layoutState === 'left') { btn.innerText = '🗺️ 滿版左區'; }
        else if (layoutState === 'right') { btn.innerText = '📊 滿版右區'; }
    }

    // 🌟 神級魔法：高幀率圖表重繪 (High-FPS Resize)
    // 讓 ECharts 在面板「滑動」的 450 毫秒期間，以每秒 60 幀的速度動態調整大小，確保縮放過程無比流暢！
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

// 數據切換與高亮
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
            let probs = item.top_problems[grade].split(/(?<=\))、/).map(p => `<li style="border-left: 5px solid ${gColor};">${p}</li>`).join('');
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

// 手冊控制與點擊外部關閉
const helpFabBtn = document.getElementById('helpFabBtn');
if (helpFabBtn) {
    helpFabBtn.addEventListener('click', () => document.getElementById('helpModal').classList.remove('hidden'));
}
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden'); }));

// 工具列與地圖
document.getElementById('themeToggleBtn').addEventListener('click', (e) => {
    isLightMode = !isLightMode; document.body.classList.toggle('light-mode', isLightMode);
    e.target.innerText = isLightMode ? '🌙 深色模式' : '🌞 淺色模式';
    updateMapTheme(); if(currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info') updateBarChart(); 
});

// 字體縮放
window.adjustZoom = (val) => { document.getElementById('fontSizeSlider').value = val; document.getElementById('fontSizeSlider').dispatchEvent(new Event('input')); };
document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    globalFontScale = parseFloat(e.target.value); document.querySelectorAll('.zoom-target').forEach(el => el.style.zoom = globalFontScale);
    updateMapTheme(); updateBarChart();
});

// 投影模式
const presentationBtn = document.getElementById('presentationToggleBtn');
presentationBtn.addEventListener('click', async () => {
    isPresentationMode = !isPresentationMode;
    if (isPresentationMode) { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => {}); presentationBtn.classList.add('active'); presentationBtn.innerText = '🖥️ 退出投影'; adjustZoom(2.0); }
    else { if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen(); presentationBtn.classList.remove('active'); presentationBtn.innerText = '📺 投影模式'; adjustZoom(1); }
    setTimeout(() => { mapChart.resize(); barChart.resize(); }, 150);
});

// 雷射筆
const laserDot = document.getElementById('laser-dot');
document.getElementById('laserToggleBtn').addEventListener('click', (e) => {
    isLaserMode = !isLaserMode; document.body.classList.toggle('laser-active', isLaserMode);
    if (isLaserMode) { e.target.classList.add('active'); e.target.innerText = '❌ 關閉雷射'; laserDot.classList.add('active'); }
    else { e.target.classList.remove('active'); e.target.innerText = '🔴 雷射筆'; laserDot.classList.remove('active'); }
});
document.addEventListener('mousemove', (e) => { if (isLaserMode) laserDot.style.transform = `translate(${e.clientX - 8}px, ${e.clientY - 8}px)`; });

// ECharts 核心函數
function getMapValue(item) {
    if (currentMode === 'stats') return item.overall;
    else if (currentMode === 'tire') return item.tire_history[6]; 
    else if (currentMode === 'operability') return item.operability;
    else if (currentMode === 'maintenance') return item.maintenance_rate; 
    else if (currentMode === 'simulation') return item[currentSimulationMetric + '_ratio']; 
}
function getVisualMapOption() {
    const s = getComputedStyle(document.body); const d = s.getPropertyValue('--danger-color').trim(); const f = s.getPropertyValue('--safe-color').trim();
    if (currentMode === 'stats') return { show: false, min: 86, max: 94, inRange: { color: [d, '#f97316', '#eab308', f] } };
    else if (currentMode === 'tire') return { show: false, min: 0, max: 8, inRange: { color: [f, '#eab308', '#f97316', d] } };
    else if (currentMode === 'operability') return { show: false, min: 90, max: 99, inRange: { color: [d, '#f97316', '#eab308', f] } };
    else if (currentMode === 'maintenance') return { show: false, min: 80, max: 100, inRange: { color: [d, '#f97316', '#eab308', f] } };
    else if (currentMode === 'simulation') { let m = currentSimulationMetric === 'sim_a' ? 10 : (currentSimulationMetric === 'sim_b' ? 25 : 60); return { show: false, min: 0, max: m, inRange: { color: [f, '#eab308', '#f97316', d] } }; }
}
function renderInitialMap() { updateMapTheme(); }
function updateMapTheme() {
    if (!twGeoJson) return; const s = getComputedStyle(document.body); const t = s.getPropertyValue('--text-primary').trim(); const m = s.getPropertyValue('--map-base').trim(); const a = s.getPropertyValue('--accent-color').trim();
    let mapD = [], lineD = [], scatD = [];
    rawData.forEach(i => { let v = getMapValue(i); i.mapNames.forEach(n => mapD.push({ name: n, value: v, customRegion: i.region })); lineD.push({ coords: [i.mapCenter, i.labelPos], value: v }); scatD.push({ name: i.region, value: [i.labelPos[0], i.labelPos[1], v, i.tire_count] }); });
    mapChart.setOption({ geo: { map: 'Taiwan', roam: true, scaleLimit: { min: 0.8, max: 5 }, itemStyle: { areaColor: m, borderColor: isLightMode ? '#ffffff' : '#334155', borderWidth: 1 }, emphasis: { itemStyle: { areaColor: a }, label: { show: false } } }, visualMap: getVisualMapOption(), series: [{ type: 'map', geoIndex: 0, data: mapD }, { type: 'lines', coordinateSystem: 'geo', zlevel: 2, lineStyle: { color: isLightMode ? '#94a3b8' : '#64748b', width: 1.5, opacity: 0.6, curveness: 0.2 }, data: lineD }, { type: 'scatter', coordinateSystem: 'geo', zlevel: 3, symbolSize: 0, data: scatD, itemStyle: { color: a }, label: { show: true, position: 'center', formatter: (p) => (currentMode === 'tire' ? `{region|${p.name}}\n{score|${p.value[3]} 輛}` : `{region|${p.name}}\n{score|${p.value[2]} ${currentMode === 'stats' ? '分' : '%'}}`), backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.8)', borderColor: isLightMode ? '#94a3b8' : '#334155', borderWidth: 1, padding: [6, 8], borderRadius: 4, rich: { region: { color: t, fontSize: 13 * globalFontScale, fontWeight: 'bold', align: 'center', padding: [0, 0, 4, 0] }, score: { color: a, fontSize: 14 * globalFontScale, fontWeight: 'bold', align: 'center' } } } }] }, false);
}
function updateBarChart() {
    if (!twGeoJson || (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info')) return;
    const s = getComputedStyle(document.body); const t = s.getPropertyValue('--text-primary').trim(); const g = s.getPropertyValue('--chart-grid').trim(); const a = s.getPropertyValue('--accent-color').trim(); const d = s.getPropertyValue('--danger-color').trim(); const f = s.getPropertyValue('--safe-color').trim();
    if (currentMode === 'tire') {
        const sortedD = [...rawData].sort((a, b) => b.tire_history[6] - a.tire_history[6]); const regions = sortedD.map(i => i.region); const months = ['25/11', '25/12', '26/01', '26/02', '26/03', '26/04']; const dc = ['#e11d48', '#be185d', '#7e22ce', '#b45309', '#a21caf', '#c2410c', '#1d4ed8']; let ci = 0; const sd = [];
        sortedD.forEach((i, idx) => { let v = i.tire_history[6]; let ib = v > 4.5; let lc = ib ? dc[ci++ % dc.length] : (isLightMode ? '#94a3b8' : '#475569'); sd.push({ name: i.region, type: 'line', data: i.tire_history.slice(1), smooth: true, symbol: ib ? 'circle' : 'none', symbolSize: 8, lineStyle: { width: ib ? 4 : 2, opacity: ib ? 1 : 0.4 }, itemStyle: { color: lc }, emphasis: { focus: 'series', lineStyle: { width: 7, shadowBlur: 15, shadowColor: lc, opacity: 1 }, label: { show: true, fontSize: 16 * globalFontScale, fontWeight: 'bold' } }, label: { show: false }, endLabel: { show: true, formatter: '{a} {c}%', color: 'inherit', fontSize: (ib ? 14 : 11) * globalFontScale, fontWeight: ib ? 'bold' : 'normal' }, labelLayout: { moveOverlap: 'shiftY' }, zlevel: ib ? 10 : 1 }); });
        barChart.setOption({ title: { text: '全國各縣市前後胎壓未達標趨勢 (近 6 個月)', left: 'center', textStyle: { color: t, fontSize: 15 * globalFontScale } }, tooltip: { trigger: 'axis', backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: t }, valueFormatter: (v) => v + '%' }, grid: { left: '3%', right: '12%', bottom: '10%', top: '15%', containLabel: true }, xAxis: { type: 'category', data: months, axisLabel: { color: t, fontSize: 12 * globalFontScale }, axisLine: { lineStyle: { color: g } } }, yAxis: { type: 'value', axisLabel: { color: t, formatter: '{value} %', fontSize: 12 * globalFontScale }, splitLine: { lineStyle: { color: g, type: 'dashed' } } }, series: sd }, true); return;
    }
    let rs, cv, pv, vv, ct, av, ip = false; const gvc = (v) => { if (v === 0) return isLightMode ? '#94a3b8' : '#475569'; if ((currentMode === 'maintenance' && currentMaintenanceMetric === 'm_accident') || currentMode === 'simulation') return v > 0 ? d : f; return v > 0 ? f : d; };
    if (currentMode === 'stats') { const sd = [...rawData].sort((a, b) => a[currentStatsMetric] - b[currentStatsMetric]); rs = sd.map(i => i.region); cv = sd.map(i => i[currentStatsMetric]); pv = sd.map(i => i[currentStatsMetric + '_feb']); vv = sd.map(i => parseFloat((i[currentStatsMetric] - i[currentStatsMetric + '_feb']).toFixed(2))); ct = `各區指標對比 - ${statsMetrics.find(m => m.key === currentStatsMetric).label}`; }
    else if (currentMode === 'operability') { ip = true; const sd = [...rawData].sort((a, b) => a.operability - b.operability); rs = sd.map(i => i.region); cv = sd.map(i => i.operability); pv = sd.map(i => i.operability_feb); vv = sd.map(i => parseFloat((i.operability - i.operability_feb).toFixed(2))); ct = `各縣市場站可動率對比`; }
    else if (currentMode === 'maintenance') { ip = currentMaintenanceMetric === 'maintenance_rate'; const sl = currentMaintenanceMetric === 'm_accident' ? (a, b) => b[currentMaintenanceMetric] - a[currentMaintenanceMetric] : (a, b) => a[currentMaintenanceMetric] - b[currentMaintenanceMetric]; const sd = [...rawData].sort(sl); rs = sd.map(i => i.region); cv = sd.map(i => i[currentMaintenanceMetric]); pv = sd.map(i => i[currentMaintenanceMetric + '_feb']); vv = sd.map(i => parseFloat((i[currentMaintenanceMetric] - i[currentMaintenanceMetric + '_feb']).toFixed(2))); ct = `各縣市${maintenanceMetrics.find(m => m.key === currentMaintenanceMetric).label}對比`; }
    else if (currentMode === 'simulation') { ip = true; const sd = [...rawData].sort((a, b) => b[currentSimulationMetric + '_ratio'] - a[currentSimulationMetric + '_ratio']); rs = sd.map(i => i.region); cv = sd.map(i => i[currentSimulationMetric + '_ratio']); pv = sd.map(i => i[currentSimulationMetric + '_lm']); vv = sd.map(i => parseFloat((i[currentSimulationMetric + '_ratio'] - i[currentSimulationMetric + '_lm']).toFixed(2))); ct = `${simulationMetrics.find(m => m.key === currentSimulationMetric).label}異常占比對比`; }
    let dd = showVariance ? vv : cv; av = (dd.reduce((a, c) => a + c, 0) / dd.length).toFixed(ip ? 2 : 1);
    let sc = showVariance ? [{ name: '較上月變動', type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] }, data: vv.map(v => ({ value: v, itemStyle: { color: gvc(v) } })), label: { show: true, position: 'top', color: t, fontWeight: 'bold', formatter: v => (v.value > 0 ? '+' : '') + v.value + (ip?'%':''), fontSize: 13 * globalFontScale }, markLine: { symbol: 'none', data: [{ type: 'average', name: '平均變動' }], label: { formatter: `平均\n${av > 0 ? '+':''}${av}${ip?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold', fontSize: 11 * globalFontScale }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } } }] 
    : [{ name: '3月 (前月)', type: 'bar', barWidth: '30%', itemStyle: { color: isLightMode ? '#94a3b8' : '#475569', borderRadius: [4, 4, 0, 0] }, label: { show: false }, data: pv }, { name: '4月 (當月)', type: 'bar', barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] }, data: cv.map((v, idx) => { let bc = a; if (currentMode === 'stats' || currentMode === 'operability') bc = v < av ? d : a; else if (currentMode === 'simulation') bc = v > av ? d : f; else if (currentMode === 'maintenance') { if (currentMaintenanceMetric === 'm_accident') bc = v > av ? d : f; else if (currentMaintenanceMetric === 'maintenance_rate') bc = v < av ? d : a; } return { value: v, itemStyle: { color: bc } }; }), label: { show: true, position: 'top', color: t, fontWeight: 'bold', formatter: ip ? '{c}%' : '{c}', fontSize: 12 * globalFontScale }, markLine: { symbol: 'none', data: [{ type: 'average', name: '平均' }], label: { formatter: `4月平均\n${av}${ip?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold', fontSize: 11 * globalFontScale }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } } }];
    barChart.setOption({ title: { text: ct + (showVariance ? ' - 較上月變動' : ' - 本月數值'), left: 'center', textStyle: { color: t, fontSize: 15 * globalFontScale } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: t }, formatter: (p) => { let h = `<div style="font-weight:bold;margin-bottom:5px;">${p[0].axisValue}</div>`; p.forEach(x => { h += `${x.marker} ${x.seriesName}: <b style="color:${x.color}">${(x.value > 0 && showVariance ? '+' : '')}${x.value}${ip ? '%' : ''}</b><br/>`; }); return h; } }, legend: { show: !showVariance, data: ['3月 (前月)', '4月 (當月)'], bottom: 0, textStyle: { color: t, fontSize: 12 * globalFontScale } }, grid: { left: '3%', right: '8%', bottom: '15%', top: '15%', containLabel: true }, xAxis: { type: 'category', data: rs, axisLabel: { color: t, fontSize: 12 * globalFontScale }, axisLine: { lineStyle: { color: g } } }, yAxis: { type: 'value', min: (v) => (ip && !showVariance) ? Math.max(0, Math.floor(v.min - 5)) : null, axisLabel: { color: t, formatter: ip ? '{value} %' : '{value}', fontSize: 12 * globalFontScale }, splitLine: { lineStyle: { color: g, type: 'dashed' } } }, series: sc }, true);
}

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
        let cl = (key) => currentStatsMetric === key ? 'class="active-col"' : '';
        html += `<th>縣市</th><th>綜合分數</th><th ${cl('station')}>場站妥善度</th><th ${cl('appearance')}>外觀標示</th><th ${cl('functionality')}>重要機能</th><th ${cl('ems')}>EMS維護率</th><th ${cl('operability')}>可動率</th></tr></thead><tbody>`;
        rawData.forEach(r => {
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td style="color:var(--accent-color);font-weight:bold;">${r.overall} 分</td>
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
        let clAcc = currentMaintenanceMetric === 'm_accident' ? 'class="active-col"' : '';
        let clRec = currentMaintenanceMetric === 'm_records' ? 'class="active-col"' : '';
        let clRate = currentMaintenanceMetric === 'maintenance_rate' ? 'class="active-col"' : '';
        html += `<th>縣市</th><th>總營運車輛</th><th ${clAcc}>事故車輛數</th><th ${clRec}>維護記錄數</th><th ${clRate}>一級維護率</th><th>較上月變動</th></tr></thead><tbody>`;
        rawData.forEach(r => {
            let varColor = r.m_var.includes('-') ? 'var(--danger-color)' : 'var(--safe-color)';
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td>${r.m_fleet.toLocaleString()}</td><td ${clAcc} style="color:var(--danger-color);font-weight:bold;">${r.m_accident}</td>
                <td ${clRec}>${r.m_records.toLocaleString()}</td><td ${clRate} style="color:var(--accent-color);font-weight:bold;">${r.maintenance_rate}%</td>
                <td style="color:${varColor};font-weight:bold;">${r.m_var}</td></tr>`;
        });
    } else if (currentMode === 'simulation') {
        let clA = currentSimulationMetric === 'sim_a' ? 'class="active-col"' : '';
        let clB = currentSimulationMetric === 'sim_b' ? 'class="active-col"' : '';
        let clC = currentSimulationMetric === 'sim_c' ? 'class="active-col"' : '';
        html += `<th>縣市</th><th ${clA}>A級異常</th><th ${clB}>B級異常</th><th ${clC}>C級異常</th></tr></thead><tbody>`;
        rawData.forEach(r => {
            let aColor = r.sim_a_ratio > 5.0 ? 'var(--danger-color)' : 'var(--text-primary)';
            let bColor = r.sim_b_ratio > 20.0 ? 'var(--danger-color)' : 'var(--text-primary)';
            let cColor = r.sim_c_ratio > 50.0 ? 'var(--danger-color)' : 'var(--text-primary)';
            html += `${trStr(r)}<td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td ${clA} style="color:${aColor};font-weight:bold;">${r.sim_a_count} 輛 (${r.sim_a_ratio}%)</td>
                <td ${clB} style="color:${bColor};font-weight:bold;">${r.sim_b_count} 輛 (${r.sim_b_ratio}%)</td>
                <td ${clC} style="color:${cColor};font-weight:bold;">${r.sim_c_count} 輛 (${r.sim_c_ratio}%)</td></tr>`;
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
        applyLayoutState(); // 初始化佈局狀態
        
        renderInitialMap();
        updateBarChart();
        setupMapClickEvent();
        
        setTimeout(() => { mapChart.resize(); }, 350);

    } catch (error) {
        document.getElementById('loading').innerText = '地圖載入失敗，請檢查網路連線。';
    }
}

initDashboard();
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if(mapChart) mapChart.resize(); 
        if(barChart) barChart.resize();
    }, 200); // 等待使用者拖曳停止 0.2 秒後再重繪，大幅節省效能
});

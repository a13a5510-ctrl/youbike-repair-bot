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
            document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if(currentMode === 'stats') currentStatsMetric = metric.key;
            if(currentMode === 'maintenance') currentMaintenanceMetric = metric.key;
            if(currentMode === 'simulation') currentSimulationMetric = metric.key;

            showVariance = false; 
            updateVarianceBtnUI();
            toggleDataView();
            if (isDataView) renderDataView(); 
            
            // 🌟 防呆：點擊「補充說明」時，若地圖滿版則強制切換至右區
            if (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info') {
                if (layoutState === 'left') { layoutState = 'right'; applyLayoutState(); }
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
    const dashboard = document.getElementById('main-dashboard');
    const floatingStats = document.getElementById('floating-stats-area');

    maintMetricsArea.classList.add('hidden');
    simMetricsArea.classList.add('hidden');
    infoArea.classList.add('hidden');
    floatingStats.classList.add('hidden');
    document.getElementById('barChart').classList.remove('hidden');

    if (mode === 'stats') {
        dashboard.classList.add('full-width-map');
        currentStatsMetric = ''; 
    } else {
        dashboard.classList.remove('full-width-map'); 
        if (mode === 'maintenance') maintMetricsArea.classList.remove('hidden');
        else if (mode === 'simulation') simMetricsArea.classList.remove('hidden');
    }
    
    detailPanel.style.display = 'none';
    renderSubButtons();
    updateLegendBox();
    updateMapTheme(); 
    toggleDataView();
    applyLayoutState();
    
    setTimeout(() => {
        mapChart.resize();
        if(currentMode !== 'stats' && (currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info')) {
            barChart.resize();
            updateBarChart(); 
        }
    }, 350);
}

// 🌟 三段佈局切換
let layoutState = 'split';
document.getElementById('layoutToggleBtn').addEventListener('click', () => {
    if (layoutState === 'split') layoutState = 'left';
    else if (layoutState === 'left') layoutState = 'right';
    else layoutState = 'split';
    applyLayoutState();
});

function applyLayoutState() {
    const left = document.getElementById('map-panel-container');
    const right = document.getElementById('right-chart-panel');
    const btn = document.getElementById('layoutToggleBtn');
    if (currentMode === 'stats' && currentStatsMetric === '') {
        btn.style.display = 'none'; left.style.display = 'flex'; right.style.display = 'none';
    } else {
        btn.style.display = 'inline-block';
        if (layoutState === 'split') { left.style.display = 'flex'; right.style.display = 'flex'; btn.innerText = '🔀 雙拼視圖'; }
        else if (layoutState === 'left') { left.style.display = 'flex'; right.style.display = 'none'; btn.innerText = '🗺️ 滿版左區'; }
        else if (layoutState === 'right') { left.style.display = 'none'; right.style.display = 'flex'; btn.innerText = '📊 滿版右區'; }
    }
    setTimeout(() => { if(mapChart) mapChart.resize(); if(barChart) barChart.resize(); }, 150);
}

// 數據切換與高亮
document.getElementById('mapDataToggleBtn').addEventListener('click', () => { isDataView = !isDataView; toggleDataView(); });

const varianceToggleBtn = document.getElementById('varianceToggleBtn');
varianceToggleBtn.addEventListener('click', () => { showVariance = !showVariance; updateVarianceBtnUI(); updateBarChart(); });

function updateVarianceBtnUI() {
    if (currentMode === 'tire' || currentMode === 'stats' && currentStatsMetric === '') { varianceToggleBtn.classList.add('hidden'); return; }
    varianceToggleBtn.classList.remove('hidden');
    document.getElementById('varianceToggleText').innerText = showVariance ? '還原數值' : '較上月變動';
}

function toggleDataView() {
    const dataContainer = document.getElementById('data-view-container');
    const toggleBtn = document.getElementById('mapDataToggleBtn');
    const legendBox = document.getElementById('legend-box-content');
    const detailPanel = document.getElementById('cityDetailPanel');
    const floatingStats = document.getElementById('floating-stats-area');

    if (currentMode === 'stats' && currentStatsMetric === '') {
        isDataView = false; toggleBtn.classList.add('hidden'); dataContainer.classList.add('hidden');
        legendBox.classList.remove('hidden'); floatingStats.classList.remove('hidden');
        varianceToggleBtn.classList.add('hidden'); return;
    }
    toggleBtn.classList.remove('hidden');
    document.getElementById('mapDataToggleText').innerText = isDataView ? '切換地圖顯示' : '切換數據報表';
    document.querySelector('#mapDataToggleBtn .btn-icon').innerText = isDataView ? '🗺️' : '📋';
    updateVarianceBtnUI();

    if (isDataView) {
        dataContainer.classList.remove('hidden'); legendBox.classList.add('hidden');
        detailPanel.style.display = 'none'; if(currentMode === 'stats') floatingStats.classList.add('hidden');
        renderDataView();
    } else {
        dataContainer.classList.add('hidden'); legendBox.classList.remove('hidden');
        if(currentMode === 'stats' && currentStatsMetric === '') floatingStats.classList.remove('hidden');
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
        }
    }
};

barChart.on('click', (params) => { let r = currentMode === 'tire' ? params.seriesName : params.name; if (r) highlightRow(r); });

// 🌟 手冊控制與點擊外部關閉
document.getElementById('helpFabBtn').addEventListener('click', () => document.getElementById('helpModal').classList.remove('hidden'));
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

async function initDashboard() {
    try { const r = await fetch('https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json'); twGeoJson = await r.json(); echarts.registerMap('Taiwan', twGeoJson); document.getElementById('loading').style.display = 'none'; document.getElementById('mapChart').style.opacity = '1'; renderSubButtons(); renderFleetDetails(); updateLegendBox(); applyLayoutState(); renderInitialMap(); updateBarChart(); setupMapClickEvent(); setTimeout(() => { mapChart.resize(); }, 350); }
    catch (e) { document.getElementById('loading').innerText = '載入失敗。'; }
}
initDashboard();
window.addEventListener('resize', () => { mapChart.resize(); barChart.resize(); });

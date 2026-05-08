// js/app.js
let isLightMode = true; 
let twGeoJson = null;
let currentMode = 'stats'; 
let showingFleetDetails = false;
let showingSimDetails = false;
let isDataView = false; 

// 🌟 新增：圖表數值 / 變動率 切換開關
let showVariance = false; 

let currentStatsMetric = 'station';
let currentMaintenanceMetric = 'maintenance_rate';
let currentSimulationMetric = 'sim_a';

let globalFontScale = 1;

const mapChart = echarts.init(document.getElementById('mapChart'));
const barChart = echarts.init(document.getElementById('barChart'));

function renderSubButtons() {
    const btnContainer = document.getElementById('button-container');
    btnContainer.innerHTML = ''; 
    
    if (currentMode === 'stats') {
        statsMetrics.forEach((metric) => {
            const btn = document.createElement('button');
            btn.innerText = metric.label;
            if (metric.key === currentStatsMetric) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatsMetric = metric.key;
                showVariance = false; // 切換時重置
                
                document.getElementById('main-dashboard').classList.remove('full-width-map');
                document.getElementById('floating-stats-area').classList.add('hidden');
                
                toggleDataView();
                if (isDataView) renderDataView(); 
                
                setTimeout(() => { mapChart.resize(); barChart.resize(); }, 350);
                updateBarChart(); 
            });
            btnContainer.appendChild(btn);
        });
    } else if (currentMode === 'maintenance') {
        maintenanceMetrics.forEach((metric) => {
            const btn = document.createElement('button');
            btn.innerText = metric.label;
            if (metric.key === currentMaintenanceMetric) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentMaintenanceMetric = metric.key;
                showVariance = false; // 切換時重置
                
                if(currentMaintenanceMetric === 'm_info') {
                    document.getElementById('barChart').classList.add('hidden');
                    document.getElementById('maintenance-info-area').classList.remove('hidden');
                } else {
                    document.getElementById('barChart').classList.remove('hidden');
                    document.getElementById('maintenance-info-area').classList.add('hidden');
                    updateBarChart(); 
                }
                if (isDataView) renderDataView(); 
            });
            btnContainer.appendChild(btn);
        });
    } else if (currentMode === 'simulation') {
        simulationMetrics.forEach((metric) => {
            const btn = document.createElement('button');
            btn.innerText = metric.label;
            if (metric.key === currentSimulationMetric) btn.classList.add('active');
            btn.addEventListener('click', () => {
                document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSimulationMetric = metric.key;
                showVariance = false; // 切換時重置

                updateMapTheme();
                updateLegendBox();
                updateBarChart(); 
                if (isDataView) renderDataView(); 
            });
            btnContainer.appendChild(btn);
        });
    }
}

document.getElementById('nav-stats').addEventListener('click', (e) => switchMode('stats', e.target));
document.getElementById('nav-tire').addEventListener('click', (e) => switchMode('tire', e.target));
document.getElementById('nav-operability').addEventListener('click', (e) => switchMode('operability', e.target));
document.getElementById('nav-maintenance').addEventListener('click', (e) => switchMode('maintenance', e.target));
document.getElementById('nav-simulation').addEventListener('click', (e) => switchMode('simulation', e.target));

function switchMode(mode, targetElement) {
    document.querySelectorAll('.top-nav button').forEach(btn => btn.classList.remove('active'));
    targetElement.classList.add('active');
    currentMode = mode;
    showVariance = false; // 宇宙切換時重置

    const controlsArea = document.getElementById('button-container');
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
        controlsArea.classList.remove('hidden');
        dashboard.classList.add('full-width-map');
        currentStatsMetric = ''; 
    } else {
        dashboard.classList.remove('full-width-map'); 
        
        if (mode === 'maintenance') {
            controlsArea.classList.remove('hidden');
            maintMetricsArea.classList.remove('hidden');
            if(currentMaintenanceMetric === 'm_info') {
                document.getElementById('barChart').classList.add('hidden');
                infoArea.classList.remove('hidden');
            }
        } else if (mode === 'simulation') {
            controlsArea.classList.remove('hidden');
            simMetricsArea.classList.remove('hidden');
        } else {
            controlsArea.classList.add('hidden');
        }
    }
    
    detailPanel.style.display = 'none';
    renderSubButtons();
    updateLegendBox();
    updateMapTheme(); 
    
    toggleDataView();
    
    setTimeout(() => {
        mapChart.resize();
        if(currentMode !== 'stats' && (currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info')) {
            barChart.resize();
            updateBarChart(); 
        }
    }, 350);
}

document.getElementById('mapDataToggleBtn').addEventListener('click', (e) => {
    isDataView = !isDataView;
    toggleDataView();
});

function toggleDataView() {
    const dataContainer = document.getElementById('data-view-container');
    const toggleBtn = document.getElementById('mapDataToggleBtn');
    const legendBox = document.getElementById('legend-box-content');
    const detailPanel = document.getElementById('cityDetailPanel');
    const floatingStats = document.getElementById('floating-stats-area');

    if (currentMode === 'stats' && currentStatsMetric === '') {
        isDataView = false;
        toggleBtn.classList.add('hidden');
        dataContainer.classList.add('hidden');
        legendBox.classList.remove('hidden');
        floatingStats.classList.remove('hidden');
        return;
    }

    toggleBtn.classList.remove('hidden');
    toggleBtn.innerText = isDataView ? '🗺️ 切換地圖顯示' : '📋 切換數據報表';

    if (isDataView) {
        dataContainer.classList.remove('hidden');
        legendBox.classList.add('hidden');
        detailPanel.style.display = 'none';
        if(currentMode === 'stats') floatingStats.classList.add('hidden');
        renderDataView();
    } else {
        dataContainer.classList.add('hidden');
        legendBox.classList.remove('hidden');
        if(currentMode === 'stats' && currentStatsMetric === '') floatingStats.classList.remove('hidden');
    }
}

// 🌟 雙向互動引擎：點擊表格或折線時互相高亮
window.highlightTireData = function(region) {
    if (currentMode !== 'tire') return;
    
    // 1. 讓左側表格反紅
    if (isDataView) {
        document.querySelectorAll('.clean-data-table tbody tr').forEach(tr => tr.classList.remove('row-highlight'));
        const targetRow = document.getElementById(`row-${region}`);
        if (targetRow) {
            targetRow.classList.add('row-highlight');
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 2. 讓右側 ECharts 曲線發光 (觸發 emphasis)
    barChart.dispatchAction({ type: 'downplay' });
    barChart.dispatchAction({ type: 'highlight', seriesName: region });
    barChart.dispatchAction({
        type: 'showTip',
        seriesIndex: barChart.getOption().series.findIndex(s => s.name === region),
        dataIndex: 5
    });
};

function renderDataView() {
    const container = document.getElementById('data-view-container');
    let title = document.querySelector('.top-nav button.active').innerText;
    let html = `<h3 style="margin-top:0; color:var(--accent-color); border-bottom:1px solid var(--border-color); padding-bottom:10px;">${title} - 各縣市明細報表</h3>`;
    html += '<table class="clean-data-table"><thead><tr>';

    if (currentMode === 'stats') {
        let cl = (key) => currentStatsMetric === key ? 'class="active-col"' : '';
        html += `<th>縣市</th><th>綜合分數</th><th ${cl('station')}>場站妥善度</th><th ${cl('appearance')}>外觀標示</th><th ${cl('functionality')}>重要機能</th><th ${cl('ems')}>EMS維護率</th><th ${cl('operability')}>可動率</th></tr></thead><tbody>`;
        rawData.forEach(r => {
            html += `<tr><td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td style="color:var(--accent-color);font-weight:bold;">${r.overall} 分</td>
                <td ${cl('station')}>${r.station} 分</td>
                <td ${cl('appearance')}>${r.appearance} 分</td>
                <td ${cl('functionality')}>${r.functionality} 分</td>
                <td ${cl('ems')}>${r.ems}%</td>
                <td ${cl('operability')}>${r.operability}%</td></tr>`;
        });
    } else if (currentMode === 'tire') {
        html += '<th>縣市</th><th>25年11月</th><th>25年12月</th><th>26年01月</th><th>26年02月</th><th>26年03月</th><th>26年04月 (當月)</th></tr></thead><tbody>';
        rawData.forEach(r => {
            let v4m = r.tire_history[6];
            let v4mColor = v4m > 4.5 ? 'var(--danger-color)' : (v4m > 4.0 ? 'var(--warning-color)' : 'var(--safe-color)');
            html += `<tr id="row-${r.region}" onclick="highlightTireData('${r.region}')" style="cursor:pointer; transition: all 0.3s;">
                <td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
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
            html += `<tr><td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
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
            html += `<tr><td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
                <td>${r.m_fleet.toLocaleString()}</td>
                <td ${clAcc} style="color:var(--danger-color);font-weight:bold;">${r.m_accident}</td>
                <td ${clRec}>${r.m_records.toLocaleString()}</td>
                <td ${clRate} style="color:var(--accent-color);font-weight:bold;">${r.maintenance_rate}%</td>
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
            html += `<tr><td style="font-weight:bold;color:var(--text-primary);">${r.region}</td>
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

document.getElementById('layoutSlider').addEventListener('input', (e) => {
    const mapPct = e.target.value;
    const chartPct = 100 - mapPct;
    document.getElementById('map-panel-container').style.flex = `0 0 ${mapPct}%`;
    document.getElementById('right-chart-panel').style.flex = `0 0 ${chartPct}%`;
    mapChart.resize();
    if(currentMode !== 'stats' && (currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info')) {
        barChart.resize(); 
    }
});

window.adjustZoom = function(val) {
    document.getElementById('fontSizeSlider').value = val;
    document.getElementById('fontSizeSlider').dispatchEvent(new Event('input'));
};

document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    globalFontScale = parseFloat(e.target.value);
    document.querySelectorAll('.zoom-target').forEach(el => {
        el.style.zoom = globalFontScale;
    });
    updateMapTheme();
    updateBarChart();
});

document.getElementById('themeToggleBtn').addEventListener('click', (e) => {
    isLightMode = !isLightMode;
    document.body.classList.toggle('light-mode', isLightMode);
    e.target.innerText = isLightMode ? '🌙 深色模式' : '🌞 淺色模式';
    updateMapTheme();  
    if(currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info') updateBarChart(); 
});

let isPresentationMode = false;
const presentationBtn = document.getElementById('presentationToggleBtn');

presentationBtn.addEventListener('click', async () => {
    isPresentationMode = !isPresentationMode;
    
    if (isPresentationMode) {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen().catch(() => {});
        }
        presentationBtn.classList.add('active');
        presentationBtn.innerText = '🖥️ 退出投影';
        adjustZoom(2.0); 
    } else {
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen();
        }
        presentationBtn.classList.remove('active');
        presentationBtn.innerText = '📺 投影模式';
        adjustZoom(1);
    }
    
    setTimeout(() => { mapChart.resize(); barChart.resize(); }, 150);
});

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isPresentationMode) {
        presentationBtn.click(); 
    }
});

let isLaserMode = false;
const laserDot = document.getElementById('laser-dot');
document.getElementById('laserToggleBtn').addEventListener('click', (e) => {
    isLaserMode = !isLaserMode;
    document.body.classList.toggle('laser-active', isLaserMode);
    
    if (isLaserMode) {
        e.target.classList.add('active');
        e.target.innerText = '❌ 關閉雷射';
        laserDot.classList.add('active');
    } else {
        e.target.classList.remove('active');
        e.target.innerText = '🔴 雷射筆';
        laserDot.classList.remove('active');
    }
});

document.addEventListener('mousemove', (e) => {
    if (isLaserMode) laserDot.style.transform = `translate(${e.clientX - 8}px, ${e.clientY - 8}px)`;
});

function getMapValue(item) {
    if (currentMode === 'stats') return item.overall;
    else if (currentMode === 'tire') return item.tire_history[6]; 
    else if (currentMode === 'operability') return item.operability;
    else if (currentMode === 'maintenance') return item.maintenance_rate; 
    else if (currentMode === 'simulation') return item[currentSimulationMetric + '_ratio']; 
}

function getVisualMapOption() {
    const style = getComputedStyle(document.body);
    const danger = style.getPropertyValue('--danger-color').trim();
    const safe = style.getPropertyValue('--safe-color').trim();
    
    if (currentMode === 'stats') return { show: false, min: 86, max: 94, inRange: { color: [danger, '#f97316', '#eab308', safe] } };
    else if (currentMode === 'tire') return { show: false, min: 0, max: 8, inRange: { color: [safe, '#eab308', '#f97316', danger] } };
    else if (currentMode === 'operability') return { show: false, min: 90, max: 99, inRange: { color: [danger, '#f97316', '#eab308', safe] } };
    else if (currentMode === 'maintenance') return { show: false, min: 80, max: 100, inRange: { color: [danger, '#f97316', '#eab308', safe] } };
    else if (currentMode === 'simulation') {
        let maxVal = currentSimulationMetric === 'sim_a' ? 10 : (currentSimulationMetric === 'sim_b' ? 25 : 60);
        return { show: false, min: 0, max: maxVal, inRange: { color: [safe, '#eab308', '#f97316', danger] } };
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
                type: 'scatter', coordinateSystem: 'geo', zlevel: 3, 
                symbolSize: 0, 
                data: scatterData, itemStyle: { color: accentColor }, 
                label: {
                    show: true, 
                    position: 'center', 
                    formatter: function(params) { 
                        if (currentMode === 'tire') return `{region|${params.name}}\n{score|${params.value[3]} 輛}`;
                        let unit = '%'; if(currentMode === 'stats') unit = '分';
                        return `{region|${params.name}}\n{score|${params.value[2]} ${unit}}`; 
                    },
                    backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.8)', borderColor: isLightMode ? '#94a3b8' : '#334155', borderWidth: 1, padding: [6, 8], borderRadius: 4,
                    rich: { 
                        region: { color: textColor, fontSize: 13 * globalFontScale, fontWeight: 'bold', align: 'center', padding: [0, 0, 4, 0] }, 
                        score: { color: accentColor, fontSize: 14 * globalFontScale, fontWeight: 'bold', align: 'center' } 
                    }
                } 
            }
        ]
    }, false); 
}

// 🌟 圖表核心渲染 (加入變動率切換邏輯)
function updateBarChart() {
    if (!twGeoJson || (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info')) return;
    
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
        let colorIdx = 0;
        const seriesData = [];

        sortedData.forEach((item, index) => {
            let val = item.tire_history[6];
            let isBad = val > 4.5; 
            let lineColor = isBad ? dangerColors[colorIdx++ % dangerColors.length] : (isLightMode ? '#94a3b8' : '#475569');

            seriesData.push({
                name: item.region, type: 'line', data: item.tire_history.slice(1), smooth: true, symbol: isBad ? 'circle' : 'none', symbolSize: 8,
                lineStyle: { width: isBad ? 4 : 2, opacity: isBad ? 1 : 0.4 },
                itemStyle: { color: lineColor },
                // 🌟 新增：Hover 或外部 Focus 時的高亮效果 (發光加粗)
                emphasis: {
                    focus: 'series',
                    lineStyle: { width: 7, shadowBlur: 15, shadowColor: lineColor, opacity: 1 },
                    label: { show: true, fontSize: 16 * globalFontScale, fontWeight: 'bold' }
                },
                label: { show: false }, 
                endLabel: { 
                    show: true, formatter: '{a} {c}%', color: 'inherit',
                    fontSize: (isBad ? 14 : 11) * globalFontScale,
                    fontWeight: isBad ? 'bold' : 'normal'
                },
                labelLayout: { moveOverlap: 'shiftY' },
                zlevel: isBad ? 10 : 1
            });
        });

        barChart.setOption({
            title: { text: '全國各縣市前後胎壓未達標趨勢 (近 6 個月)', left: 'center', textStyle: { color: textColor, fontSize: 15 * globalFontScale } },
            tooltip: { trigger: 'axis', backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor }, valueFormatter: (value) => value + '%' },
            legend: { show: false }, 
            grid: { left: '3%', right: '12%', bottom: '10%', top: '15%', containLabel: true }, 
            xAxis: { type: 'category', data: months, axisLabel: { color: textColor, fontSize: 12 * globalFontScale }, axisLine: { lineStyle: { color: gridColor } } },
            yAxis: { type: 'value', axisLabel: { color: textColor, formatter: '{value} %', fontSize: 12 * globalFontScale }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
            series: seriesData
        }, true);
        return;
    }

    let regions, currentValues, previousValues, varianceValues, chartTitle, avgValue, isPercentage = false;

    // 取得變數顏色的邏輯判斷
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
        chartTitle = `各區指標對比 - ${statsMetrics.find(m => m.key === currentStatsMetric).label}`;
    } else if (currentMode === 'operability') {
        isPercentage = true;
        const sortedData = [...rawData].sort((a, b) => a.operability - b.operability);
        regions = sortedData.map(item => item.region); 
        currentValues = sortedData.map(item => item.operability); 
        previousValues = sortedData.map(item => item.operability_feb);
        varianceValues = sortedData.map(item => parseFloat((item.operability - item.operability_feb).toFixed(2)));
        chartTitle = `各縣市場站可動率對比`;
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
        chartTitle = `${simulationMetrics.find(m => m.key === currentSimulationMetric).label}異常占比對比`;
    }

    let displayData = showVariance ? varianceValues : currentValues;
    avgValue = (displayData.reduce((acc, curr) => acc + curr, 0) / displayData.length).toFixed(isPercentage ? 2 : 1);

    // 🌟 組合動態長條圖的 Series
    let seriesConfig = [];
    if (showVariance) {
        seriesConfig = [{
            name: '較上月變動', type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] },
            data: varianceValues.map(val => ({ value: val, itemStyle: { color: getVarColor(val) } })),
            label: { show: true, position: 'top', color: textColor, fontWeight: 'bold', formatter: val => (val.value > 0 ? '+' : '') + val.value + (isPercentage?'%':''), fontSize: 13 * globalFontScale },
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
                label: { show: true, position: 'top', color: textColor, fontWeight: 'bold', formatter: isPercentage ? '{c}%' : '{c}', fontSize: 12 * globalFontScale },
                markLine: { symbol: 'none', data: [{ type: 'average', name: '平均' }], label: { formatter: `4月平均\n${avgValue}${isPercentage?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold', fontSize: 11 * globalFontScale }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } }
            }
        ];
    }

    barChart.setOption({
        title: { 
            text: chartTitle + (showVariance ? ' - 較上月變動' : ' - 本月數值'), 
            subtext: '💡 點擊圖表任意處切換【本月數值】與【較上月變動】', // 🌟 加入點擊提示語
            subtextStyle: { color: accentColor, fontSize: 12 * globalFontScale, fontWeight: 'bold' },
            left: 'center', textStyle: { color: textColor, fontSize: 15 * globalFontScale } 
        },
        tooltip: { 
            trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor },
            formatter: function(params) {
                let html = `<div style="font-weight:bold;margin-bottom:5px;">${params[0].axisValue}</div>`;
                params.forEach(p => { html += `${p.marker} ${p.seriesName}: <b style="color:${p.color}">${(p.value > 0 && showVariance ? '+' : '')}${p.value}${isPercentage ? '%' : ''}</b><br/>`; });
                return html;
            }
        },
        legend: { show: !showVariance, data: ['3月 (前月)', '4月 (當月)'], bottom: 0, textStyle: { color: textColor, fontSize: 12 * globalFontScale } },
        grid: { left: '3%', right: '8%', bottom: '15%', top: '18%', containLabel: true },
        xAxis: { type: 'category', data: regions, axisLabel: { color: textColor, fontSize: 12 * globalFontScale }, axisLine: { lineStyle: { color: gridColor } } },
        yAxis: { type: 'value', min: function(val) { return (isPercentage && !showVariance) ? Math.max(0, Math.floor(val.min - 5)) : null; }, axisLabel: { color: textColor, formatter: isPercentage ? '{value} %' : '{value}', fontSize: 12 * globalFontScale }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
        series: seriesConfig
    }, true);
}

// 🌟 點擊長條圖任意處，一鍵切換「本月數值 / 變動率」
barChart.getZr().on('click', function(event) {
    if (currentMode === 'tire') return; // 胎壓有自己的連動邏輯
    showVariance = !showVariance;
    updateBarChart();
});

// 🌟 折線圖點擊追蹤 (觸發 Emphasis 與表格連動)
barChart.on('click', function(params) {
    if (currentMode === 'tire' && params.seriesType === 'line') {
        if (!isDataView) {
            document.getElementById('mapDataToggleBtn').click();
        }
        setTimeout(() => window.highlightTireData(params.seriesName), 150);
    }
});

function setupMapClickEvent() {
    mapChart.on('click', function(params) {
        let clickedRegion = null;
        if (params.seriesType === 'map') clickedRegion = rawData.find(r => r.mapNames.includes(params.name));
        else if (params.seriesType === 'scatter') clickedRegion = rawData.find(r => r.region === params.name);

        if (clickedRegion) {
            const panel = document.getElementById('cityDetailPanel');
            if (currentMode === 'stats') {
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 指標細節 (4月)`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row"><span>綜合分數:</span><span style="color:var(--accent-color); font-weight:bold;">${clickedRegion.overall}</span></div><div class="detail-row"><span>場站妥善度:</span><span>${clickedRegion.station}</span></div><div class="detail-row"><span>外觀標示:</span><span>${clickedRegion.appearance}</span></div><div class="detail-row"><span>重要機能:</span><span>${clickedRegion.functionality}</span></div><div class="detail-row"><span>EMS維護率:</span><span>${clickedRegion.ems}%</span></div><div class="detail-row"><span>可動率:</span><span>${clickedRegion.operability}%</span></div>`;
            } else if (currentMode === 'tire') {
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 胎壓未達標趨勢`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>月份</span><span>未達標率</span></div><div class="detail-row"><span>25年 11月:</span><span>${clickedRegion.tire_history[1]}%</span></div><div class="detail-row"><span>25年 12月:</span><span>${clickedRegion.tire_history[2]}%</span></div><div class="detail-row"><span>26年 01月:</span><span>${clickedRegion.tire_history[3]}%</span></div><div class="detail-row"><span>26年 02月:</span><span>${clickedRegion.tire_history[4]}%</span></div><div class="detail-row"><span>26年 03月:</span><span>${clickedRegion.tire_history[5]}%</span></div><div class="detail-row" style="font-weight:bold; color:var(--accent-color);"><span>26年 04月:</span><span>${clickedRegion.tire_history[6]}% (${clickedRegion.tire_count}輛)</span></div>`;
            } else if (currentMode === 'operability') {
                let variance = (clickedRegion.operability - clickedRegion.operability_feb).toFixed(2);
                let varianceSign = variance > 0 ? '+' : '';
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 月度可動率分析`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>項目</span><span>數值</span></div><div class="detail-row"><span>3月可動率:</span><span>${clickedRegion.operability_feb.toFixed(2)}%</span></div><div class="detail-row" style="font-weight:bold; color:var(--accent-color);"><span>4月可動率:</span><span>${clickedRegion.operability.toFixed(2)}%</span></div><div class="detail-row"><span>月度變動:</span><span style="color:${variance < 0 ? 'var(--danger-color)' : 'var(--safe-color)'}; font-weight:bold;">${varianceSign}${variance}%</span></div>`;
            } else if (currentMode === 'maintenance') {
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 事故與維護統計`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>項目</span><span>數值</span></div><div class="detail-row"><span>總營運車輛:</span><span>${clickedRegion.m_fleet.toLocaleString()} 輛</span></div><div class="detail-row"><span style="color:var(--danger-color);">事故車輛數:</span><span style="color:var(--danger-color); font-weight:bold;">${clickedRegion.m_accident} 輛</span></div><div class="detail-row"><span>維護記錄數:</span><span>${clickedRegion.m_records.toLocaleString()} 筆</span></div><div class="detail-row" style="font-weight:bold; color:var(--accent-color);"><span>一級維護率:</span><span>${clickedRegion.maintenance_rate}%</span></div><div class="detail-row"><span>較上月變動:</span><span style="color:${clickedRegion.m_var.includes('-') ? 'var(--danger-color)' : 'var(--safe-color)'}; font-weight:bold;">${clickedRegion.m_var}</span></div>`;
            } else if (currentMode === 'simulation') {
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 本月模擬體驗總覽`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>異常別</span><span>數量 (佔比)</span></div><div class="detail-row"><span>A級異常:</span><span style="color: ${clickedRegion.sim_a_ratio > 5.0 ? 'var(--danger-color)' : 'var(--text-primary)'}; font-weight:bold;">${clickedRegion.sim_a_count} 輛 (${clickedRegion.sim_a_ratio}%)</span></div><div class="detail-row"><span>B級異常:</span><span style="color: ${clickedRegion.sim_b_ratio > 20.0 ? 'var(--danger-color)' : 'var(--text-primary)'}; font-weight:bold;">${clickedRegion.sim_b_count} 輛 (${clickedRegion.sim_b_ratio}%)</span></div><div class="detail-row"><span>C級異常:</span><span style="color: ${clickedRegion.sim_c_ratio > 50.0 ? 'var(--danger-color)' : 'var(--text-primary)'}; font-weight:bold;">${clickedRegion.sim_c_count} 輛 (${clickedRegion.sim_c_ratio}%)</span></div>`;
            }
            panel.style.display = 'block';
        }
    });

    mapChart.getZr().on('click', function(event) {
        if (!event.target) document.getElementById('cityDetailPanel').style.display = 'none';
    });
}

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
        
        document.getElementById('main-dashboard').classList.add('full-width-map');
        document.getElementById('floating-stats-area').classList.remove('hidden');
        
        renderInitialMap();
        updateBarChart();
        setupMapClickEvent();
        
        setTimeout(() => { mapChart.resize(); }, 350);

    } catch (error) {
        document.getElementById('loading').innerText = '地圖載入失敗，請檢查網路連線。';
    }
}

initDashboard();
window.addEventListener('resize', () => { mapChart.resize(); barChart.resize(); });

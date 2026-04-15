// js/app.js
let isLightMode = false;
let twGeoJson = null;
let currentMode = 'stats'; // 'stats', 'tire', 'operability', 'maintenance', 'simulation'
let showingFleetDetails = false;
let showingSimDetails = false;

let currentStatsMetric = 'station';
let currentMaintenanceMetric = 'maintenance_rate';
let currentSimulationMetric = 'sim_a';

const mapChart = echarts.init(document.getElementById('mapChart'));
const barChart = echarts.init(document.getElementById('barChart'));

// 1. 動態生成子選單按鈕
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
                
                // 🌟 修復2：即使在第一宇宙，只要點擊子選單，就退出全螢幕，顯示右側圖表
                document.getElementById('main-dashboard').classList.remove('full-width-map');
                document.getElementById('floating-stats-area').classList.add('hidden');
                setTimeout(() => { mapChart.resize(); barChart.resize(); }, 300);

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
                
                if(currentMaintenanceMetric === 'm_info') {
                    document.getElementById('barChart').classList.add('hidden');
                    document.getElementById('maintenance-info-area').classList.remove('hidden');
                } else {
                    document.getElementById('barChart').classList.remove('hidden');
                    document.getElementById('maintenance-info-area').classList.add('hidden');
                    updateBarChart(); 
                }
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
                updateMapTheme();
                updateLegendBox();
                updateBarChart(); 
            });
            btnContainer.appendChild(btn);
        });
    }
}

// 2. 平行架構切換邏輯
document.getElementById('nav-stats').addEventListener('click', (e) => switchMode('stats', e.target));
document.getElementById('nav-tire').addEventListener('click', (e) => switchMode('tire', e.target));
document.getElementById('nav-operability').addEventListener('click', (e) => switchMode('operability', e.target));
document.getElementById('nav-maintenance').addEventListener('click', (e) => switchMode('maintenance', e.target));
document.getElementById('nav-simulation').addEventListener('click', (e) => switchMode('simulation', e.target));

function switchMode(mode, targetElement) {
    document.querySelectorAll('.top-nav button').forEach(btn => btn.classList.remove('active'));
    targetElement.classList.add('active');
    currentMode = mode;

    const controlsArea = document.getElementById('button-container');
    const maintMetricsArea = document.getElementById('maintenance-metrics-area');
    const simMetricsArea = document.getElementById('simulation-metrics-area');
    const detailPanel = document.getElementById('cityDetailPanel');
    const infoArea = document.getElementById('maintenance-info-area');
    const dashboard = document.getElementById('main-dashboard');
    const floatingStats = document.getElementById('floating-stats-area');

    // 預設隱藏所有非共通區塊
    maintMetricsArea.classList.add('hidden');
    simMetricsArea.classList.add('hidden');
    infoArea.classList.add('hidden');
    floatingStats.classList.add('hidden');
    document.getElementById('barChart').classList.remove('hidden');

    if (mode === 'stats') {
        controlsArea.classList.remove('hidden');
        // 🌟 修復2：切換回第一宇宙預設時，開啟全螢幕地圖與浮動四格！
        dashboard.classList.add('full-width-map');
        floatingStats.classList.remove('hidden');
        currentStatsMetric = ''; // 取消子選單的 active 狀態
    } else {
        dashboard.classList.remove('full-width-map'); // 其他宇宙不使用全螢幕
        
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
    
    // 延遲繪製以確保動畫完成
    setTimeout(() => {
        mapChart.resize();
        if(currentMode !== 'stats' && (currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info')) {
            barChart.resize();
            updateBarChart(); 
        }
    }, 300);
}

// 3. 動態生成總數量明細
function renderFleetDetails() {
    const container = document.getElementById('fleet-detail-grid');
    const simContainer = document.getElementById('sim-detail-grid');
    let htmlFleet = '', htmlSim = '';
    rawData.forEach(item => {
        htmlFleet += `<div class="metric-card hover-glow" style="padding: 8px;"><div style="font-size: 13px; font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">${item.region}</div><div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;"><span>2月:</span><span>${item.m_fleet_feb.toLocaleString()}</span></div><div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--accent-color); font-weight: bold;"><span>3月:</span><span>${item.m_fleet.toLocaleString()}</span></div></div>`;
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

// 4. 圖例文字更新
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

// 5. 日夜主題切換
document.getElementById('themeToggleBtn').addEventListener('click', (e) => {
    isLightMode = !isLightMode;
    document.body.classList.toggle('light-mode', isLightMode);
    e.target.innerText = isLightMode ? '🌙 深色模式' : '🌞 淺色模式';
    updateMapTheme();  
    if(currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info') updateBarChart(); 
});

// 6. ECharts 繪圖核心
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
    let mapData = [], lineData = [], scatterData = [];
    rawData.forEach(item => {
        let val = getMapValue(item);
        item.mapNames.forEach(name => mapData.push({ name: name, value: val, customRegion: item.region }));
        lineData.push({ coords: [item.mapCenter, item.labelPos], value: val });
        scatterData.push({ name: item.region, value: [item.labelPos[0], item.labelPos[1], val] });
    });

    mapChart.setOption({
        geo: { map: 'Taiwan', roam: true, scaleLimit: { min: 0.8, max: 5 }, itemStyle: { areaColor: '#1e293b', borderColor: '#334155', borderWidth: 1 }, emphasis: { itemStyle: { areaColor: '#38bdf8' }, label: { show: false } } },
        visualMap: getVisualMapOption(),
        series: [
            { type: 'map', geoIndex: 0, data: mapData },
            { type: 'lines', coordinateSystem: 'geo', zlevel: 2, lineStyle: { color: '#94a3b8', width: 1.5, opacity: 0.6, curveness: 0.2 }, data: lineData },
            {
                type: 'scatter', coordinateSystem: 'geo', zlevel: 3, symbol: 'circle', symbolSize: 6, itemStyle: { color: '#38bdf8' },
                label: {
                    show: true, position: 'right', distance: 10,
                    formatter: function(params) { 
                        let unit = (currentMode === 'stats' || currentMode === 'maintenance') ? '分' : '%';
                        if(currentMode === 'maintenance') unit = '%'; 
                        if(currentMode === 'stats') unit = '分';
                        return `{region|${params.name}}\n{score|${params.value[2]} ${unit}}`; 
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: [6, 8], borderRadius: 4, borderColor: '#334155', borderWidth: 1,
                    rich: { region: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold', align: 'center', padding: [0, 0, 4, 0] }, score: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold', align: 'center' } }
                }, data: scatterData
            }
        ]
    });
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
        scatterData.push({ name: item.region, value: [item.labelPos[0], item.labelPos[1], val] });
    });

    mapChart.setOption({
        geo: { itemStyle: { areaColor: mapBaseColor, borderColor: isLightMode ? '#ffffff' : '#334155' }, emphasis: { itemStyle: { areaColor: accentColor } } },
        visualMap: getVisualMapOption(),
        series: [
            { data: mapData }, 
            { data: lineData, lineStyle: { color: isLightMode ? '#64748b' : '#94a3b8' } }, 
            { data: scatterData, itemStyle: { color: accentColor }, label: {
                formatter: function(params) { 
                    let unit = '%'; if(currentMode === 'stats') unit = '分';
                    return `{region|${params.name}}\n{score|${params.value[2]} ${unit}}`; 
                },
                backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.8)', borderColor: isLightMode ? '#cbd5e1' : '#334155',
                rich: { region: { color: textColor }, score: { color: accentColor } }
            } }
        ]
    }, false); 
}

// 🌟 修復3 & 修復4：長條圖 / 折線圖更新與變動值標示
function updateBarChart() {
    if (!twGeoJson || (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info')) return;
    
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-primary').trim();
    const gridColor = style.getPropertyValue('--chart-grid').trim();
    const accentColor = style.getPropertyValue('--accent-color').trim();
    const dangerColor = style.getPropertyValue('--danger-color').trim();
    const safeColor = style.getPropertyValue('--safe-color').trim();

    let regions, currentValues, previousValues, chartTitle, avgValue, isPercentage = false;

    // 🌟 修復3：如果是胎壓 (tire) 模式，完全改變圖表類型為 6M 折線圖
    if (currentMode === 'tire') {
        const sortedData = [...rawData].sort((a, b) => b.tire_history[6] - a.tire_history[6]);
        regions = sortedData.map(item => item.region);
        
        // 準備 6 個月的折線圖系列資料
        const months = ['25/10', '25/11', '25/12', '26/01', '26/02', '26/03'];
        const seriesData = [];
        
        // 繪製各縣市的折線
        sortedData.forEach((item, index) => {
            seriesData.push({
                name: item.region,
                type: 'line',
                data: item.tire_history.slice(1), // 抓取 10月到 3月
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 3 },
                // 強調當前最高的三個縣市
                itemStyle: { color: index < 3 ? dangerColor : (isLightMode ? '#94a3b8' : '#475569') },
                label: { show: index < 3, position: 'top', formatter: '{c}%' }
            });
        });

        barChart.setOption({
            title: { text: '全國各縣市前後胎壓未達標趨勢 (近 6 個月)', left: 'center', textStyle: { color: textColor, fontSize: 15 } },
            tooltip: { 
                trigger: 'axis', backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor },
                valueFormatter: (value) => value + '%'
            },
            legend: { data: regions, bottom: 0, textStyle: { color: textColor }, type: 'scroll' },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
            xAxis: { type: 'category', data: months, axisLabel: { color: textColor }, axisLine: { lineStyle: { color: gridColor } } },
            yAxis: { type: 'value', axisLabel: { color: textColor, formatter: '{value} %' }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
            series: seriesData
        }, true);
        return; // 胎壓折線圖處理完畢，直接返回
    }

    // 其他模式維持長條圖邏輯
    if (currentMode === 'stats') {
        const sortedData = [...rawData].sort((a, b) => b[currentStatsMetric] - a[currentStatsMetric]);
        regions = sortedData.map(item => item.region); currentValues = sortedData.map(item => item[currentStatsMetric]); previousValues = sortedData.map(item => item[currentStatsMetric + '_feb']);
        chartTitle = `各區指標對比 - ${statsMetrics.find(m => m.key === currentStatsMetric).label}`;
        avgValue = (currentValues.reduce((a, b) => a + b, 0) / currentValues.length).toFixed(1);
    } else if (currentMode === 'operability') {
        isPercentage = true;
        const sortedData = [...rawData].sort((a, b) => b.operability - a.operability);
        regions = sortedData.map(item => item.region); currentValues = sortedData.map(item => item.operability); previousValues = sortedData.map(item => item.operability_feb);
        chartTitle = `各縣市場站可動率對比 (2月 vs 3月)`;
        avgValue = (currentValues.reduce((a, b) => a + b, 0) / currentValues.length).toFixed(2);
    } else if (currentMode === 'maintenance') {
        isPercentage = currentMaintenanceMetric === 'maintenance_rate';
        const sortLogic = currentMaintenanceMetric === 'm_accident' ? (a, b) => a[currentMaintenanceMetric] - b[currentMaintenanceMetric] : (a, b) => b[currentMaintenanceMetric] - a[currentMaintenanceMetric];
        const sortedData = [...rawData].sort(sortLogic);
        regions = sortedData.map(item => item.region); currentValues = sortedData.map(item => item[currentMaintenanceMetric]); previousValues = sortedData.map(item => item[currentMaintenanceMetric + '_feb']);
        chartTitle = `各縣市${maintenanceMetrics.find(m => m.key === currentMaintenanceMetric).label}對比 (2月 vs 3月)`;
        avgValue = (currentValues.reduce((a, b) => a + b, 0) / currentValues.length).toFixed(isPercentage ? 2 : 0);
    } else if (currentMode === 'simulation') {
        isPercentage = true;
        const sortedData = [...rawData].sort((a, b) => a[currentSimulationMetric + '_ratio'] - b[currentSimulationMetric + '_ratio']);
        regions = sortedData.map(item => item.region); 
        currentValues = sortedData.map(item => item[currentSimulationMetric + '_ratio']); 
        previousValues = sortedData.map(item => item[currentSimulationMetric + '_lm']);
        chartTitle = `${simulationMetrics.find(m => m.key === currentSimulationMetric).label}異常占比對比 (2月 vs 3月)`;
        avgValue = (currentValues.reduce((a, b) => a + b, 0) / currentValues.length).toFixed(1);
    }

    barChart.setOption({
        title: { text: chartTitle, left: 'center', textStyle: { color: textColor, fontSize: 15 } },
        tooltip: { 
            trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor },
            formatter: function(params) {
                let html = `<div style="font-weight:bold;margin-bottom:5px;">${params[0].axisValue}</div>`;
                
                let valPrev = params[0].value;
                let valCurr = params[1].value;
                
                params.forEach(p => { html += `${p.marker} ${p.seriesName}: <b style="color:${p.color}">${p.value}${isPercentage ? '%' : ''}</b><br/>`; });
                
                // 🌟 修復4：所有長條圖的 Tooltip 都強制加入變動率計算
                let diff = (valCurr - valPrev).toFixed(isPercentage ? 2 : 0);
                let diffSign = diff > 0 ? '+' : '';
                let isBetter = false;
                
                // 判斷邏輯：哪些變多是好的，哪些變少是好的
                if(currentMode === 'maintenance' && currentMaintenanceMetric === 'm_accident') isBetter = diff <= 0;
                else if(currentMode === 'simulation') isBetter = diff <= 0;
                else isBetter = diff >= 0;
                
                let diffColor = isBetter ? safeColor : dangerColor;
                
                html += `<div style="margin-top:5px; border-top:1px solid ${isLightMode?'#cbd5e1':'#334155'}; padding-top:5px; font-size:12px;">較上月變動: <b style="color:${diffColor}">${diffSign}${diff}${isPercentage ? '%' : ''}</b></div>`;
                
                return html;
            }
        },
        legend: { data: ['2月 (前月)', '3月 (當月)'], bottom: 0, textStyle: { color: textColor } },
        grid: { left: '3%', right: '8%', bottom: '15%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: regions, axisLabel: { color: textColor }, axisLine: { lineStyle: { color: gridColor } } },
        yAxis: { type: 'value', min: function(val) { return isPercentage ? Math.max(0, Math.floor(val.min - 5)) : 0; }, axisLabel: { color: textColor, formatter: isPercentage ? '{value} %' : '{value}' }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
        series: [
            { name: '2月 (前月)', type: 'bar', barWidth: '30%', itemStyle: { color: isLightMode ? '#cbd5e1' : '#475569', borderRadius: [4, 4, 0, 0] }, label: { show: false }, data: previousValues },
            {
                name: '3月 (當月)', type: 'bar', barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] },
                data: currentValues.map(val => {
                    let barColor = accentColor;
                    if (currentMode === 'stats' || currentMode === 'operability') barColor = val < avgValue ? dangerColor : accentColor;
                    else if (currentMode === 'simulation') barColor = val > avgValue ? dangerColor : safeColor;
                    else if (currentMode === 'maintenance') {
                        if (currentMaintenanceMetric === 'm_accident') barColor = val > avgValue ? dangerColor : safeColor;
                        else if (currentMaintenanceMetric === 'maintenance_rate') barColor = val < avgValue ? dangerColor : accentColor;
                    }
                    return { value: val, itemStyle: { color: barColor } };
                }),
                label: { show: true, position: 'top', color: textColor, fontWeight: 'bold', formatter: isPercentage ? '{c}%' : '{c}' },
                markLine: { symbol: 'none', data: [{ type: 'average', name: '平均' }], label: { formatter: `3月平均\n${avgValue}${isPercentage?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold' }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } }
            }
        ]
    }, true);
}

function setupMapClickEvent() {
    mapChart.on('click', function(params) {
        let clickedRegion = null;
        if (params.seriesType === 'map') clickedRegion = rawData.find(r => r.mapNames.includes(params.name));
        else if (params.seriesType === 'scatter') clickedRegion = rawData.find(r => r.region === params.name);

        if (clickedRegion) {
            const panel = document.getElementById('cityDetailPanel');
            if (currentMode === 'stats') {
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 指標細節 (3月)`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row"><span>綜合分數:</span><span style="color:var(--accent-color); font-weight:bold;">${clickedRegion.overall}</span></div><div class="detail-row"><span>場站妥善度:</span><span>${clickedRegion.station}</span></div><div class="detail-row"><span>外觀標示:</span><span>${clickedRegion.appearance}</span></div><div class="detail-row"><span>重要機能:</span><span>${clickedRegion.functionality}</span></div><div class="detail-row"><span>EMS維護率:</span><span>${clickedRegion.ems}%</span></div><div class="detail-row"><span>可動率:</span><span>${clickedRegion.operability}%</span></div>`;
            } else if (currentMode === 'tire') {
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 胎壓未達標趨勢`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>月份</span><span>未達標率</span></div><div class="detail-row"><span>25年 10月:</span><span>${clickedRegion.tire_history[1]}%</span></div><div class="detail-row"><span>25年 11月:</span><span>${clickedRegion.tire_history[2]}%</span></div><div class="detail-row"><span>25年 12月:</span><span>${clickedRegion.tire_history[3]}%</span></div><div class="detail-row"><span>26年 01月:</span><span>${clickedRegion.tire_history[4]}%</span></div><div class="detail-row"><span>26年 02月:</span><span>${clickedRegion.tire_history[5]}%</span></div><div class="detail-row" style="font-weight:bold; color:var(--accent-color);"><span>26年 03月:</span><span>${clickedRegion.tire_history[6]}%</span></div>`;
            } else if (currentMode === 'operability') {
                let variance = (clickedRegion.operability - clickedRegion.operability_feb).toFixed(2);
                let varianceSign = variance > 0 ? '+' : '';
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 月度可動率分析`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>項目</span><span>數值</span></div><div class="detail-row"><span>2月可動率:</span><span>${clickedRegion.operability_feb.toFixed(2)}%</span></div><div class="detail-row" style="font-weight:bold; color:var(--accent-color);"><span>3月可動率:</span><span>${clickedRegion.operability.toFixed(2)}%</span></div><div class="detail-row"><span>月度變動:</span><span style="color:${variance < 0 ? 'var(--danger-color)' : 'var(--safe-color)'}; font-weight:bold;">${varianceSign}${variance}%</span></div>`;
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
        
        // 🌟 初始化為第一宇宙，觸發全螢幕地圖
        document.getElementById('main-dashboard').classList.add('full-width-map');
        document.getElementById('floating-stats-area').classList.remove('hidden');
        
        renderInitialMap();
        updateBarChart();
        setupMapClickEvent();
    } catch (error) {
        document.getElementById('loading').innerText = '地圖載入失敗，請檢查網路連線。';
    }
}

initDashboard();

window.addEventListener('resize', () => { mapChart.resize(); barChart.resize(); });

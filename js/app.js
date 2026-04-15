// js/app.js
let isLightMode = false;
let twGeoJson = null;
let currentMode = 'stats';
let showingFleetDetails = false;
let currentStatsMetric = 'station';
let currentMaintenanceMetric = 'maintenance_rate';

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
                
                // 🌟 如果點擊的是「補充說明」，隱藏圖表，顯示圖文面板
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
    }
}

// 2. 平行架構切換邏輯
document.getElementById('nav-stats').addEventListener('click', (e) => switchMode('stats', e.target));
document.getElementById('nav-tire').addEventListener('click', (e) => switchMode('tire', e.target));
document.getElementById('nav-operability').addEventListener('click', (e) => switchMode('operability', e.target));
document.getElementById('nav-maintenance').addEventListener('click', (e) => switchMode('maintenance', e.target));

function switchMode(mode, targetElement) {
    document.querySelectorAll('.top-nav button').forEach(btn => btn.classList.remove('active'));
    targetElement.classList.add('active');
    currentMode = mode;

    const controlsArea = document.getElementById('button-container');
    const baseMetricsArea = document.getElementById('base-metrics-area');
    const maintMetricsArea = document.getElementById('maintenance-metrics-area');
    const detailPanel = document.getElementById('cityDetailPanel');
    const infoArea = document.getElementById('maintenance-info-area');

    if (mode === 'stats') {
        controlsArea.classList.remove('hidden');
        baseMetricsArea.classList.remove('hidden');
        maintMetricsArea.classList.add('hidden');
        infoArea.classList.add('hidden');
        document.getElementById('barChart').classList.remove('hidden');
    } else if (mode === 'maintenance') {
        controlsArea.classList.remove('hidden');
        baseMetricsArea.classList.add('hidden');
        maintMetricsArea.classList.remove('hidden');
        
        if(currentMaintenanceMetric === 'm_info') {
            document.getElementById('barChart').classList.add('hidden');
            infoArea.classList.remove('hidden');
        } else {
            document.getElementById('barChart').classList.remove('hidden');
            infoArea.classList.add('hidden');
        }
    } else {
        controlsArea.classList.add('hidden');
        baseMetricsArea.classList.add('hidden');
        maintMetricsArea.classList.add('hidden');
        infoArea.classList.add('hidden');
        document.getElementById('barChart').classList.remove('hidden');
    }
    
    detailPanel.style.display = 'none';
    renderSubButtons();
    updateLegendBox();
    updateMapTheme(); 
    if(currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info') updateBarChart(); 
}

// 3. 圖例文字更新
function updateLegendBox() {
    const legendBox = document.getElementById('legend-box-content');
    if (currentMode === 'stats') {
        legendBox.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">地圖綜合分數</div>
            <div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>大於等於 92分</div>
            <div class="legend-item"><div class="color-box" style="background: #eab308;"></div>90 - 91.9分</div>
            <div class="legend-item"><div class="color-box" style="background: #f97316;"></div>88 - 89.9分</div>
            <div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>低於 88分</div>
        `;
    } else if (currentMode === 'tire') {
        legendBox.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">胎壓未達標率</div>
            <div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>0% - 2%</div>
            <div class="legend-item"><div class="color-box" style="background: #eab308;"></div>3% - 4%</div>
            <div class="legend-item"><div class="color-box" style="background: #f97316;"></div>5% - 7%</div>
            <div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>大於 7%</div>
        `;
    } else if (currentMode === 'operability') {
        legendBox.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">場站可動率 (總分扣分)</div>
            <div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>99% ~ 100% (扣 0 分)</div>
            <div class="legend-item"><div class="color-box" style="background: #eab308;"></div>95% ~ 99% (扣 1~2 分)</div>
            <div class="legend-item"><div class="color-box" style="background: #f97316;"></div>91% ~ 95% (扣 3~4 分)</div>
            <div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>未達 91% (扣 5 分)</div>
        `;
    } else if (currentMode === 'maintenance') {
        legendBox.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">一級維護率</div>
            <div class="legend-item"><div class="color-box" style="background: var(--safe-color);"></div>95% - 100%</div>
            <div class="legend-item"><div class="color-box" style="background: #eab308;"></div>90% - 94.9%</div>
            <div class="legend-item"><div class="color-box" style="background: #f97316;"></div>85% - 89.9%</div>
            <div class="legend-item"><div class="color-box" style="background: var(--danger-color);"></div>未達 85%</div>
        `;
    }
}

// 4. 動態生成營運車輛明細
function renderFleetDetails() {
    const container = document.getElementById('fleet-detail-grid');
    let html = '';
    rawData.forEach(item => {
        html += `
            <div class="metric-card hover-glow" style="padding: 8px;">
                <div style="font-size: 13px; font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">${item.region}</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">
                    <span>2月:</span><span>${item.m_fleet_feb.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--accent-color); font-weight: bold;">
                    <span>3月:</span><span>${item.m_fleet.toLocaleString()}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function toggleFleetDetails() {
    showingFleetDetails = !showingFleetDetails;
    const summaryDiv = document.getElementById('fleet-summary');
    const detailsDiv = document.getElementById('fleet-details');
    const hintText = document.getElementById('fleet-title-hint');
    
    if (showingFleetDetails) {
        summaryDiv.classList.add('hidden');
        detailsDiv.classList.remove('hidden');
        hintText.innerText = '(點擊收合回總計)';
    } else {
        summaryDiv.classList.remove('hidden');
        detailsDiv.classList.add('hidden');
        hintText.innerText = '(點擊展開各縣市明細)';
    }
}

// 5. 日夜主題切換
document.getElementById('themeToggleBtn').addEventListener('click', (e) => {
    isLightMode = !isLightMode;
    if (isLightMode) {
        document.body.classList.add('light-mode');
        e.target.innerText = '🌙 深色模式';
    } else {
        document.body.classList.remove('light-mode');
        e.target.innerText = '🌞 淺色模式';
    }
    updateMapTheme();  
    if(currentMode !== 'maintenance' || currentMaintenanceMetric !== 'm_info') updateBarChart(); 
});

// 6. 核心圖表邏輯 (地圖與長條圖)
function getMapValue(item) {
    if (currentMode === 'stats') return item.overall;
    else if (currentMode === 'tire') return item.tire_history[6];
    else if (currentMode === 'operability') return item.operability;
    else if (currentMode === 'maintenance') return item.maintenance_rate; 
}

function getVisualMapOption() {
    const style = getComputedStyle(document.body);
    const dangerColor = style.getPropertyValue('--danger-color').trim();
    const safeColor = style.getPropertyValue('--safe-color').trim();
    
    if (currentMode === 'stats') return { show: false, min: 86, max: 94, inRange: { color: [dangerColor, '#f97316', '#eab308', safeColor] } };
    else if (currentMode === 'tire') return { show: false, min: 0, max: 8, inRange: { color: [safeColor, '#eab308', '#f97316', dangerColor] } };
    else if (currentMode === 'operability') return { show: false, min: 90, max: 99, inRange: { color: [dangerColor, '#f97316', '#eab308', safeColor] } };
    else if (currentMode === 'maintenance') return { show: false, min: 80, max: 100, inRange: { color: [dangerColor, '#f97316', '#eab308', safeColor] } };
}

function renderInitialMap() {
    let mapData = [], lineData = [], scatterData = [];
    rawData.forEach(item => {
        let val = getMapValue(item);
        item.mapNames.forEach(name => mapData.push({ name: name, value: val, customRegion: item.region }));
        lineData.push({ coords: [item.mapCenter, item.labelPos], value: val });
        scatterData.push({ name: item.region, value: [item.labelPos[0], item.labelPos[1], val] });
    });

    const mapOption = {
        geo: {
            map: 'Taiwan', roam: true, scaleLimit: { min: 0.8, max: 5 },
            itemStyle: { areaColor: '#1e293b', borderColor: '#334155', borderWidth: 1 },
            emphasis: { itemStyle: { areaColor: '#38bdf8' }, label: { show: false } }
        },
        visualMap: getVisualMapOption(),
        series: [
            { type: 'map', geoIndex: 0, data: mapData },
            { type: 'lines', coordinateSystem: 'geo', zlevel: 2, lineStyle: { color: '#94a3b8', width: 1.5, opacity: 0.6, curveness: 0.2 }, data: lineData },
            {
                type: 'scatter', coordinateSystem: 'geo', zlevel: 3, symbol: 'circle', symbolSize: 6,
                itemStyle: { color: '#38bdf8' },
                label: {
                    show: true, position: 'right', distance: 10,
                    formatter: function(params) { 
                        let unit = (currentMode === 'stats' || currentMode === 'maintenance') && currentMode !== 'maintenance' ? '分' : '%';
                        if(currentMode === 'stats') unit = '分';
                        return `{region|${params.name}}\n{score|${params.value[2]} ${unit}}`; 
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    padding: [6, 8], borderRadius: 4, borderColor: '#334155', borderWidth: 1,
                    rich: { region: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold', align: 'center', padding: [0, 0, 4, 0] }, score: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold', align: 'center' } }
                },
                data: scatterData
            }
        ]
    };
    mapChart.setOption(mapOption);
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
            {
                data: scatterData, itemStyle: { color: accentColor },
                label: { backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.8)', borderColor: isLightMode ? '#cbd5e1' : '#334155', rich: { region: { color: textColor }, score: { color: accentColor } } }
            }
        ]
    }, false); 
}

function updateBarChart() {
    if (!twGeoJson || (currentMode === 'maintenance' && currentMaintenanceMetric === 'm_info')) return;
    
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-primary').trim();
    const gridColor = style.getPropertyValue('--chart-grid').trim();
    const accentColor = style.getPropertyValue('--accent-color').trim();
    const dangerColor = style.getPropertyValue('--danger-color').trim();
    const safeColor = style.getPropertyValue('--safe-color').trim();

    let regions, currentValues, previousValues, chartTitle, avgValue, isPercentage = false;

    if (currentMode === 'stats') {
        const sortedData = [...rawData].sort((a, b) => b[currentStatsMetric] - a[currentStatsMetric]);
        regions = sortedData.map(item => item.region); currentValues = sortedData.map(item => item[currentStatsMetric]); previousValues = sortedData.map(item => item[currentStatsMetric + '_feb']);
        chartTitle = `各區指標對比 - ${statsMetrics.find(m => m.key === currentStatsMetric).label}`;
        avgValue = (currentValues.reduce((a, b) => a + b, 0) / currentValues.length).toFixed(1);
    } else if (currentMode === 'tire') {
        isPercentage = true;
        const sortedData = [...rawData].sort((a, b) => a.tire_history[6] - b.tire_history[6]);
        regions = sortedData.map(item => item.region); currentValues = sortedData.map(item => item.tire_history[6]); previousValues = sortedData.map(item => item.tire_history[5]);
        chartTitle = `前後胎壓未達標率對比 (2月 vs 3月)`;
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
    }

    barChart.setOption({
        title: { text: chartTitle, left: 'center', textStyle: { color: textColor, fontSize: 15 } },
        tooltip: { 
            trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15, 23, 42, 0.9)', textStyle: { color: textColor },
            formatter: function(params) {
                let html = `<div style="font-weight:bold;margin-bottom:5px;">${params[0].axisValue}</div>`;
                params.forEach(p => { html += `${p.marker} ${p.seriesName}: <b style="color:${p.color}">${p.value}${isPercentage ? '%' : ''}</b><br/>`; });
                if (currentMode === 'maintenance' && currentMaintenanceMetric === 'maintenance_rate') {
                    const regionData = rawData.find(r => r.region === params[0].axisValue);
                    html += `<div style="margin-top:5px; border-top:1px solid ${isLightMode?'#cbd5e1':'#334155'}; padding-top:5px; font-size:12px;">較上月變動: <b style="${regionData.m_var.includes('-')?('color:'+dangerColor):('color:'+safeColor)}">${regionData.m_var}</b></div>`;
                }
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
                    else if (currentMode === 'tire') barColor = val > avgValue ? dangerColor : safeColor;
                    else if (currentMode === 'maintenance') {
                        if (currentMaintenanceMetric === 'm_accident') barColor = val > avgValue ? dangerColor : safeColor;
                        else if (currentMaintenanceMetric === 'maintenance_rate') barColor = val < avgValue ? dangerColor : accentColor;
                    }
                    return { value: val, itemStyle: { color: barColor } };
                }),
                label: { show: true, position: 'top', color: textColor, fontWeight: 'bold', formatter: isPercentage ? '{c}%' : '{c}' },
                markLine: { symbol: 'none', data: [{ type: 'average', name: '3月平均' }], label: { formatter: `3月平均\n${avgValue}${isPercentage?'%':''}`, position: 'end', color: isLightMode ? '#d97706' : '#eab308', fontWeight: 'bold' }, lineStyle: { color: isLightMode ? '#d97706' : '#eab308', type: 'dashed', width: 2 } }
            }
        ]
    }, true);
}

// 7. 啟動與監聽
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
                document.getElementById('detail-title').innerText = `${clickedRegion.region} 事故與維護統計 (3月)`;
                document.getElementById('detail-content').innerHTML = `<div class="detail-row" style="border-bottom:1px solid var(--border-color); padding-bottom:5px; margin-bottom:5px; color:var(--text-secondary);"><span>項目</span><span>數值</span></div><div class="detail-row"><span>總營運車輛:</span><span>${clickedRegion.m_fleet.toLocaleString()} 輛</span></div><div class="detail-row"><span style="color:var(--danger-color);">事故車輛數:</span><span style="color:var(--danger-color); font-weight:bold;">${clickedRegion.m_accident} 輛</span></div><div class="detail-row"><span>維護記錄數:</span><span>${clickedRegion.m_records.toLocaleString()} 筆</span></div><div class="detail-row" style="font-weight:bold; color:var(--accent-color);"><span>一級維護率:</span><span>${clickedRegion.maintenance_rate}%</span></div><div class="detail-row"><span>較上月變動:</span><span style="color:${clickedRegion.m_var.includes('-') ? 'var(--danger-color)' : 'var(--safe-color)'}; font-weight:bold;">${clickedRegion.m_var}</span></div>`;
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
        renderInitialMap();
        updateBarChart();
        setupMapClickEvent();
    } catch (error) {
        document.getElementById('loading').innerText = '地圖載入失敗，請檢查網路連線。';
    }
}

initDashboard();

window.addEventListener('resize', () => { mapChart.resize(); barChart.resize(); });

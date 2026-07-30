import { store } from '../store.js';
import { PmpCalculators } from '../utils/pmpCalculators.js';
import { t } from '../utils/i18n.js';
import { getBoschRiskLevel, normalizeRiskType } from '../utils/boschRiskMatrix.js';

const escapeHTML = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

export class DashboardCharts {
  constructor() {
    this.charts = {
      gantt: null,
      network: null,
      scurve: null,
      burndown: null,
      cfd: null,
      resource: null,
      control: null,
      riskmatrix: null
    };

    this.pendingFrame = null;
    this.observedElements = new WeakSet();
    this.resizeCharts = () => {
      Object.values(this.charts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') chart.resize();
      });
    };

    window.addEventListener('resize', this.resizeCharts);
    this.resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this.resizeCharts())
      : null;
  }

  init() {
    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame);

    // Two animation frames let the active view and responsive grid finish layout.
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = requestAnimationFrame(() => {
        this.pendingFrame = null;
        this.renderAll(store.state);
      });
    });
  }

  update() {
    this.init();
  }

  dispose() {
    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame);
    window.removeEventListener('resize', this.resizeCharts);
    this.resizeObserver?.disconnect();
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.dispose === 'function') chart.dispose();
    });
  }

  renderAll(state) {
    this.renderGantt(state);
    this.renderNetwork(state);
    this.renderSCurve(state);
    this.renderBurndown(state);
    this.renderCFD(state);
    this.renderResource(state);
    this.renderControl(state);
    this.renderRiskMatrix(state);

    if (this.resizeObserver) {
      document.querySelectorAll('[id^="chart-"]').forEach(el => {
        if (!this.observedElements.has(el)) {
          this.observedElements.add(el);
          this.resizeObserver.observe(el);
        }
      });
    }
  }

  setOption(chart, option) {
    option.textStyle = {
      fontFamily: '"Bosch Office Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
      color: '#404040',
      ...(option.textStyle || {})
    };
    option.backgroundColor = 'transparent';
    if (option.legend) option.legend.textStyle = { color: '#404040', fontSize: 11 };
    ['xAxis', 'yAxis'].forEach(key => {
      const axes = Array.isArray(option[key]) ? option[key] : [option[key]];
      axes.filter(Boolean).forEach(axis => {
        axis.axisLine = { lineStyle: { color: '#999999' }, ...(axis.axisLine || {}) };
        axis.axisLabel = { color: '#404040', fontSize: 11, ...(axis.axisLabel || {}) };
        axis.splitLine = { lineStyle: { color: '#e5e5e5' }, ...(axis.splitLine || {}) };
      });
    });
    chart.setOption(option, { notMerge: true, lazyUpdate: false });
  }

  renderEmpty(chart) {
    chart.clear();
    this.setOption(chart, {
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: t('chart_no_data'),
          fill: '#6b7280',
          font: '14px sans-serif'
        }
      }
    });
  }

  ensureChartEngine(el, title, rows = []) {
    if (!el) return false;
    if (window.echarts) return true;

    const body = rows.length
      ? rows.map(row => `
          <div class="fallback-row">
            <span>${row.label}</span>
            <strong>${row.value}</strong>
          </div>
        `).join('')
      : `<div class="chart-empty-state">${t('chart_no_data')}</div>`;

    el.innerHTML = `
      <div class="chart-fallback">
        <div class="chart-fallback-title">${title}</div>
        <div class="chart-empty-state">${t('chart_load_error')}</div>
        <div class="chart-fallback-body">${body}</div>
      </div>
    `;
    return false;
  }

  renderGantt(state) {
    const el = document.getElementById('chart-gantt');
    const schedule = state.schedule || [];
    if (!this.ensureChartEngine(el, t('chart_schedule_summary'), schedule.slice(0, 6).map(task => ({
      label: task.name,
      value: `${task.progress || 0}% | ${task.startDate} ${t('chart_to')} ${task.endDate}`
    })))) return;
    if (!this.charts.gantt) this.charts.gantt = window.echarts.init(el);

    if (schedule.length === 0) {
      this.renderEmpty(this.charts.gantt);
      return;
    }

    // Sort by start date
    const sorted = [...schedule].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    const categories = sorted.map(t => t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name);
    
    // We'll map start dates and durations
    const minDate = new Date(sorted[0].startDate).getTime();
    
    const startData = sorted.map(t => new Date(t.startDate).getTime() - minDate);
    const durationData = sorted.map(t => new Date(t.endDate).getTime() - new Date(t.startDate).getTime());
    const progressData = sorted.map(t => t.progress);

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          const idx = params[0].dataIndex;
          const task = sorted[idx];
          return `${task.name}<br/>${t('chart_start')}: ${task.startDate}<br/>${t('chart_end')}: ${task.endDate}<br/>${t('chart_progress')}: ${task.progress}%`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', data: categories, inverse: true },
      series: [
        {
          name: 'offset',
          type: 'bar',
          stack: 'Total',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
          data: startData
        },
        {
          name: t('chart_duration'),
          type: 'bar',
          stack: 'Total',
          itemStyle: { color: '#007bc0' },
          data: durationData
        }
      ]
    };
    this.setOption(this.charts.gantt, option);
  }

  renderNetwork(state) {
    const el = document.getElementById('chart-network');
    const schedule = state.schedule || [];
    const dependencyCount = schedule.filter(t => String(t.dependencies || '').trim()).length;
    if (!this.ensureChartEngine(el, t('chart_dependency_network'), [
      { label: t('chart_activities'), value: schedule.length },
      { label: t('chart_activities_with_dependencies'), value: dependencyCount },
      { label: t('chart_milestones'), value: schedule.filter(task => String(task.name || '').toLowerCase().includes('milestone')).length }
    ])) return;
    if (!this.charts.network) this.charts.network = window.echarts.init(el);

    if (schedule.length === 0) {
      this.renderEmpty(this.charts.network);
      return;
    }

    const taskIds = new Set(schedule.map(task => String(task.id)));
    const data = schedule.map(task => ({
      id: String(task.id),
      name: task.name,
      value: Number(task.progress) || 0,
      symbolSize: String(task.name || '').toLowerCase().includes('milestone') ? 54 : 42,
      itemStyle: {
        color: Number(task.progress) >= 100 ? '#6dbf24' : '#007bc0'
      }
    }));
    const links = schedule.flatMap(task => String(task.dependencies || '')
      .split(',')
      .map(value => value.trim())
      .filter(dependencyId => taskIds.has(dependencyId))
      .map(dependencyId => ({ source: dependencyId, target: String(task.id) })));

    const option = {
      title: { text: t('chart_dependency_network'), textStyle: { fontSize: 12, color: '#6b7280' } },
      tooltip: {
        formatter: function (params) {
          if (params.dataType === 'node') {
            return `${params.data.name}<br/>${t('chart_progress')}: ${params.data.value}%`;
          }
          return '';
        }
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          symbolSize: 50,
          roam: true,
          label: {
            show: true,
            formatter: params => params.data.id
          },
          force: { repulsion: 320, edgeLength: 120 },
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [4, 10],
          data: data,
          links: links,
          lineStyle: { color: '#9ca3af', width: 2 }
        }
      ]
    };
    this.setOption(this.charts.network, option);
  }

  renderSCurve(state) {
    const el = document.getElementById('chart-scurve');
    const history = state.evmHistory || [];
    const latest = history[history.length - 1] || {};
    if (!this.ensureChartEngine(el, t('dashboard_chart_scurve'), [
      { label: t('chart_latest_pv'), value: `¥${Number(latest.PV || 0).toLocaleString()}` },
      { label: t('chart_latest_ev'), value: `¥${Number(latest.EV || 0).toLocaleString()}` },
      { label: t('chart_latest_ac'), value: `¥${Number(latest.AC || 0).toLocaleString()}` }
    ])) return;
    if (!this.charts.scurve) this.charts.scurve = window.echarts.init(el);

    if (history.length === 0) {
      this.renderEmpty(this.charts.scurve);
      return;
    }

    const xAxis = history.map(h => h.timePoint);
    const pv = history.map(h => Number(h.PV) || 0);
    const ev = history.map(h => Number(h.EV) || 0);
    const ac = history.map(h => Number(h.AC) || 0);
    
    // Calculate current SPI / CPI for the tooltip/title
    let titleStr = t('chart_evm_title');
    if (history.length > 0) {
      const last = history[history.length - 1];
      const spi = last.PV ? (last.EV / last.PV).toFixed(2) : 1;
      const cpi = last.AC ? (last.EV / last.AC).toFixed(2) : 1;
      titleStr = `${t('dashboard_chart_scurve')} | ${t('chart_current_spi')}: ${spi} | CPI: ${cpi}`;
    }

    const option = {
      title: { text: titleStr, textStyle: { fontSize: 14, color: '#374151' }, top: 0 },
      tooltip: { trigger: 'axis' },
      legend: { data: [t('chart_planned_value'), t('chart_earned_value'), t('chart_actual_cost')], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: xAxis },
      yAxis: { type: 'value', name: t('chart_value_rmb') },
      series: [
        { name: t('chart_planned_value'), type: 'line', smooth: true, itemStyle: { color: '#007bc0' }, data: pv },
        { name: t('chart_earned_value'), type: 'line', smooth: true, itemStyle: { color: '#6dbf24' }, data: ev },
        { name: t('chart_actual_cost'), type: 'line', smooth: true, itemStyle: { color: '#54003c' }, data: ac }
      ]
    };
    this.setOption(this.charts.scurve, option);
  }

  renderBurndown(state) {
    const el = document.getElementById('chart-burndown');
    const data = state.sprintBurndown || [];
    const latest = data[data.length - 1] || {};
    if (!this.ensureChartEngine(el, t('chart_burndown_title'), [
      { label: t('chart_latest_day'), value: latest.day || '-' },
      { label: t('chart_ideal_remaining'), value: latest.idealRemaining ?? '-' },
      { label: t('chart_actual_remaining'), value: latest.actualRemaining ?? '-' }
    ])) return;
    if (!this.charts.burndown) this.charts.burndown = window.echarts.init(el);

    if (data.length === 0) {
      this.renderEmpty(this.charts.burndown);
      return;
    }

    const xAxis = data.map(d => d.day);
    const ideal = data.map(d => Number(d.idealRemaining) || 0);
    const actual = data.map(d => Number(d.actualRemaining) || 0);

    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: [t('chart_ideal'), t('chart_actual')], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: xAxis },
      yAxis: { type: 'value', name: t('chart_story_points') },
      series: [
        { name: t('chart_ideal'), type: 'line', itemStyle: { color: '#9ca3af' }, lineStyle: { type: 'dashed' }, data: ideal },
        { 
          name: t('chart_actual'),
          type: 'line', 
          itemStyle: { color: '#007bc0' },
          data: actual
        }
      ]
    };
    this.setOption(this.charts.burndown, option);
  }

  renderCFD(state) {
    const el = document.getElementById('chart-cfd');
    const data = state.cfd || [];
    const latest = data[data.length - 1] || {};
    if (!this.ensureChartEngine(el, t('chart_cfd_title'), [
      { label: t('chart_done'), value: latest.done ?? '-' },
      { label: t('chart_testing'), value: latest.testing ?? '-' },
      { label: t('chart_in_progress'), value: latest.inProgress ?? '-' },
      { label: t('chart_todo'), value: latest.todo ?? '-' }
    ])) return;
    if (!this.charts.cfd) this.charts.cfd = window.echarts.init(el);

    if (data.length === 0) {
      this.renderEmpty(this.charts.cfd);
      return;
    }

    const xAxis = data.map(d => d.date);
    const todo = data.map(d => Number(d.todo) || 0);
    const inProgress = data.map(d => Number(d.inProgress) || 0);
    const testing = data.map(d => Number(d.testing) || 0);
    const done = data.map(d => Number(d.done) || 0);

    const option = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } } },
      legend: { data: [t('chart_done'), t('chart_testing'), t('chart_in_progress'), t('chart_todo')], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: [ { type: 'category', boundaryGap: false, data: xAxis } ],
      yAxis: [ { type: 'value' } ],
      series: [
        { name: t('chart_done'), type: 'line', stack: 'Total', areaStyle: {}, emphasis: { focus: 'series' }, itemStyle: { color: '#6dbf24' }, data: done },
        { name: t('chart_testing'), type: 'line', stack: 'Total', areaStyle: {}, emphasis: { focus: 'series' }, itemStyle: { color: '#54003c' }, data: testing },
        { name: t('chart_in_progress'), type: 'line', stack: 'Total', areaStyle: {}, emphasis: { focus: 'series' }, itemStyle: { color: '#007bc0' }, data: inProgress },
        { name: t('chart_todo'), type: 'line', stack: 'Total', areaStyle: {}, emphasis: { focus: 'series' }, itemStyle: { color: '#9ca3af' }, data: todo }
      ]
    };
    this.setOption(this.charts.cfd, option);
  }

  renderResource(state) {
    const el = document.getElementById('chart-resource');
    const data = state.resourceHistogram || [];
    const overloads = data.filter(d => Number(d.allocatedHours || 0) > Number(d.capacityHours || 0)).length;
    if (!this.ensureChartEngine(el, t('chart_resource_title'), [
      { label: t('chart_periods_tracked'), value: data.length },
      { label: t('chart_over_capacity_periods'), value: overloads },
      { label: t('chart_total_allocated_hours'), value: data.reduce((sum, d) => sum + Number(d.allocatedHours || 0), 0) }
    ])) return;
    if (!this.charts.resource) this.charts.resource = window.echarts.init(el);

    if (data.length === 0) {
      this.renderEmpty(this.charts.resource);
      return;
    }

    const xAxis = data.map(d => d.period + ' (' + d.role + ')');
    const capacity = data.map(d => Number(d.capacityHours) || 0);
    const allocated = data.map(d => Number(d.allocatedHours) || 0);

    const option = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: [t('chart_capacity'), t('chart_allocated')], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: xAxis, axisLabel: { interval: 0, rotate: 15 } },
      yAxis: { type: 'value', name: t('chart_hours') },
      series: [
        { name: t('chart_capacity'), type: 'bar', itemStyle: { color: '#e5e7eb' }, data: capacity },
        { 
          name: t('chart_allocated'),
          type: 'bar', 
          barGap: '-100%',
          itemStyle: { 
            color: function(params) {
              return params.data > capacity[params.dataIndex] ? '#e0000a' : '#007bc0';
            } 
          }, 
          data: allocated 
        }
      ]
    };
    this.setOption(this.charts.resource, option);
  }

  renderControl(state) {
    const el = document.getElementById('chart-control');
    const data = state.controlChart || [];
    const outOfControl = data.filter(d => Number(d.measurement) > Number(d.UCL) || Number(d.measurement) < Number(d.LCL)).length;
    if (!this.ensureChartEngine(el, t('chart_quality_title'), [
      { label: t('chart_samples'), value: data.length },
      { label: t('chart_out_of_control'), value: outOfControl },
      { label: t('chart_mean_target'), value: data.length ? (data.reduce((sum, item) => sum + Number(item.mean || 0), 0) / data.length).toFixed(2) : '-' }
    ])) return;
    if (!this.charts.control) this.charts.control = window.echarts.init(el);

    if (data.length === 0) {
      this.renderEmpty(this.charts.control);
      return;
    }

    const xAxis = data.map(d => d.sampleId);
    const measurement = data.map(d => Number(d.measurement) || 0);
    const ucl = data.map(d => Number(d.UCL) || 0);
    const lcl = data.map(d => Number(d.LCL) || 0);
    const mean = data.map(d => Number(d.mean) || 0);
    const values = [...measurement, ...ucl, ...lcl, ...mean];
    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const padding = Math.max(1, (yMax - yMin) * 0.1);

    const option = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: xAxis },
      legend: { data: [t('chart_measurement'), 'UCL', 'LCL', t('chart_mean')], top: 0 },
      yAxis: { type: 'value', min: yMin - padding, max: yMax + padding },
      series: [
        {
          name: t('chart_measurement'),
          type: 'line',
          data: measurement,
          itemStyle: { color: '#007bc0' }
        },
        { name: 'UCL', type: 'line', symbol: 'none', lineStyle: { color: '#e0000a', type: 'dashed' }, data: ucl },
        { name: 'LCL', type: 'line', symbol: 'none', lineStyle: { color: '#e0000a', type: 'dashed' }, data: lcl },
        { name: t('chart_mean'), type: 'line', symbol: 'none', lineStyle: { color: '#6dbf24', type: 'dotted' }, data: mean }
      ]
    };
    this.setOption(this.charts.control, option);
  }

  renderRiskMatrix(state) {
    const el = document.getElementById('chart-riskmatrix');
    const risks = state.risks || [];
    if (!el) return;
    if (this.charts.riskmatrix) {
      this.charts.riskmatrix.dispose();
      this.charts.riskmatrix = null;
    }

    const isZh = state.language === 'zh';
    const labels = isZh
      ? ['很高', '高', '中', '低', '很低']
      : ['Very high', 'High', 'Medium', 'Low', 'Very low'];
    const text = (en, zh) => isZh ? zh : en;
    const activeRisks = risks.filter(risk => risk.status !== 'Closed');

    const renderPane = type => {
      const impactLevels = type === 'threat' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
      const impactLabels = type === 'threat' ? [...labels].reverse() : labels;
      let html = `<section class="bosch-pane"><h4>${type === 'threat' ? text('Negative risks / threats', '负面风险 / 威胁') : text('Positive risks / opportunities', '正面风险 / 机会')}</h4><div class="bosch-grid"><span class="bosch-corner">${t('chart_probability')}</span>`;
      impactLevels.forEach((impact, index) => {
        html += `<span class="bosch-impact-label">${impactLabels[index]}</span>`;
      });
      for (let probability = 5; probability >= 1; probability--) {
        html += `<span class="bosch-probability-label">${labels[5 - probability]}</span>`;
        impactLevels.forEach(impact => {
          const matches = activeRisks.filter(risk => normalizeRiskType(risk) === type && Number(risk.probability) === probability && Number(risk.impact) === impact);
          const level = getBoschRiskLevel(type, probability, impact);
          const tickets = matches.map(risk => `<span class="bosch-ticket" title="${escapeHTML(risk.description)}">${escapeHTML(String(risk.id).replace(/^r-/, ''))}</span>`).join('');
          html += `<span class="bosch-cell bosch-${level}">${tickets}</span>`;
        });
      }
      return `${html}</div><div class="bosch-axis">${t('chart_impact')}</div></section>`;
    };

    el.innerHTML = `<div class="bosch-matrix dashboard-risk-matrix"><div class="bosch-panes">${renderPane('threat')}<div class="bosch-zero">${text('Zero impact / probability', '零影响 / 零概率')}</div>${renderPane('opportunity')}</div></div>`;
  }
}

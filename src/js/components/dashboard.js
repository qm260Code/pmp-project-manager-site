import { store } from '../store.js';
import { PmpCalculators } from '../utils/pmpCalculators.js';
import { t } from '../utils/i18n.js';
import { DashboardCharts } from './dashboardCharts.js';
import { getBoschRiskLevel, normalizeRiskType } from '../utils/boschRiskMatrix.js';

export class DashboardComponent {
  constructor(container) {
    this.container = container;
    this.kpiContainer = document.getElementById('dashboard-kpi-container');
    this.chartsController = new DashboardCharts();
    this.container?.addEventListener('click', event => {
      const button = event.target.closest('[data-dashboard-target]');
      if (!button) return;
      document.querySelector(`.sidebar-link[data-view="${button.dataset.dashboardTarget}"]`)?.click();
    });

    this.render();

    // Subscribe to store updates to trigger re-renders
    this._unsubscribe = store.subscribe('state-updated', () => {
      this.render();
    });
  }

  render() {
    const state = store.state;
    this.renderKPIs(state);
    
    // Render the robust ECharts modules
    this.chartsController.init();
  }

  onActivate() {
    // When the dashboard view becomes active, resize charts because they might have been created
    // or updated while the container was display:none (width=0).
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  renderKPIs(state) {
    const evm = PmpCalculators.calculateEVM(state.costs, state.projectInfo.budget);
    const risks = state.risks || [];
    const schedule = state.schedule || [];
    
    // Compute High Risks
    const highRisksCount = risks.filter(r =>
      r.status !== 'Closed' &&
      normalizeRiskType(r) === 'threat' &&
      getBoschRiskLevel('threat', r.probability, r.impact) === 'critical'
    ).length;
    
    // Compute Schedule average progress
    let avgProgress = 0;
    if (schedule.length > 0) {
      const total = schedule.reduce((sum, item) => sum + Number(item.progress || 0), 0);
      avgProgress = Math.round(total / schedule.length);
    }
    
    // EVM status descriptions
    const cpiStr = evm.CPI.toFixed(2);
    const spiStr = evm.SPI.toFixed(2);
    const isZh = state.language === 'zh';
    const budgetText = isZh ? `¥${(evm.BAC / 10000).toFixed(0)}万` : `¥${(evm.BAC / 1000).toFixed(0)}k`;
    const actualCostText = isZh ? `¥${(evm.AC / 10000).toFixed(0)}万` : `¥${(evm.AC / 1000).toFixed(0)}k`;
    let cpiDesc = t('kpi_cpi_desc_matched');
    let cpiClass = 'status-success';
    if (evm.CPI < 0.9) { cpiDesc = t('kpi_cpi_desc_over'); cpiClass = 'status-danger'; }
    else if (evm.CPI > 1.1) { cpiDesc = t('kpi_cpi_desc_under'); cpiClass = 'status-success'; }

    let spiDesc = t('kpi_spi_desc_normal');
    let spiClass = 'status-success';
    if (evm.SPI < 0.9) { spiDesc = t('kpi_spi_desc_delay'); spiClass = 'status-danger'; }
    else if (evm.SPI > 1.1) { spiDesc = t('kpi_spi_desc_ahead'); spiClass = 'status-success'; }

    this.kpiContainer.innerHTML = `
      <!-- Card 1: Project Budget -->
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--accent-primary);">
        <span class="kpi-title">${t('kpi_budget_cost')}</span>
        <span class="kpi-value">${budgetText}</span>
        <div class="kpi-desc">
          <span>${t('kpi_budget_cost_desc')} <strong>${actualCostText}</strong></span>
        </div>
      </div>
      
      <!-- Card 2: CPI Indicator -->
      <div class="glass-panel kpi-card" style="border-left: 4px solid ${evm.CPI < 0.9 ? 'var(--status-danger)' : 'var(--status-success)'};">
        <span class="kpi-title">${t('kpi_cpi')}</span>
        <span class="kpi-value ${evm.CPI < 0.9 ? 'text-danger' : ''}">${cpiStr}</span>
        <div class="kpi-desc">
          <span style="color: var(--${cpiClass === 'status-danger' ? 'status-danger' : 'status-success'});">● ${cpiDesc}</span>
        </div>
      </div>

      <!-- Card 3: SPI Indicator -->
      <div class="glass-panel kpi-card" style="border-left: 4px solid ${evm.SPI < 0.9 ? 'var(--status-danger)' : 'var(--status-success)'};">
        <span class="kpi-title">${t('kpi_spi')}</span>
        <span class="kpi-value ${evm.SPI < 0.9 ? 'text-danger' : ''}">${spiStr}</span>
        <div class="kpi-desc">
          <span style="color: var(--${spiClass === 'status-danger' ? 'status-danger' : 'status-success'});">● ${spiDesc}</span>
        </div>
      </div>

      <!-- Card 4: Risks summary -->
      <div class="glass-panel kpi-card" style="border-left: 4px solid ${highRisksCount > 0 ? 'var(--status-warning)' : 'var(--border-color)'};">
        <span class="kpi-title">${t('kpi_risks')}</span>
        <span class="kpi-value">${risks.length} <span style="font-size:16px; font-weight:400; color:var(--text-muted);">${t('kpi_risks_total')}</span></span>
        <div class="kpi-desc">
          <span style="${highRisksCount > 0 ? 'color: var(--status-danger); font-weight:600;' : ''}">
            ⚠️ ${t('kpi_risks_desc_severe')}${highRisksCount}
          </span>
        </div>
      </div>

      <!-- Card 5: Schedule Progress -->
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--accent-secondary);">
        <span class="kpi-title">${t('kpi_progress')}</span>
        <span class="kpi-value">${avgProgress}%</span>
        <div class="kpi-desc">
          <span>${schedule.length}${t('kpi_progress_desc_nodes')}</span>
        </div>
      </div>
    `;
  }
}

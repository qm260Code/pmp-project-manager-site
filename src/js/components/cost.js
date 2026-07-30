import { store } from '../store.js';
import { PmpCalculators } from '../utils/pmpCalculators.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class CostComponent {
  constructor(container) {
    this.container = container;
    this.kpiContainer = document.getElementById('cost-evm-kpi-container');
    this.tableBody = document.getElementById('cost-table-body');
    this.btnAdd = document.getElementById('btn-add-cost');

    this.initEvents();
    this.render();

    this._unsubscribe = store.subscribe('state-updated', () => {
      this.render();
    });
  }

  initEvents() {
    this.btnAdd.addEventListener('click', () => this.openAddModal());
  }

  render() {
    const state = store.state;
    const costs = state.costs || [];
    const budget = state.projectInfo.budget || 0;
    
    const evm = PmpCalculators.calculateEVM(costs, budget);
    
    this.renderKPIs(evm);
    this.renderTable(costs);
  }

  renderKPIs(evm) {
    const cvColor = evm.CV >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
    const svColor = evm.SV >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
    
    const cpiAlert = evm.CPI < 0.9 ? 'color: var(--status-danger);' : evm.CPI >= 1.0 ? 'color: var(--status-success);' : 'color: var(--status-warning);';
    const spiAlert = evm.SPI < 0.9 ? 'color: var(--status-danger);' : evm.SPI >= 1.0 ? 'color: var(--status-success);' : 'color: var(--status-warning);';

    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';
    const healthText = isEn ? 'EVM Index (Target >= 1.0)' : '绩效健康度（目标不低于 1.0）';
    const indexTitle = isEn ? 'CPI & SPI' : '成本绩效与进度绩效';
    const cpiLabel = isEn ? 'CPI' : '成本绩效';
    const spiLabel = isEn ? 'SPI' : '进度绩效';
    const vacLabel = isEn ? 'VAC' : '完工预算偏差';

    this.kpiContainer.innerHTML = `
      <div class="glass-panel kpi-card" style="border-left: 3px solid var(--accent-primary);">
        <span class="kpi-title">${t('cost_kpi_pv')} / ${t('cost_kpi_ac')}</span>
        <span class="kpi-value" style="font-size:22px;">¥${evm.PV.toLocaleString()} / ¥${evm.AC.toLocaleString()}</span>
        <div class="kpi-desc">${t('cost_kpi_ev')}: <strong>¥${evm.EV.toLocaleString()}</strong></div>
      </div>
      
      <div class="glass-panel kpi-card" style="border-left: 3px solid ${cvColor};">
        <span class="kpi-title">${t('cost_kpi_cv')} / ${t('cost_kpi_sv')}</span>
        <span class="kpi-value" style="font-size:22px; color:${cvColor};">¥${evm.CV.toLocaleString()}</span>
        <div class="kpi-desc">${t('cost_kpi_sv')}: <strong style="color:${svColor};">¥${evm.SV.toLocaleString()}</strong></div>
      </div>

      <div class="glass-panel kpi-card" style="border-left: 3px solid var(--accent-secondary);">
        <span class="kpi-title">${indexTitle}</span>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span class="kpi-value" style="font-size:24px; ${cpiAlert}">${cpiLabel}: ${evm.CPI.toFixed(2)}</span>
          <span class="kpi-value" style="font-size:24px; ${spiAlert}">${spiLabel}: ${evm.SPI.toFixed(2)}</span>
        </div>
        <div class="kpi-desc">${healthText}</div>
      </div>

      <div class="glass-panel kpi-card" style="border-left: 3px solid ${evm.VAC >= 0 ? 'var(--status-success)' : 'var(--status-danger)'};">
        <span class="kpi-title">${t('cost_kpi_eac')} / ${vacLabel}</span>
        <span class="kpi-value" style="font-size:22px;">¥${Math.round(evm.EAC).toLocaleString()}</span>
        <div class="kpi-desc">
          ${vacLabel}: <strong style="color:${evm.VAC >= 0 ? 'var(--status-success)' : 'var(--status-danger)'};">¥${Math.round(evm.VAC).toLocaleString()}</strong>
        </div>
      </div>
    `;
  }

  renderTable(costs) {
    if (costs.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted);">
            ${t('cost_empty')}
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    costs.forEach(item => {
      const progressPercent = item.plannedValue > 0 ? Math.round((item.earnedValue / item.plannedValue) * 100) : 0;
      const lang = store.state.language || 'en';
      const isEn = lang !== 'zh';
      const evText = isEn ? 'EV Value' : '已挣值';
      
      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${item.description}</div>
          </td>
          <td>
            <span style="font-size: 14px;">¥${Number(item.plannedValue).toLocaleString()}</span>
          </td>
          <td>
            <span style="font-size: 14px; color: ${Number(item.actualCost) > Number(item.earnedValue) ? 'var(--status-danger)' : 'var(--text-primary)'};">
              ¥${Number(item.actualCost).toLocaleString()}
            </span>
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; font-size:12px;">
                <span>${evText}: <strong>¥${Number(item.earnedValue).toLocaleString()}</strong></span>
                <span style="color:var(--accent-secondary); font-weight:700;">${progressPercent}%</span>
              </div>
              <div style="width:100%; background:var(--bg-secondary); border:1px solid var(--border-color); height:5px; border-radius:2.5px; overflow:hidden;">
                <div style="width:${progressPercent}%; background:var(--accent-secondary); height:100%;"></div>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" data-action="edit" data-id="${item.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_edit')}</button>
              <button class="btn btn-danger" data-action="delete" data-id="${item.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_delete')}</button>
            </div>
          </td>
        </tr>
      `;
    });
    this.tableBody.innerHTML = html;

    // Single delegated listener
    this.tableBody.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') {
        const cost = costs.find(item => item.id === id);
        if (cost) this.openEditModal(cost);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_item') || 'Are you sure you want to delete this cost item? This will recalculate project EVM metrics.')) {
          store.deleteCostItem(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_cost') } });
        }
      }
    };
  }

  getFormHtml(item = {}) {
    const progressPercent = item.plannedValue > 0 ? Math.round((item.earnedValue / item.plannedValue) * 100) : 0;
    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';
    const tipText = isEn ?
      'EVM: System calculates Earned Value (EV) = Planned Value (PV) x Physical Progress.' :
      '挣值说明：系统会自动计算“挣值 = 计划价值 × 实际完成比例”。';

    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="cost-desc">${t('label_cost_desc')}</label>
          <input type="text" id="cost-desc" name="description" class="form-control" value="${item.description || ''}" placeholder="${t('placeholder_cost_description')}" required>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="cost-pv">${t('label_cost_pv')}</label>
            <input type="number" id="cost-pv" name="plannedValue" min="0" class="form-control" value="${item.plannedValue !== undefined ? item.plannedValue : 0}" required>
          </div>
          <div class="form-group">
            <label for="cost-ac">${t('label_cost_ac')}</label>
            <input type="number" id="cost-ac" name="actualCost" min="0" class="form-control" value="${item.actualCost !== undefined ? item.actualCost : 0}" required>
          </div>
        </div>
        <div class="form-group">
          <label for="cost-progress">${t('label_cost_progress')}</label>
          <input type="range" id="cost-progress" name="progressPercent" min="0" max="100" class="form-control" value="${progressPercent}" style="padding:0;" oninput="this.nextElementSibling.value = this.value + '%'">
          <output style="font-weight:700; font-size:14px; margin-top:4px; display:block; text-align:center;">${progressPercent}%</output>
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            ${tipText}
          </p>
        </div>
      </div>
    `;
  }

  openAddModal() {
    ModalHelper.open(
      t('modal_cost_add'),
      this.getFormHtml(),
      (data) => {
        const pv = Number(data.plannedValue || 0);
        const progress = Number(data.progressPercent || 0);
        const ev = pv * (progress / 100);
        
        store.addCostItem({
          description: data.description,
          plannedValue: pv,
          actualCost: Number(data.actualCost || 0),
          earnedValue: ev
        });
        
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_cost') } });
        return true;
      }
    );
  }

  openEditModal(item) {
    ModalHelper.open(
      `${t('modal_cost_edit')}: ${item.description}`,
      this.getFormHtml(item),
      (data) => {
        const pv = Number(data.plannedValue || 0);
        const progress = Number(data.progressPercent || 0);
        const ev = pv * (progress / 100);

        store.updateCostItem(item.id, {
          description: data.description,
          plannedValue: pv,
          actualCost: Number(data.actualCost || 0),
          earnedValue: ev
        });

        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_cost') } });
        return true;
      }
    );
  }
}

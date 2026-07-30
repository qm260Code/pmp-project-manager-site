import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class StakeholdersComponent {
  constructor(container) {
    this.container = container;
    this.quadrant = document.getElementById('stakeholder-quadrant-container');
    this.tableBody = document.getElementById('stakeholder-table-body');
    this.btnAdd = document.getElementById('btn-add-stakeholder');

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
    const stakeholders = store.state.stakeholders || [];
    this.renderQuadrant(stakeholders);
    this.renderTable(stakeholders);
  }

  renderQuadrant(stakeholders) {
    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';

    const powerText = isEn ? "← Low  Power  High →" : "← 低  权力  高 →";
    const interestText = isEn ? "← Low  Interest  High →" : "← 低  利益  高 →";

    this.quadrant.innerHTML = `
      <div class="ylabel">${powerText}</div>
      
      <!-- Quadrant Q1: High Power, Low Interest (Keep Satisfied) -->
      <div class="quadrant-cell q-keep-satisfied" data-label="${t('sh_grid_satisfied')}" id="quad-keep-satisfied"></div>
      
      <!-- Quadrant Q2: High Power, High Interest (Manage Closely) -->
      <div class="quadrant-cell q-manage-closely" data-label="${t('sh_grid_closely')}" id="quad-manage-closely"></div>
      
      <!-- Quadrant Q3: Low Power, Low Interest (Monitor) -->
      <div class="quadrant-cell q-monitor" data-label="${t('sh_grid_monitor')}" id="quad-monitor"></div>
      
      <!-- Quadrant Q4: Low Power, High Interest (Keep Informed) -->
      <div class="quadrant-cell q-keep-informed" data-label="${t('sh_grid_informed')}" id="quad-keep-informed"></div>
      
      <div class="xlabel">${interestText}</div>
    `;

    const qKeepSatisfied = document.getElementById('quad-keep-satisfied');
    const qManageClosely = document.getElementById('quad-manage-closely');
    const qMonitor = document.getElementById('quad-monitor');
    const qKeepInformed = document.getElementById('quad-keep-informed');

    stakeholders.forEach(sh => {
      const p = Number(sh.power || 3);
      const i = Number(sh.interest || 3);
      
      let targetCell;
      if (p >= 3 && i < 3) targetCell = qKeepSatisfied;
      else if (p >= 3 && i >= 3) targetCell = qManageClosely;
      else if (p < 3 && i < 3) targetCell = qMonitor;
      else targetCell = qKeepInformed;

      const tag = document.createElement('span');
      tag.className = 'stakeholder-tag';
      if (sh.engagement === 'Leading') tag.classList.add('engaged-leading');
      if (sh.engagement === 'Resistant') tag.classList.add('engaged-resistant');
      
      tag.textContent = sh.name;
      tag.title = `${sh.role}\n${t('label_power_short')}: ${sh.power} / ${t('label_interest_short')}: ${sh.interest}\n${t('label_status_short')}: ${t('engagement_' + sh.engagement.toLowerCase()) || sh.engagement}`;
      tag.addEventListener('click', () => this.openEditModal(sh));
      
      targetCell.appendChild(tag);
    });
  }

  renderTable(stakeholders) {
    if (stakeholders.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted);">
            No stakeholders registered. Click upper right to add.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    stakeholders.forEach(sh => {
      let engagementClass = 'badge-planning';

      const engagementClasses = {
        'Unaware': 'badge-initiating',
        'Resistant': 'badge-closing',
        'Neutral': 'badge-planning',
        'Supportive': 'badge-executing',
        'Leading': 'badge-monitoring'
      };

      const cls = engagementClasses[sh.engagement] || 'badge-planning';
      const text = t('engagement_' + sh.engagement.toLowerCase()) || sh.engagement;

      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${sh.name}</div>
          </td>
          <td>
            <div style="font-size: 13px;">${sh.role}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top:2px;">
              ${t('sh_strategy')}: ${sh.strategy || '-'}
            </div>
          </td>
          <td>
            <span class="badge badge-initiating">P: ${sh.power}</span>
            <span class="badge badge-planning">I: ${sh.interest}</span>
          </td>
          <td>
            <span class="badge ${cls}">${text}</span>
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" data-action="edit" data-id="${sh.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_edit')}</button>
              <button class="btn btn-danger" data-action="delete" data-id="${sh.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_delete')}</button>
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
        const sh = stakeholders.find(item => item.id === id);
        if (sh) this.openEditModal(sh);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_item') || 'Are you sure you want to delete this stakeholder registry item?')) {
          store.deleteStakeholder(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_stakeholder') } });
        }
      }
    };
  }

  getFormHtml(sh = {}) {
    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';
    
    const powerLabels = isEn ? { high: 'High', med: 'Med', low: 'Low' } : { high: '高', med: '中', low: '低' };

    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="sh-name">${t('label_sh_name')}</label>
          <input type="text" id="sh-name" name="name" class="form-control" value="${sh.name || ''}" placeholder="${t('placeholder_person_name')}" required>
        </div>
        <div class="form-group">
          <label for="sh-role">${t('label_sh_role')}</label>
          <input type="text" id="sh-role" name="role" class="form-control" value="${sh.role || ''}" placeholder="${t('placeholder_stakeholder_role')}" required>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="sh-power">${t('label_sh_power')}</label>
            <select id="sh-power" name="power" class="form-control">
              ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${Number(sh.power || 3) === n ? 'selected' : ''}>${n} ${n >= 4 ? `(${powerLabels.high})` : n <= 2 ? `(${powerLabels.low})` : `(${powerLabels.med})`}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="sh-interest">${t('label_sh_interest')}</label>
            <select id="sh-interest" name="interest" class="form-control">
              ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${Number(sh.interest || 3) === n ? 'selected' : ''}>${n} ${n >= 4 ? `(${powerLabels.high})` : n <= 2 ? `(${powerLabels.low})` : `(${powerLabels.med})`}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="sh-engagement">${t('label_sh_engagement')}</label>
          <select id="sh-engagement" name="engagement" class="form-control">
            <option value="Unaware" ${sh.engagement === 'Unaware' ? 'selected' : ''}>${t('engagement_unaware')}</option>
            <option value="Resistant" ${sh.engagement === 'Resistant' ? 'selected' : ''}>${t('engagement_resistant')}</option>
            <option value="Neutral" ${sh.engagement === 'Neutral' || !sh.engagement ? 'selected' : ''}>${t('engagement_neutral')}</option>
            <option value="Supportive" ${sh.engagement === 'Supportive' ? 'selected' : ''}>${t('engagement_supportive')}</option>
            <option value="Leading" ${sh.engagement === 'Leading' ? 'selected' : ''}>${t('engagement_leading')}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="sh-strategy">${t('label_sh_strategy')}</label>
          <textarea id="sh-strategy" name="strategy" class="form-control" placeholder="${t('placeholder_engagement_strategy')}">${sh.strategy || ''}</textarea>
        </div>
      </div>
    `;
  }

  openAddModal() {
    ModalHelper.open(
      t('modal_sh_add'),
      this.getFormHtml(),
      (data) => {
        store.addStakeholder(data);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_stakeholder') } });
        return true;
      }
    );
  }

  openEditModal(sh) {
    ModalHelper.open(
      `${t('modal_sh_edit')}: ${sh.name}`,
      this.getFormHtml(sh),
      (data) => {
        store.updateStakeholder(sh.id, data);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_stakeholder') } });
        return true;
      }
    );
  }
}

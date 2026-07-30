import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';
import { getBoschRiskLevel, normalizeRiskType } from '../utils/boschRiskMatrix.js';

export class RisksComponent {
  constructor(container) {
    this.container = container;
    this.heatmap = document.getElementById('risk-heatmap-container');
    this.tableBody = document.getElementById('risk-table-body');
    this.btnAdd = document.getElementById('btn-add-risk');
    this.filterTag = document.getElementById('risk-filter-tag');
    this.activeFilter = null;
    this.btnAdd?.addEventListener('click', () => this.openAddModal());
    this.filterTag?.addEventListener('click', () => { this.activeFilter = null; this.render(); });
    this.render();
    this._unsubscribe = store.subscribe('state-updated', () => this.render());
  }

  get isZh() { return store.state.language === 'zh'; }
  label(en, zh) { return this.isZh ? zh : en; }
  categoryLabel(value) {
    return {
      Technical: this.label('Technical', '技术'),
      Organizational: this.label('Organizational', '组织'),
      External: this.label('External', '外部'),
      'Project Management': this.label('Project management', '项目管理')
    }[value] || value;
  }
  strategyLabel(value) {
    return {
      Avoid: this.label('Avoid', '规避'),
      Mitigate: this.label('Mitigate', '减轻'),
      Transfer: this.label('Transfer', '转移'),
      Exploit: this.label('Exploit', '开拓'),
      Enhance: this.label('Enhance', '提高'),
      Share: this.label('Share', '分享'),
      Accept: this.label('Accept', '接受')
    }[value] || value;
  }
  statusLabel(value) {
    return value === 'Closed' ? this.label('Closed', '已关闭') : this.label('Active', '进行中');
  }
  normalizedType(risk) { return normalizeRiskType(risk); }
  cellLevel(type, probability, impact) {
    return getBoschRiskLevel(type, probability, impact);
  }

  render() {
    const risks = store.state.risks || [];
    this.renderHeatmap(risks);
    this.renderTable(risks);
  }

  renderPane(type, risks) {
    const labels = ['Very high', 'High', 'Medium', 'Low', 'Very low'];
    const zhLabels = ['很高', '高', '中', '低', '很低'];
    const impactLevels = type === 'threat' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
    const impactLabels = type === 'threat' ? labels.slice().reverse() : labels;
    const impactZhLabels = type === 'threat' ? zhLabels.slice().reverse() : zhLabels;
    const title = type === 'threat'
      ? this.label('Negative risks / threats', '负面风险 / 威胁')
      : this.label('Positive risks / opportunities', '正面风险 / 机会');

    let html = '<section class="bosch-pane">';
    html += `<h4>${title}</h4><div class="bosch-grid"><span class="bosch-corner">${this.label('Probability', '可能性')}</span>`;
    impactLevels.forEach((level, index) => {
      html += `<span class="bosch-impact-label">${this.isZh ? impactZhLabels[index] : impactLabels[index]}</span>`;
    });
    for (let probability = 5; probability >= 1; probability--) {
      html += `<span class="bosch-probability-label">${this.isZh ? zhLabels[5 - probability] : labels[5 - probability]}</span>`;
      impactLevels.forEach(impact => {
        const matching = risks.filter(risk => this.normalizedType(risk) === type && Number(risk.probability) === probability && Number(risk.impact) === impact);
        const level = this.cellLevel(type, probability, impact);
        const active = this.activeFilter && this.activeFilter.type === type && this.activeFilter.p === probability && this.activeFilter.i === impact;
        const tickets = matching.map(risk => `<span class="bosch-ticket" title="${risk.description}">${String(risk.id).replace(/^r-/, '')}</span>`).join('');
        html += `<button type="button" class="bosch-cell bosch-${level}${active ? ' active' : ''}" data-type="${type}" data-p="${probability}" data-i="${impact}" title="${this.label('Probability', '可能性')}: ${probability}; ${this.label('Impact', '影响')}: ${impact}">${tickets}</button>`;
      });
    }
    html += `</div><div class="bosch-axis">${this.label('Impact', '影响')}</div></section>`;
    return html;
  }

  renderHeatmap(risks) {
    if (!this.heatmap) return;
    this.heatmap.innerHTML = `<div class="bosch-matrix"><div class="bosch-title">${this.label('Probability & Impact Matrix', '可能性与影响矩阵')}</div><div class="bosch-panes">${this.renderPane('threat', risks)}<div class="bosch-zero">${this.label('Zero impact / probability', '零影响 / 零可能性')}</div>${this.renderPane('opportunity', risks)}</div><p class="bosch-legend"><span class="legend-critical"></span>${this.label('Threat escalation', '威胁升级')} <span class="legend-positive"></span>${this.label('Opportunity value', '机会价值')}</p></div>`;
    this.heatmap.querySelectorAll('.bosch-cell').forEach(cell => cell.addEventListener('click', () => {
      const next = { type: cell.dataset.type, p: Number(cell.dataset.p), i: Number(cell.dataset.i) };
      this.activeFilter = this.activeFilter && JSON.stringify(this.activeFilter) === JSON.stringify(next) ? null : next;
      this.render();
    }));
  }

  renderTable(risks) {
    if (!this.tableBody) return;
    let filtered = risks;
    if (this.activeFilter) {
      const { type, p, i } = this.activeFilter;
      filtered = risks.filter(risk => this.normalizedType(risk) === type && Number(risk.probability) === p && Number(risk.impact) === i);
      if (this.filterTag) {
        this.filterTag.textContent = `${this.label('Filter', '筛选')}: ${type === 'threat' ? this.label('Threat', '威胁') : this.label('Opportunity', '机会')} P${p}/I${i} ×`;
        this.filterTag.style.display = 'inline-flex';
      }
    } else if (this.filterTag) this.filterTag.style.display = 'none';

    if (!filtered.length) {
      this.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">${this.label('No matching risk entries.', '没有匹配的风险条目。')}</td></tr>`;
      return;
    }

    this.tableBody.innerHTML = filtered.map(risk => {
      const type = this.normalizedType(risk);
      const p = Math.max(1, Math.min(5, Number(risk.probability) || 1));
      const i = Math.max(1, Math.min(5, Number(risk.impact) || 1));
      const level = this.cellLevel(type, p, i);
      const category = risk.category === 'PM' ? this.label('Project management', '项目管理') : this.categoryLabel(risk.category);
      const typeLabel = type === 'threat' ? this.label('Threat', '威胁') : this.label('Opportunity', '机会');
      return `<tr><td><strong>${risk.description}</strong><div class="risk-status">${this.statusLabel(risk.status)}</div></td><td><span class="risk-type ${type}">${typeLabel}</span></td><td>${category || '-'}</td><td><strong>${p} × ${i}</strong></td><td><span class="bosch-level ${level}">${this.label(level, { critical:'严重', attention:'关注', neutral:'未设定', strong:'高价值', positive:'积极' }[level])}</span></td><td><strong>${this.strategyLabel(risk.strategy) || '-'}</strong><div class="risk-status">${risk.owner || '-'}</div></td><td><button class="btn btn-secondary" data-action="edit" data-id="${risk.id}">${t('btn_edit')}</button> <button class="btn btn-danger" data-action="delete" data-id="${risk.id}">${t('btn_delete')}</button></td></tr>`;
    }).join('');

    this.tableBody.onclick = event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const risk = risks.find(item => item.id === button.dataset.id);
      if (button.dataset.action === 'edit' && risk) this.openEditModal(risk);
      if (button.dataset.action === 'delete' && risk && confirm(this.label('Delete this risk?', '删除该风险？'))) store.deleteRisk(risk.id);
    };
  }

  getFormHtml(risk = {}) {
    const type = this.normalizedType(risk);
    const select = (value, label) => `<option value="${value}" ${risk.strategy === value ? 'selected' : ''}>${label}</option>`;
    return `<div class="form-stack"><div class="form-group"><label>${this.label('Description', '风险描述')}</label><input class="form-control" name="description" required value="${risk.description || ''}"></div><div class="form-group"><label>${this.label('Type', '类型')}</label><select class="form-control" name="type"><option value="threat" ${type === 'threat' ? 'selected' : ''}>${this.label('Threat', '威胁')}</option><option value="opportunity" ${type === 'opportunity' ? 'selected' : ''}>${this.label('Opportunity', '机会')}</option></select></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label>${this.label('Probability', '可能性')}</label><select class="form-control" name="probability">${[1,2,3,4,5].map(value => `<option value="${value}" ${Number(risk.probability || 3) === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="form-group"><label>${this.label('Impact', '影响')}</label><select class="form-control" name="impact">${[1,2,3,4,5].map(value => `<option value="${value}" ${Number(risk.impact || 3) === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div><div class="form-group"><label>${this.label('Category', '类别')}</label><input class="form-control" name="category" value="${risk.category || 'Technical'}"></div><div class="form-group"><label>${this.label('Response strategy', '应对策略')}</label><select class="form-control" name="strategy">${select('Avoid', this.label('Avoid', '规避'))}${select('Mitigate', this.label('Mitigate', '减轻'))}${select('Transfer', this.label('Transfer', '转移'))}${select('Exploit', this.label('Exploit', '开拓'))}${select('Enhance', this.label('Enhance', '提高'))}${select('Share', this.label('Share', '分享'))}${select('Accept', this.label('Accept', '接受'))}</select></div><div class="form-group"><label>${this.label('Owner', '责任人')}</label><input class="form-control" name="owner" required value="${risk.owner || ''}"></div><div class="form-group"><label>${this.label('Status', '状态')}</label><select class="form-control" name="status"><option value="Active" ${risk.status !== 'Closed' ? 'selected' : ''}>${this.label('Active', '进行中')}</option><option value="Closed" ${risk.status === 'Closed' ? 'selected' : ''}>${this.label('Closed', '关闭')}</option></select></div></div>`;
  }

  openAddModal() { ModalHelper.open(this.label('Add risk or opportunity', '新增风险或机会'), this.getFormHtml(), data => { store.addRisk(data); return true; }); }
  openEditModal(risk) { ModalHelper.open(this.label('Edit risk or opportunity', '编辑风险或机会'), this.getFormHtml(risk), data => { store.updateRisk(risk.id, data); return true; }); }
}

import { store } from '../store.js';
import { ModalHelper } from '../app.js';

export class QualityComponent {
  constructor() {
    this.body = document.getElementById('quality-table-body');
    document.getElementById('btn-add-quality-measurement')?.addEventListener('click', () => this.openModal());
    this.render();
    this.unsubscribe = store.subscribe('state-updated', () => this.render());
  }
  get zh() { return store.state.language === 'zh'; }
  text(en, zh) { return this.zh ? zh : en; }
  render() {
    const records = store.state.qualityMeasurements || [];
    if (!this.body) return;
    this.body.innerHTML = records.length ? records.map(item => {
      const out = Number(item.measurement) > Number(item.ucl) || Number(item.measurement) < Number(item.lcl);
      return `<tr><td><strong>${item.sampleId || '-'}</strong></td><td>${item.metric || '-'}</td><td><strong class="${out ? 'quality-outlier' : ''}">${item.measurement}</strong></td><td>${item.target} [${item.lcl}, ${item.ucl}]</td><td>${item.acceptanceCriteria || '-'}</td><td>${item.owner || '-'}</td><td><button class="btn btn-secondary" data-action="edit" data-id="${item.id}">${this.text('Edit','编辑')}</button> <button class="btn btn-danger" data-action="delete" data-id="${item.id}">${this.text('Delete','删除')}</button></td></tr>`;
    }).join('') : `<tr><td colspan="7" class="empty-cell">${this.text('No quality measurements yet.', '暂无质量测量数据。')}</td></tr>`;
    this.body.onclick = event => { const btn = event.target.closest('[data-action]'); if (!btn) return; const item = records.find(entry => entry.id === btn.dataset.id); if (btn.dataset.action === 'edit' && item) this.openModal(item); if (btn.dataset.action === 'delete' && item) store.deleteQualityMeasurement(item.id); };
  }
  form(item = {}) {
    const input = (name, label, value = '', type = 'text') => `<div class="form-group"><label>${label}</label><input class="form-control" type="${type}" name="${name}" value="${value}" required></div>`;
    return `<div class="form-stack"><div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">${input('sampleId', this.text('Sample ID','样本编号'), item.sampleId)}${input('metric', this.text('Quality metric','质量指标'), item.metric)}</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${input('measurement', this.text('Measured','实测值'), item.measurement || 0, 'number')}${input('target', this.text('Target','目标值'), item.target || 0, 'number')}${input('lcl', this.text('LCL','下控制限'), item.lcl || 0, 'number')}${input('ucl', this.text('UCL','上控制限'), item.ucl || 0, 'number')}</div>${input('acceptanceCriteria', this.text('Acceptance criteria','验收标准'), item.acceptanceCriteria)}${input('verificationMethod', this.text('Verification method','验证方法'), item.verificationMethod)}${input('owner', this.text('Quality owner','质量责任人'), item.owner)}</div>`;
  }
  openModal(item) { ModalHelper.open(this.text(item ? 'Edit quality measurement' : 'Add quality measurement', item ? '编辑质量测量' : '新增质量测量'), this.form(item), data => { item ? store.updateQualityMeasurement(item.id, data) : store.addQualityMeasurement(data); return true; }); }
}

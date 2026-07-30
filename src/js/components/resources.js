import { store } from '../store.js';
import { ModalHelper } from '../app.js';

export class ResourcesComponent {
  constructor() {
    this.body = document.getElementById('resource-table-body');
    this.kpis = document.getElementById('resource-kpi-container');
    document.getElementById('btn-add-resource')?.addEventListener('click', () => this.openModal());
    this.render();
    this.unsubscribe = store.subscribe('state-updated', () => this.render());
  }
  get zh() { return store.state.language === 'zh'; }
  text(en, zh) { return this.zh ? zh : en; }
  resourceType(value) {
    const labels = {
      Labor: this.text('Labor', '人力'),
      Material: this.text('Material', '材料'),
      Equipment: this.text('Equipment', '设备')
    };
    return labels[value] || value || labels.Labor;
  }
  render() {
    const records = store.state.resources || [];
    const allocated = records.reduce((sum, item) => sum + (Number(item.allocatedHours) || 0), 0);
    const capacity = records.reduce((sum, item) => sum + (Number(item.capacityHours) || 0), 0);
    if (this.kpis) this.kpis.innerHTML = `<div class="resource-kpi"><span>${this.text('Assigned hours', '已分配工时')}</span><strong>${allocated}</strong></div><div class="resource-kpi"><span>${this.text('Available capacity', '可用产能')}</span><strong>${capacity}</strong></div><div class="resource-kpi"><span>${this.text('Utilization', '资源利用率')}</span><strong>${capacity ? Math.round(allocated / capacity * 100) : 0}%</strong></div>`;
    if (!this.body) return;
    this.body.innerHTML = records.length ? records.map(item => `<tr><td><strong>${item.name}</strong><div class="risk-status">${this.resourceType(item.type)}</div></td><td>${item.role || '-'}</td><td>${item.period || '-'}</td><td>${item.allocatedHours || 0} / ${item.capacityHours || 0}</td><td>${item.workPackage || '-'}</td><td>${item.owner || '-'}</td><td><button class="btn btn-secondary" data-action="edit" data-id="${item.id}">${this.text('Edit','编辑')}</button> <button class="btn btn-danger" data-action="delete" data-id="${item.id}">${this.text('Delete','删除')}</button></td></tr>`).join('') : `<tr><td colspan="7" class="empty-cell">${this.text('No resource assignments yet.', '暂无资源分配。')}</td></tr>`;
    this.body.onclick = event => { const btn = event.target.closest('[data-action]'); if (!btn) return; const item = records.find(entry => entry.id === btn.dataset.id); if (btn.dataset.action === 'edit' && item) this.openModal(item); if (btn.dataset.action === 'delete' && item) store.deleteResource(item.id); };
  }
  form(item = {}) {
    const input = (name, label, value = '', type = 'text') => `<div class="form-group"><label>${label}</label><input class="form-control" type="${type}" name="${name}" value="${value}" required></div>`;
    return `<div class="form-stack">${input('name', this.text('Resource name','资源名称'), item.name)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label>${this.text('Resource type','资源类型')}</label><select class="form-control" name="type"><option value="Labor" ${item.type === 'Labor' ? 'selected' : ''}>${this.resourceType('Labor')}</option><option value="Material" ${item.type === 'Material' ? 'selected' : ''}>${this.resourceType('Material')}</option><option value="Equipment" ${item.type === 'Equipment' ? 'selected' : ''}>${this.resourceType('Equipment')}</option></select></div>${input('role', this.text('Role / pool','角色 / 资源池'), item.role)}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">${input('period', this.text('Period','期间'), item.period)}${input('allocatedHours', this.text('Assigned hours','分配工时'), item.allocatedHours || 0, 'number')}${input('capacityHours', this.text('Capacity hours','可用工时'), item.capacityHours || 0, 'number')}</div>${input('workPackage', this.text('WBS work package','工作分解结构工作包'), item.workPackage)}${input('owner', this.text('Resource owner','资源责任人'), item.owner)}</div>`;
  }
  openModal(item) { ModalHelper.open(this.text(item ? 'Edit resource assignment' : 'Add resource assignment', item ? '编辑资源分配' : '新增资源分配'), this.form(item), data => { item ? store.updateResource(item.id, data) : store.addResource(data); return true; }); }
}

import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class RequirementsComponent {
  constructor(container) {
    this.container = container;
    this.kpiContainer = document.getElementById('requirements-kpi-container');
    this.tableBody = document.getElementById('requirements-table-body');
    this.btnAdd = document.getElementById('btn-add-requirement');

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
    const reqs = store.state.requirements || [];
    this.renderKPIs(reqs);
    this.renderTable(reqs);
  }

  renderKPIs(reqs) {
    const total = reqs.length;
    const accepted = reqs.filter(r => r.status === 'Accepted' || r.status === 'Verified').length;
    const inProgress = reqs.filter(r => r.status === 'In Progress').length;
    const draft = reqs.filter(r => r.status === 'Draft').length;

    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';

    const descTotal = isEn ? 'All items in requirements database' : '需求库中录入的所有条目';
    const descAccepted = isEn ? 'UAT verified or accepted requirements' : '通过验收或测试验证的需求';
    const descProgress = isEn ? 'Under active implementation / development' : '当前正处于研发或配置阶段';
    const descDraft = isEn ? 'Newly submitted items for analysis' : '新录入待分析评估的需求';

    this.kpiContainer.innerHTML = `
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--accent-secondary);">
        <div class="kpi-label">${t('req_kpi_total')}</div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descTotal}</div>
      </div>
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--status-success);">
        <div class="kpi-label">${t('req_kpi_accepted')}</div>
        <div class="kpi-value" style="color: var(--status-success);">${accepted}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descAccepted}</div>
      </div>
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--status-warning);">
        <div class="kpi-label">${t('req_kpi_progress')}</div>
        <div class="kpi-value" style="color: var(--status-warning);">${inProgress}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descProgress}</div>
      </div>
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--pmp-planning);">
        <div class="kpi-label">${t('req_kpi_draft')}</div>
        <div class="kpi-value" style="color: var(--pmp-planning);">${draft}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descDraft}</div>
      </div>
    `;
  }

  renderTable(reqs) {
    if (reqs.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">
            ${t('btn_empty_reqs')}
          </td>
        </tr>
      `;
      return;
    }

    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';

    let html = '';
    reqs.forEach((req, index) => {
      const reqNo = `REQ-${String(index + 1).padStart(3, '0')}`;
      
      let statusClass = 'badge-planning'; 
      if (req.status === 'Accepted') statusClass = 'badge-executing';
      else if (req.status === 'Verified') statusClass = 'badge-initiating';
      else if (req.status === 'In Progress') statusClass = 'badge-monitoring';
      else if (req.status === 'Deferred') statusClass = 'badge-closing';
      const statusText = t(`status_${String(req.status || 'Draft').toLowerCase().replaceAll(' ', '_')}`);

      let priorityStyle = 'background: #f1f3f5; color: #495057;'; 
      if (req.priority === 'High') priorityStyle = 'background: #fff5f5; color: var(--status-danger); border: 1px solid rgba(220,38,38,0.2);';
      else if (req.priority === 'Medium') priorityStyle = 'background: #fff9db; color: #d97706; border: 1px solid rgba(217,119,6,0.2);';

      const catMap = {
        Functional: t('req_cat_functional'),
        NonFunctional: t('req_cat_nonfunctional'),
        Technical: t('req_cat_technical'),
        Business: t('req_cat_business')
      };
      const categoryLabel = catMap[req.category] || req.category || '-';
      const noDescText = isEn ? 'No description' : '无说明';
      const unassignedText = isEn ? 'Unassigned' : '未分配';
      const unscheduledText = isEn ? 'Unscheduled' : '未排期';
      const unspecifiedText = isEn ? 'Unspecified' : '未指定';

      html += `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${reqNo}</div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top:2px; font-weight:600;">${req.name}</div>
          </td>
          <td>
            <div style="font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${req.description}">${req.description || noDescText}</div>
          </td>
          <td>
            <span style="font-size: 12px;">${categoryLabel}</span>
          </td>
          <td>
            <span class="badge" style="${priorityStyle}">${req.priority === 'High' ? t('act_priority_high') : req.priority === 'Medium' ? t('act_priority_med') : t('act_priority_low')}</span>
          </td>
          <td>
            <span style="font-size: 12px; font-weight: 600;">${req.owner || unassignedText}</span>
          </td>
          <td>
            <span style="font-size: 12px; color: var(--text-secondary);">${req.targetRelease || unscheduledText}</span>
          </td>
          <td>
            <div style="font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${req.verificationMethod || ''}">${req.verificationMethod || unspecifiedText}</div>
          </td>
          <td>
            <span class="badge ${statusClass}">${statusText}</span>
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" data-action="edit" data-id="${req.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_edit')}</button>
              <button class="btn btn-danger" data-action="delete" data-id="${req.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_delete')}</button>
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
        const req = reqs.find(item => item.id === id);
        if (req) this.openEditModal(req);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_item') || 'Are you sure you want to delete this requirement item?')) {
          store.deleteRequirement(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_requirement') } });
        }
      }
    };
  }

  getFormHtml(req = {}) {
    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="req-name">${t('label_req_name')}</label>
          <input type="text" id="req-name" name="name" class="form-control" value="${req.name || ''}" placeholder="${t('placeholder_requirement_name')}" required>
        </div>
        
        <div class="form-group">
          <label for="req-desc">${t('label_req_desc')}</label>
          <textarea id="req-desc" name="description" class="form-control" style="height:60px;" placeholder="${t('placeholder_requirement_description')}" required>${req.description || ''}</textarea>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="req-cat">${t('label_req_cat')}</label>
            <select id="req-cat" name="category" class="form-control">
              <option value="Functional" ${req.category === 'Functional' || !req.category ? 'selected' : ''}>${t('req_cat_functional')}</option>
              <option value="NonFunctional" ${req.category === 'NonFunctional' ? 'selected' : ''}>${t('req_cat_nonfunctional')}</option>
              <option value="Technical" ${req.category === 'Technical' ? 'selected' : ''}>${t('req_cat_technical')}</option>
              <option value="Business" ${req.category === 'Business' ? 'selected' : ''}>${t('req_cat_business')}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="req-priority">${t('label_req_priority')}</label>
            <select id="req-priority" name="priority" class="form-control">
              <option value="High" ${req.priority === 'High' ? 'selected' : ''}>${t('act_priority_high')}</option>
              <option value="Medium" ${req.priority === 'Medium' || !req.priority ? 'selected' : ''}>${t('act_priority_med')}</option>
              <option value="Low" ${req.priority === 'Low' ? 'selected' : ''}>${t('act_priority_low')}</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="req-owner">${t('label_req_owner')}</label>
            <input type="text" id="req-owner" name="owner" class="form-control" value="${req.owner || ''}" placeholder="${t('placeholder_person_name')}" required>
          </div>
          <div class="form-group">
            <label for="req-release">${t('label_req_release')}</label>
            <input type="text" id="req-release" name="targetRelease" class="form-control" value="${req.targetRelease || ''}" placeholder="${t('placeholder_target_release')}" required>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-top:1px dashed var(--border-color); padding-top:12px; margin-top:4px;">
          <div class="form-group">
            <label for="req-status">${t('label_req_status')}</label>
            <select id="req-status" name="status" class="form-control">
              <option value="Draft" ${req.status === 'Draft' ? 'selected' : ''}>${t('status_draft')}</option>
              <option value="In Progress" ${req.status === 'In Progress' || !req.status ? 'selected' : ''}>${t('status_in_progress')}</option>
              <option value="Verified" ${req.status === 'Verified' ? 'selected' : ''}>${t('status_verified')}</option>
              <option value="Accepted" ${req.status === 'Accepted' ? 'selected' : ''}>${t('status_accepted')}</option>
              <option value="Deferred" ${req.status === 'Deferred' ? 'selected' : ''}>${t('status_deferred')}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="req-verify">${t('label_req_verify')}</label>
            <input type="text" id="req-verify" name="verificationMethod" class="form-control" value="${req.verificationMethod || ''}" placeholder="${t('placeholder_verification_method')}" required>
          </div>
        </div>
      </div>
    `;
  }

  openAddModal() {
    ModalHelper.open(
      t('modal_req_add'),
      this.getFormHtml(),
      (data) => {
        store.addRequirement({
          name: data.name,
          description: data.description,
          category: data.category,
          priority: data.priority,
          owner: data.owner,
          targetRelease: data.targetRelease,
          status: data.status,
          verificationMethod: data.verificationMethod
        });
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_requirement') } });
        return true;
      }
    );
  }

  openEditModal(req) {
    ModalHelper.open(
      `${t('modal_req_edit')}: ${req.name}`,
      this.getFormHtml(req),
      (data) => {
        store.updateRequirement(req.id, {
          name: data.name,
          description: data.description,
          category: data.category,
          priority: data.priority,
          owner: data.owner,
          targetRelease: data.targetRelease,
          status: data.status,
          verificationMethod: data.verificationMethod
        });
        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_requirement') } });
        return true;
      }
    );
  }
}

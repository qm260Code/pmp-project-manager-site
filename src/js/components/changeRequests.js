import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class ChangeRequestsComponent {
  constructor(container) {
    this.container = container;
    this.kpiContainer = document.getElementById('change-requests-kpi-container');
    this.tableBody = document.getElementById('change-requests-table-body');
    this.btnAdd = document.getElementById('btn-add-change-request');

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
    const crs = store.state.changeRequests || [];
    this.renderKPIs(crs);
    this.renderTable(crs);
  }

  renderKPIs(crs) {
    const total = crs.length;
    const approved = crs.filter(c => c.status === 'Approved').length;
    const pending = crs.filter(c => c.status === 'Pending').length;
    const closed = crs.filter(c => c.status === 'Closed' || c.status === 'Rejected').length;

    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';

    const descTotal = isEn ? 'All submitted change logs' : '已提交的所有变更单';
    const descApproved = isEn ? 'CCB approved & executed' : '已通过变更控制委员会评审并执行';
    const descPending = isEn ? 'Awaiting CCB review meeting' : '等待变更控制委员会会议评审决定';
    const descClosed = isEn ? 'Archived or rejected requests' : '已归档或被驳回的变更';

    this.kpiContainer.innerHTML = `
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--accent-secondary);">
        <div class="kpi-label">${t('cr_kpi_total')}</div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descTotal}</div>
      </div>
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--status-success);">
        <div class="kpi-label">${t('cr_kpi_approved')}</div>
        <div class="kpi-value" style="color: var(--status-success);">${approved}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descApproved}</div>
      </div>
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--status-warning);">
        <div class="kpi-label">${t('cr_kpi_pending')}</div>
        <div class="kpi-value" style="color: var(--status-warning);">${pending}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descPending}</div>
      </div>
      <div class="glass-panel kpi-card" style="border-left: 4px solid var(--text-muted);">
        <div class="kpi-label">${t('cr_kpi_closed')}</div>
        <div class="kpi-value">${closed}</div>
        <div class="kpi-subtext" style="font-size:11px; color:var(--text-muted); margin-top:4px;">${descClosed}</div>
      </div>
    `;
  }

  renderTable(crs) {
    if (crs.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">
            ${t('btn_empty_crs')}
          </td>
        </tr>
      `;
      return;
    }

    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';

    let html = '';
    crs.forEach((cr, index) => {
      const crNo = `CR-${String(index + 1).padStart(3, '0')}`;
      
      let statusClass = 'badge-planning'; 
      if (cr.status === 'Approved') statusClass = 'badge-executing';
      else if (cr.status === 'Pending') statusClass = 'badge-monitoring';
      else if (cr.status === 'Rejected') statusClass = 'badge-closing';
      else if (cr.status === 'Closed') statusClass = 'badge-initiating';
      const statusText = t(`status_${String(cr.status || 'Draft').toLowerCase().replaceAll(' ', '_')}`);

      const catMap = {
        Scope: t('cr_cat_scope'),
        Schedule: t('cr_cat_schedule'),
        Cost: t('cr_cat_cost'),
        Quality: t('cr_cat_quality'),
        Other: t('cr_cat_other')
      };
      const categoryLabel = catMap[cr.category] || cr.category || '-';
      const noImpactText = isEn ? 'No impact assessment' : '暂无影响评估';
      const noCcbNotesText = isEn ? 'No CCB meeting notes' : '暂无会议纪要';

      html += `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${crNo}</div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top:2px;">${cr.description}</div>
          </td>
          <td>
            <span style="font-size: 12px; font-weight: 500;">${categoryLabel}</span>
          </td>
          <td>
            <div style="font-size: 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cr.impactAnalysis}">${cr.impactAnalysis || noImpactText}</div>
          </td>
          <td>
            <div style="font-size: 12px; font-weight:600;">${cr.requester || '-'}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top:1px;">${cr.dateRaised}</div>
          </td>
          <td>
            <div style="font-size: 12px; font-weight:600;">${isEn ? 'CCB Decider' : '审批'}: ${cr.approver || '-'}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top:1px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cr.ccbNotes || ''}">${cr.ccbNotes || noCcbNotesText}</div>
          </td>
          <td>
            <span class="badge ${statusClass}">${statusText}</span>
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" data-action="edit" data-id="${cr.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_edit')}</button>
              <button class="btn btn-danger" data-action="delete" data-id="${cr.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_delete')}</button>
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
        const cr = crs.find(item => item.id === id);
        if (cr) this.openEditModal(cr);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_item') || 'Are you sure you want to delete this change request log? This cannot be undone.')) {
          store.deleteChangeRequest(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_change_request') } });
        }
      }
    };
  }

  getFormHtml(cr = {}) {
    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="cr-desc">${t('label_cr_desc')}</label>
          <input type="text" id="cr-desc" name="description" class="form-control" value="${cr.description || ''}" placeholder="${t('placeholder_change_description')}" required>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="cr-cat">${t('label_cr_cat')}</label>
            <select id="cr-cat" name="category" class="form-control">
              <option value="Scope" ${cr.category === 'Scope' ? 'selected' : ''}>${t('cr_cat_scope')}</option>
              <option value="Schedule" ${cr.category === 'Schedule' ? 'selected' : ''}>${t('cr_cat_schedule')}</option>
              <option value="Cost" ${cr.category === 'Cost' ? 'selected' : ''}>${t('cr_cat_cost')}</option>
              <option value="Quality" ${cr.category === 'Quality' ? 'selected' : ''}>${t('cr_cat_quality')}</option>
              <option value="Other" ${cr.category === 'Other' || !cr.category ? 'selected' : ''}>${t('cr_cat_other')}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cr-requester">${t('label_cr_requester')}</label>
            <input type="text" id="cr-requester" name="requester" class="form-control" value="${cr.requester || ''}" placeholder="${t('placeholder_person_name')}" required>
          </div>
        </div>

        <div class="form-group">
          <label for="cr-impact">${t('label_cr_impact')}</label>
          <textarea id="cr-impact" name="impactAnalysis" class="form-control" style="height:70px;" placeholder="${t('placeholder_impact_analysis')}" required>${cr.impactAnalysis || ''}</textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-top:1px dashed var(--border-color); padding-top:12px; margin-top:4px;">
          <div class="form-group">
            <label for="cr-status">${t('label_cr_status')}</label>
            <select id="cr-status" name="status" class="form-control">
              <option value="Draft" ${cr.status === 'Draft' ? 'selected' : ''}>${t('status_draft')}</option>
              <option value="Pending" ${cr.status === 'Pending' || !cr.status ? 'selected' : ''}>${t('status_pending')}</option>
              <option value="Approved" ${cr.status === 'Approved' ? 'selected' : ''}>${t('status_approved')}</option>
              <option value="Rejected" ${cr.status === 'Rejected' ? 'selected' : ''}>${t('status_rejected')}</option>
              <option value="Closed" ${cr.status === 'Closed' ? 'selected' : ''}>${t('status_closed')}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cr-approver">${t('label_cr_approver')}</label>
            <input type="text" id="cr-approver" name="approver" class="form-control" value="${cr.approver || ''}" placeholder="${t('placeholder_ccb_chair')}">
          </div>
        </div>

        <div class="form-group">
          <label for="cr-notes">${t('label_cr_notes')}</label>
          <textarea id="cr-notes" name="ccbNotes" class="form-control" style="height:70px;" placeholder="${t('placeholder_ccb_notes')}">${cr.ccbNotes || ''}</textarea>
        </div>
      </div>
    `;
  }

  openAddModal() {
    ModalHelper.open(
      t('modal_cr_add'),
      this.getFormHtml(),
      (data) => {
        store.addChangeRequest({
          description: data.description,
          category: data.category,
          impactAnalysis: data.impactAnalysis,
          requester: data.requester,
          status: data.status,
          approver: data.approver,
          ccbNotes: data.ccbNotes,
          dateRaised: new Date().toISOString().split('T')[0]
        });
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_change_request') } });
        return true;
      }
    );
  }

  openEditModal(cr) {
    ModalHelper.open(
      `${t('modal_cr_edit')}: ${cr.description}`,
      this.getFormHtml(cr),
      (data) => {
        store.updateChangeRequest(cr.id, {
          description: data.description,
          category: data.category,
          impactAnalysis: data.impactAnalysis,
          requester: data.requester,
          status: data.status,
          approver: data.approver,
          ccbNotes: data.ccbNotes
        });
        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_change_request') } });
        return true;
      }
    );
  }
}

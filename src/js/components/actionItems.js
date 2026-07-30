import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class ActionItemsComponent {
  constructor(container) {
    this.container = container;
    this.tableBody = document.getElementById('action-items-table-body');
    this.btnAdd = document.getElementById('btn-add-action-item');

    this.initEvents();
    this.render();

    this._unsubscribe = store.subscribe('state-updated', () => {
      this.render();
    });
  }

  initEvents() {
    if (this.btnAdd) {
      this.btnAdd.addEventListener('click', () => this.openAddModal());
    }
  }

  render() {
    const actionItems = store.state.actionItems || [];
    this.renderTable(actionItems);
  }

  renderTable(actionItems) {
    if (!this.tableBody) return;

    if (actionItems.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px 0;">
            No action items logged. Click upper right to add.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    actionItems.forEach(item => {
      let priorityClass = 'badge-executing'; 
      let priorityLabel = t('act_priority_low');
      if (item.priority === 'High') {
        priorityClass = 'badge-closing'; 
        priorityLabel = t('act_priority_high');
      } else if (item.priority === 'Medium') {
        priorityClass = 'badge-monitoring'; 
        priorityLabel = t('act_priority_med');
      } else if (item.priority === 'Low') {
        priorityClass = 'badge-executing'; 
        priorityLabel = t('act_priority_low');
      }

      const isCompleted = item.status === 'Completed';
      const statusClass = isCompleted ? 'badge-executing' : 'badge-planning';
      const statusLabel = isCompleted ? t('act_status_completed') : t('act_status_pending');

      const today = new Date().toISOString().split('T')[0];
      const isOverdue = !isCompleted && item.targetDate < today;
      const dateStyle = isOverdue ? 'color: var(--status-danger); font-weight: 600;' : '';

      html += `
        <tr>
          <td>
            <div style="font-weight: 500; color: var(--text-primary); max-width: 280px; white-space: normal; line-height: 1.4;">
              ${this.escapeHTML(item.content)}
            </div>
          </td>
          <td>
            <div style="font-size: 12px; color: var(--text-secondary);">${item.triggerDate}</div>
          </td>
          <td>
            <div style="font-weight: 500; font-size: 13px;">${this.escapeHTML(item.owner)}</div>
          </td>
          <td>
            <div style="font-size: 12px; ${dateStyle}" title="${isOverdue ? t('title_overdue') : ''}">
              ${item.targetDate} ${isOverdue ? ' ⚠️' : ''}
            </div>
          </td>
          <td>
            <div style="font-size: 13px; font-weight: 600; color: ${item.delayDays > 0 ? 'var(--status-warning)' : 'var(--text-muted)'};">
              ${item.delayDays}${t('act_delay_unit')}
            </div>
          </td>
          <td>
            <span class="badge ${priorityClass}">${priorityLabel}</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="action-item-toggle" data-id="${item.id}" ${isCompleted ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px;" title="${t('title_toggle_status')}" />
              <span class="badge ${statusClass}">${statusLabel}</span>
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

    // Bind quick status toggle checkbox
    this.tableBody.querySelectorAll('.action-item-toggle').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const id = checkbox.getAttribute('data-id');
        const newStatus = checkbox.checked ? 'Completed' : 'Pending';
        store.updateActionItem(id, { status: newStatus });
        store.publish('notify', {
          type: 'success',
          messageKey: 'msg_status_updated',
          params: { status: newStatus === 'Completed' ? t('act_status_completed') : t('act_status_pending') }
        });
      });
    });

    // Single delegated listener for edit/delete buttons
    this.tableBody.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') {
        const item = actionItems.find(x => x.id === id);
        if (item) this.openEditModal(item);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_item') || 'Are you sure you want to delete this action item?')) {
          store.deleteActionItem(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_action') } });
        }
      }
    };
  }

  getFormHtml(item = null) {
    const team = store.state.team || [];
    const lang = store.state.language || 'en';
    const isEn = lang !== 'zh';
    
    let ownerFieldHtml = '';
    if (team.length > 0) {
      ownerFieldHtml = `
        <select id="item-owner" name="owner" class="form-control" required>
          ${team.map(m => `
            <option value="${m.name}" ${item && item.owner === m.name ? 'selected' : ''}>
              ${this.escapeHTML(m.name)} (${this.escapeHTML(m.role)})
            </option>
          `).join('')}
        </select>
      `;
    } else {
      const tipText = isEn ?
        'Tip: Add team members in the "Team Structure" view first to select them here.' :
        '💡 提示：在“团队组织架构”中添加成员后，此处可直接下拉选择。';

      ownerFieldHtml = `
        <input type="text" id="item-owner" name="owner" class="form-control" 
               value="${item ? this.escapeHTML(item.owner) : ''}" 
               placeholder="${t('placeholder_person_name')}" required>
        <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">${tipText}</p>
      `;
    }

    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="item-content">${t('label_act_content')}</label>
          <textarea id="item-content" name="content" class="form-control" style="height:60px;" placeholder="${t('placeholder_action_content')}" required>${item ? item.content : ''}</textarea>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="item-trigger-date">${t('label_act_trigger')}</label>
            <input type="date" id="item-trigger-date" name="triggerDate" class="form-control" value="${item ? item.triggerDate : new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="form-group">
            <label for="item-target-date">${t('label_act_target')}</label>
            <input type="date" id="item-target-date" name="targetDate" class="form-control" value="${item ? item.targetDate : ''}" required>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="item-owner">${t('label_act_owner')}</label>
            ${ownerFieldHtml}
          </div>
          <div class="form-group">
            <label for="item-delay-days">${t('label_member_reports') === 'Reports To (Supervisor):' ? 'Delay Days:' : '延迟天数:'}</label>
            <input type="number" id="item-delay-days" name="delayDays" min="0" class="form-control" value="${item ? item.delayDays : 0}" required>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="item-priority">${t('label_act_priority')}</label>
            <select id="item-priority" name="priority" class="form-control">
              <option value="High" ${item && item.priority === 'High' ? 'selected' : ''}>${t('act_priority_high')}</option>
              <option value="Medium" ${item && item.priority === 'Medium' ? 'selected' : ''}>${t('act_priority_med')}</option>
              <option value="Low" ${item && item.priority === 'Low' || !item ? 'selected' : ''}>${t('act_priority_low')}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="item-status">${t('label_act_status')}</label>
            <select id="item-status" name="status" class="form-control">
              <option value="Pending" ${item && item.status === 'Pending' || !item ? 'selected' : ''}>${t('act_status_pending')}</option>
              <option value="Completed" ${item && item.status === 'Completed' ? 'selected' : ''}>${t('act_status_completed')}</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  openAddModal() {
    ModalHelper.open(
      t('modal_act_add'),
      this.getFormHtml(null),
      (data) => {
        store.addActionItem({
          content: data.content,
          triggerDate: data.triggerDate,
          owner: data.owner,
          targetDate: data.targetDate,
          delayDays: Number(data.delayDays || 0),
          priority: data.priority,
          status: data.status
        });
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_action') } });
        return true;
      }
    );
  }

  openEditModal(item) {
    ModalHelper.open(
      t('modal_act_edit'),
      this.getFormHtml(item),
      (data) => {
        store.updateActionItem(item.id, {
          content: data.content,
          triggerDate: data.triggerDate,
          owner: data.owner,
          targetDate: data.targetDate,
          delayDays: Number(data.delayDays || 0),
          priority: data.priority,
          status: data.status
        });
        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_action') } });
        return true;
      }
    );
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
}

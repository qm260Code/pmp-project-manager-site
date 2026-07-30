import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class RaciComponent {
  constructor(container) {
    this.container = document.getElementById('raci-matrix-table');
    this.btnConfigRoles = document.getElementById('btn-edit-raci-roles');
    this.btnAddActivity = document.getElementById('btn-add-raci-activity');

    this.initEvents();
    this.render();

    this._unsubscribe = store.subscribe('state-updated', () => {
      this.render();
    });
  }

  initEvents() {
    this.btnConfigRoles.addEventListener('click', () => this.openRolesModal());
    this.btnAddActivity.addEventListener('click', () => this.openActivityModal());
  }

  render() {
    const lang = store.state.language || 'en';
    const raci = store.state.raci;
    const roles = raci.roles || [];
    const matrix = raci.matrix || [];
    
    const optLabels = lang === 'zh' ? 
      { R: 'R (负责)', A: 'A (批准)', C: 'C (咨询)', I: 'I (知会)' } :
      { R: 'R (Responsible)', A: 'A (Accountable)', C: 'C (Consulted)', I: 'I (Informed)' };

    if (roles.length === 0) {
      this.container.innerHTML = `
        <thead>
          <tr><th>${t('raci_no_roles')}</th></tr>
        </thead>
        <tbody>
          <tr><td style="color:var(--text-muted); text-align:center;">${t('raci_configure_hint')}</td></tr>
        </tbody>
      `;
      return;
    }

    // Build Table Header with min-width constraints for scrolling
    let html = `
      <thead>
        <tr>
          <th style="min-width: 220px; font-family:var(--font-primary);">${t('raci_activity_name')}</th>
          ${roles.map(r => `<th style="text-align:center; min-width: 140px; font-family:var(--font-primary);">${r}</th>`).join('')}
          <th style="width:80px; text-align:center; min-width: 80px; font-family:var(--font-primary);">${t('raci_action')}</th>
        </tr>
      </thead>
      <tbody>
    `;

    if (matrix.length === 0) {
      html += `
        <tr>
          <td colspan="${roles.length + 2}" style="text-align:center; color:var(--text-muted); padding:20px;">
            ${t('btn_empty_raci')}
          </td>
        </tr>
      `;
    } else {
      matrix.forEach((row, rowIndex) => {
        html += `
          <tr>
            <td style="font-weight: 600; color: var(--text-primary); min-width: 220px;">${row.activity}</td>
            ${roles.map(role => {
              const val = row.roles[role] || '';
              
              // Custom coloring classes based on R, A, C, I
              let valClass = '';
              if (val === 'R') valClass = 'raci-r';
              else if (val === 'A') valClass = 'raci-a';
              else if (val === 'C') valClass = 'raci-c';
              else if (val === 'I') valClass = 'raci-i';

              return `
                <td style="text-align:center; min-width: 140px;">
                  <select class="raci-cell-select ${valClass}" 
                          data-row="${rowIndex}" 
                          data-role="${role}" 
                          style="text-align-last: center;">
                    <option value="" ${val === '' ? 'selected' : ''}>-</option>
                    <option value="R" class="raci-r" ${val === 'R' ? 'selected' : ''}>${optLabels.R}</option>
                    <option value="A" class="raci-a" ${val === 'A' ? 'selected' : ''}>${optLabels.A}</option>
                    <option value="C" class="raci-c" ${val === 'C' ? 'selected' : ''}>${optLabels.C}</option>
                    <option value="I" class="raci-i" ${val === 'I' ? 'selected' : ''}>${optLabels.I}</option>
                  </select>
                </td>
              `;
            }).join('')}
            <td style="text-align:center; min-width: 80px;">
              <button class="btn btn-danger btn-delete-raci" data-index="${rowIndex}" style="padding: 2px 6px; font-size:11px;">
                &times; ${t('btn_delete')}
              </button>
            </td>
          </tr>
        `;
      });
    }

    html += `</tbody>`;
    this.container.innerHTML = html;
    
    this.bindCellEvents();
  }

  bindCellEvents() {
    // Listen to select drops changes
    const selects = this.container.querySelectorAll('.raci-cell-select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        const rowIndex = Number(select.getAttribute('data-row'));
        const roleName = select.getAttribute('data-role');
        const val = select.value;
        
        // Update central store
        store.updateRaci(rowIndex, roleName, val);
      });
    });

    // Listen to delete activity buttons
    const deleteBtns = this.container.querySelectorAll('.btn-delete-raci');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = Number(btn.getAttribute('data-index'));
        if (confirm(t('raci_delete_confirm') || 'Are you sure you want to delete this activity assignment?')) {
          store.deleteRaciActivity(index);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_activity') } });
        }
      });
    });
  }

  openRolesModal() {
    const roles = store.state.raci.roles || [];
    const rolesStr = roles.join(', ');
    
    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="raci-roles-input">${t('label_raci_roles')}</label>
          <input type="text" id="raci-roles-input" name="rolesStr" class="form-control" value="${rolesStr}" placeholder="${t('placeholder_raci_roles')}" required>
          <p style="font-size:11px; color:var(--text-muted); margin-top:6px;">
            ${t('raci_roles_warning')}
          </p>
        </div>
      </div>
    `;

    ModalHelper.open(
      t('modal_raci_roles_title'),
      bodyHtml,
      (data) => {
        const newRoles = data.rolesStr
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        
        if (newRoles.length === 0) {
          store.publish('notify', { type: 'error', messageKey: 'msg_roles_empty' });
          return false;
        }

        store.updateRaciRoles(newRoles);
        store.publish('notify', { type: 'success', messageKey: 'msg_roles_updated' });
        return true;
      }
    );
  }

  openActivityModal() {
    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="raci-activity-input">${t('label_raci_activity')}</label>
          <input type="text" id="raci-activity-input" name="activityName" class="form-control" placeholder="${t('placeholder_raci_activity')}" required>
        </div>
      </div>
    `;

    ModalHelper.open(
      t('modal_raci_activity_title'),
      bodyHtml,
      (data) => {
        const name = data.activityName ? data.activityName.trim() : '';
        if (!name) {
          store.publish('notify', { type: 'error', messageKey: 'msg_activity_name_empty' });
          return false;
        }

        store.addRaciActivity(name);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_activity') } });
        return true;
      }
    );
  }
}

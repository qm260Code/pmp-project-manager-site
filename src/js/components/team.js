import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class TeamComponent {
  constructor(container) {
    this.container = container;
    this.canvas = document.getElementById('team-org-tree-canvas');
    this.tableBody = document.getElementById('team-table-body');
    this.btnAdd = document.getElementById('btn-add-team-member');

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
    const team = store.state.team || [];
    this.renderTree(team);
    this.renderTable(team);
  }

  renderTree(team) {
    if (!this.canvas) return;

    if (team.length === 0) {
      this.canvas.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; color: var(--text-muted); text-align: center; padding: 40px 0;">
          <span style="font-size: 48px; margin-bottom: 10px;">👥</span>
          <p style="margin: 0; font-size: 14px;">No team structure data found. Please add members on the right.</p>
        </div>
      `;
      return;
    }

    const memberMap = {};
    const adjList = {};
    team.forEach(m => {
      memberMap[m.id] = m;
      adjList[m.id] = [];
    });

    const roots = [];
    team.forEach(m => {
      if (!m.reportsTo || !memberMap[m.reportsTo]) {
        roots.push(m.id);
      } else {
        adjList[m.reportsTo].push(m.id);
      }
    });

    const virtualRoot = '__virtual_root__';
    adjList[virtualRoot] = roots;

    const xCoords = {};
    const depthMap = {};
    let leafCount = 0;

    const traverse = (nodeId, depth) => {
      depthMap[nodeId] = depth;
      const children = adjList[nodeId] || [];
      if (children.length === 0) {
        xCoords[nodeId] = leafCount;
        leafCount++;
      } else {
        children.forEach(childId => traverse(childId, depth + 1));
        const firstChildX = xCoords[children[0]];
        const lastChildX = xCoords[children[children.length - 1]];
        xCoords[nodeId] = (firstChildX + lastChildX) / 2;
      }
    };

    traverse(virtualRoot, 0);

    const cardWidth = 140;
    const cardHeight = 65;
    const hSpacing = 175; 
    const vSpacing = 110; 
    const paddingX = 30;
    const paddingY = 30;

    let maxDepth = 0;
    team.forEach(m => {
      const d = depthMap[m.id] - 1;
      if (d > maxDepth) maxDepth = d;
    });

    const svgWidth = Math.max(leafCount * hSpacing - (hSpacing - cardWidth) + paddingX * 2, 500);
    const svgHeight = (maxDepth * vSpacing) + cardHeight + paddingY * 2;

    let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" style="overflow: visible; display: block; margin: 0 auto;">`;

    team.forEach(m => {
      if (m.reportsTo && memberMap[m.reportsTo]) {
        const parentId = m.reportsTo;
        
        const parentDepth = depthMap[parentId] - 1;
        const parentX = paddingX + xCoords[parentId] * hSpacing;
        const parentY = paddingY + parentDepth * vSpacing;
        
        const childDepth = depthMap[m.id] - 1;
        const childX = paddingX + xCoords[m.id] * hSpacing;
        const childY = paddingY + childDepth * vSpacing;
        
        const x1 = parentX + cardWidth / 2;
        const y1 = parentY + cardHeight;
        
        const x2 = childX + cardWidth / 2;
        const y2 = childY;
        
        const midY = (y1 + y2) / 2;
        
        svgContent += `
          <path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" 
                fill="none" 
                stroke="var(--border-color)" 
                stroke-width="1.8" 
                stroke-linecap="round" />
        `;
      }
    });

    team.forEach(m => {
      const depth = depthMap[m.id] - 1;
      const x = paddingX + xCoords[m.id] * hSpacing;
      const y = paddingY + depth * vSpacing;
      
      let borderStroke = 'var(--border-color)';
      let cardBg = '#ffffff';
      if (!m.reportsTo || !memberMap[m.reportsTo]) {
        borderStroke = '#E20015'; 
      } else if (m.role.includes('Lead') || m.role.includes('负责人')) {
        borderStroke = 'var(--status-info)';
      }

      svgContent += `
        <g class="org-card" transform="translate(${x}, ${y})" style="cursor: pointer;" data-id="${m.id}" title="${t('title_click_edit_member')}">
          <rect width="${cardWidth}" height="${cardHeight}" rx="8" 
                fill="${cardBg}" 
                stroke="${borderStroke}" 
                stroke-width="1.5" 
                filter="drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08))" />
          
          <text x="14" y="22" fill="var(--text-primary)" font-size="12.5" font-weight="600" font-family="'Outfit', sans-serif">${this.escapeHTML(m.name)}</text>
          <text x="14" y="38" fill="var(--text-secondary)" font-size="9.5" font-family="sans-serif">${this.escapeHTML(m.role)}</text>
          
          <rect x="14" y="46" width="${this.estimateTextWidth(m.department)}" height="13" rx="3" fill="rgba(0, 0, 0, 0.04)" />
          <text x="18" y="55" fill="var(--text-muted)" font-size="8.5" font-family="sans-serif" font-weight="500">${this.escapeHTML(m.department)}</text>
        </g>
      `;
    });

    svgContent += `</svg>`;
    this.canvas.innerHTML = svgContent;

    this.canvas.querySelectorAll('.org-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const m = team.find(item => item.id === id);
        if (m) this.openEditModal(m);
      });
    });
  }

  renderTable(team) {
    if (!this.tableBody) return;

    if (team.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px 0;">
            No team details registered.
          </td>
        </tr>
      `;
      return;
    }

    const memberMap = {};
    team.forEach(m => { memberMap[m.id] = m; });

    let html = '';
    team.forEach(m => {
      const parent = m.reportsTo ? memberMap[m.reportsTo] : null;
      const supervisorName = parent ? parent.name : `<span style="color:var(--text-muted);">${t('team_reports_none')}</span>`;
      
      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHTML(m.name)}</div>
          </td>
          <td>
            <div style="font-size: 13px;">${this.escapeHTML(m.role)}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top:2px;">${this.escapeHTML(m.department)}</div>
          </td>
          <td>
            <div style="font-size: 12px;">${supervisorName}</div>
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" data-action="edit" data-id="${m.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_edit')}</button>
              <button class="btn btn-danger" data-action="delete" data-id="${m.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_delete')}</button>
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
        const m = team.find(item => item.id === id);
        if (m) this.openEditModal(m);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_item') || 'Are you sure you want to remove this team member?')) {
          store.deleteTeamMember(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_team_member') } });
        }
      }
    };
  }

  getFormHtml(m = null, team = []) {
    const possibleSupervisors = this.getPossibleSupervisors(m ? m.id : null, team);
    
    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="member-name">${t('label_member_name')}</label>
          <input type="text" id="member-name" name="name" class="form-control" value="${m ? m.name : ''}" placeholder="${t('placeholder_person_name')}" required>
        </div>
        <div class="form-group">
          <label for="member-role">${t('label_member_role')}</label>
          <input type="text" id="member-role" name="role" class="form-control" value="${m ? m.role : ''}" placeholder="${t('placeholder_member_role')}" required>
        </div>
        <div class="form-group">
          <label for="member-department">${t('label_member_dept')}</label>
          <input type="text" id="member-department" name="department" class="form-control" value="${m ? m.department : ''}" placeholder="${t('placeholder_department')}" required>
        </div>
        <div class="form-group">
          <label for="member-reports-to">${t('label_member_reports')}</label>
          <select id="member-reports-to" name="reportsTo" class="form-control">
            <option value="" ${!m || !m.reportsTo ? 'selected' : ''}>${t('team_reports_none')}</option>
            ${possibleSupervisors.map(s => 
              `<option value="${s.id}" ${m && m.reportsTo === s.id ? 'selected' : ''}>${this.escapeHTML(s.name)} (${this.escapeHTML(s.role)})</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;
  }

  getPossibleSupervisors(memberId, team) {
    if (!memberId) return team;
    
    const descendants = new Set();
    const getChildren = (parentId) => {
      team.forEach(m => {
        if (m.reportsTo === parentId) {
          if (!descendants.has(m.id)) {
            descendants.add(m.id);
            getChildren(m.id);
          }
        }
      });
    };
    
    getChildren(memberId);
    return team.filter(m => m.id !== memberId && !descendants.has(m.id));
  }

  openAddModal() {
    const team = store.state.team || [];
    ModalHelper.open(
      t('modal_member_add'),
      this.getFormHtml(null, team),
      (data) => {
        store.addTeamMember(data);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_team_member') } });
        return true;
      }
    );
  }

  openEditModal(m) {
    const team = store.state.team || [];
    ModalHelper.open(
      `${t('modal_member_edit')}: ${m.name}`,
      this.getFormHtml(m, team),
      (data) => {
        store.updateTeamMember(m.id, data);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_team_member') } });
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

  estimateTextWidth(text) {
    if (!text) return 30;
    return Math.min(Math.max(text.length * 6.5 + 8, 35), 115);
  }
}

import { store } from '../store.js';
import { PmpCalculators } from '../utils/pmpCalculators.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export class ScheduleComponent {
  constructor(container) {
    this.container = container;
    this.ganttContainer = document.getElementById('gantt-chart-container');
    this.tableBody = document.getElementById('schedule-table-body');
    this.btnAdd = document.getElementById('btn-add-task');

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
    const schedule = state.schedule || [];
    
    this.renderGantt(state);
    this.renderTable(schedule);
  }

  renderGantt(state) {
    const schedule = state.schedule || [];
    const projectInfo = state.projectInfo;
    const lang = state.language || 'en';
    const isEn = lang !== 'zh';
    
    if (schedule.length === 0) {
      this.ganttContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">${t('dashboard_no_schedule')}</p>`;
      return;
    }

    const sortedTasks = [...schedule].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // SVG Dimensions
    const leftPanelWidth = 180;
    const timelineWidth = 620;
    const totalWidth = leftPanelWidth + timelineWidth;
    const rowHeight = 36;
    const headerHeight = 40;
    const totalHeight = headerHeight + (sortedTasks.length * rowHeight);

    let pStart = PmpCalculators.parseDate(projectInfo.startDate);
    let pEnd = PmpCalculators.parseDate(projectInfo.endDate);

    if (schedule.length > 0) {
      schedule.forEach(task => {
        const tStart = PmpCalculators.parseDate(task.startDate);
        const tEnd = PmpCalculators.parseDate(task.endDate);
        if (tStart < pStart) pStart = tStart;
        if (tEnd > pEnd) pEnd = tEnd;
      });
    }

    pStart = new Date(pStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    pEnd = new Date(pEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pStartStr = PmpCalculators.formatDate(pStart);
    const pEndStr = PmpCalculators.formatDate(pEnd);
    const projectDays = Math.max(1, PmpCalculators.getDaysDifference(pStart, pEnd));

    const columns = [];
    let current = new Date(pStart);

    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (projectDays <= 45) {
      let lastMonth = null;
      while (current <= pEnd) {
        const m = current.getMonth() + 1;
        const d = current.getDate();
        let label = `${m}/${d}`;
        if (lastMonth === m) {
          label = `${d}`;
        } else {
          lastMonth = m;
        }
        columns.push({ label, date: new Date(current) });
        current.setDate(current.getDate() + 7);
      }
    } else if (projectDays <= 180) {
      current.setDate(1);
      if (current < pStart) {
        current.setMonth(current.getMonth() + 1);
      }
      let lastYear = null;
      while (current <= pEnd) {
        const y = current.getFullYear();
        const m = current.getMonth() + 1;
        let label = isEn ? monthsEn[m-1] : `${m}月`;
        if (lastYear !== y) {
          label = isEn ? `${y} ${monthsEn[m-1]}` : `${y}年 ${m}月`;
          lastYear = y;
        }
        columns.push({ label, date: new Date(current) });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (projectDays <= 365) {
      current.setDate(1);
      if (current < pStart) {
        current.setMonth(current.getMonth() + 1);
      }
      let lastYear = null;
      while (current <= pEnd) {
        const y = current.getFullYear();
        const m = current.getMonth() + 1;
        let label = isEn ? monthsEn[m-1] : `${m}月`;
        if (lastYear !== y) {
          label = isEn ? `${y} ${monthsEn[m-1]}` : `${y}年 ${m}月`;
          lastYear = y;
        }
        columns.push({ label, date: new Date(current) });
        current.setMonth(current.getMonth() + 2);
      }
    } else {
      current.setDate(1);
      const currentMonth = current.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      current.setMonth(quarterStartMonth);
      if (current < pStart) {
        current.setMonth(current.getMonth() + 3);
      }
      let lastYear = null;
      while (current <= pEnd) {
        const y = current.getFullYear();
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        let label = `Q${quarter}`;
        if (lastYear !== y) {
          label = isEn ? `${y} Q${quarter}` : `${y}年 Q${quarter}`;
          lastYear = y;
        }
        columns.push({ label, date: new Date(current) });
        current.setMonth(current.getMonth() + 3);
      }
    }

    if (columns.length === 0) {
      columns.push({ label: pStartStr, date: new Date(pStart) });
    }

    let svgHtml = `<svg width="100%" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" class="gantt-svg">`;

    svgHtml += `<rect width="${leftPanelWidth}" height="${totalHeight}" fill="var(--bg-secondary)"/>`;
    svgHtml += `<rect x="${leftPanelWidth}" width="${timelineWidth}" height="${headerHeight}" fill="var(--bg-secondary)" />`;
    svgHtml += `<line x1="0" y1="${headerHeight}" x2="${totalWidth}" y2="${headerHeight}" stroke="var(--border-color)" stroke-width="1.5" />`;
    svgHtml += `<line x1="${leftPanelWidth}" y1="0" x2="${leftPanelWidth}" y2="${totalHeight}" stroke="var(--border-color)" stroke-width="1.5" />`;

    columns.forEach((col, index) => {
      const diffDays = PmpCalculators.getDaysDifference(pStart, col.date);
      const colLeft = leftPanelWidth + Math.max(0, (diffDays / projectDays) * timelineWidth);
      
      if (index > 0) {
        svgHtml += `<line x1="${colLeft}" y1="0" x2="${colLeft}" y2="${totalHeight}" class="gantt-grid-line" />`;
      }
      
      const nextDate = index < columns.length - 1 ? columns[index+1].date : pEnd;
      const widthDays = PmpCalculators.getDaysDifference(col.date, nextDate);
      const labelWidth = (widthDays / projectDays) * timelineWidth;
      const textX = colLeft + (labelWidth / 2);
      
      svgHtml += `<text x="${textX}" y="${headerHeight - 15}" class="gantt-header-text">${col.label}</text>`;
    });

    sortedTasks.forEach((task, index) => {
      const y = headerHeight + (index * rowHeight);
      svgHtml += `<line x1="0" y1="${y + rowHeight}" x2="${totalWidth}" y2="${y + rowHeight}" class="gantt-grid-line" />`;
      svgHtml += `<text x="15" y="${y + (rowHeight/2) + 5}" class="gantt-label-text" title="${task.name}">`;
      svgHtml += task.name.length > 18 ? `${task.name.substring(0, 16)}...` : task.name;
      svgHtml += `</text>`;
    });

    const taskRowMap = {};
    sortedTasks.forEach((t, idx) => {
      taskRowMap[t.id] = idx;
    });

    sortedTasks.forEach((task, index) => {
      const depIds = (task.dependencies || '').split(',').map(s => s.trim()).filter(Boolean);
      if (depIds.length === 0) return;

      const y = headerHeight + (index * rowHeight) + (rowHeight / 2);
      const layout = PmpCalculators.getGanttBarLayout(task.startDate, task.endDate, pStartStr, pEndStr, timelineWidth);
      const taskLeftX = leftPanelWidth + layout.left;

      depIds.forEach(depId => {
        const depRowIdx = taskRowMap[depId];
        if (depRowIdx === undefined) return;

        const depTask = schedule.find(t => t.id === depId);
        if (!depTask) return;

        const depLayout = PmpCalculators.getGanttBarLayout(depTask.startDate, depTask.endDate, pStartStr, pEndStr, timelineWidth);
        const depRightX = leftPanelWidth + depLayout.left + depLayout.width;
        const depY = headerHeight + (depRowIdx * rowHeight) + (rowHeight / 2);

        const midX = depRightX + 10;
        const points = `${depRightX},${depY} ${midX},${depY} ${midX},${y} ${taskLeftX},${y}`;
        svgHtml += `<polyline points="${points}" class="gantt-connection" />`;
      });
    });

    sortedTasks.forEach((task, index) => {
      const y = headerHeight + (index * rowHeight) + 8;
      const barHeight = 20;
      
      const layout = PmpCalculators.getGanttBarLayout(task.startDate, task.endDate, pStartStr, pEndStr, timelineWidth);
      const x = leftPanelWidth + layout.left;
      
      const isMilestone = task.isMilestone || task.name.includes('里程碑') || task.name.includes('Milestone');
      const progress = Math.max(0, Math.min(100, Number(task.progress || 0)));

      if (isMilestone) {
        const diamondSize = 12;
        const centerX = x + layout.width;
        const centerY = y + (barHeight / 2);
        
        svgHtml += `
          <g class="gantt-row" style="cursor:pointer;" onclick="window.pmpScheduleComponent.openEditModalById('${task.id}')">
            <polygon points="${centerX},${centerY - diamondSize} ${centerX + diamondSize},${centerY} ${centerX},${centerY + diamondSize} ${centerX - diamondSize},${centerY}" 
                     class="gantt-milestone" 
                     style="fill: ${progress === 100 ? 'var(--status-success)' : 'var(--status-warning)'};" />
            <title>${task.name}\nTarget: ${task.endDate}\nProgress: ${progress}%</title>
          </g>
        `;
      } else {
        const progressWidth = (progress / 100) * layout.width;
        
        let barColor = 'var(--accent-primary)'; 
        if (progress === 100) {
          barColor = 'var(--status-success)'; 
        } else {
          const name = task.name.toLowerCase();
          if (name.includes('开发') || name.includes('dev') || name.includes('code') || name.includes('system') || name.includes('wms') || name.includes('software')) {
            barColor = '#005691'; 
          } else if (name.includes('采购') || name.includes('hardware') || name.includes('sensor') || name.includes('cabling') || name.includes('deploy')) {
            barColor = '#ea580c'; 
          } else if (name.includes('测试') || name.includes('test') || name.includes('uat') || name.includes('qa')) {
            barColor = '#7c3aed'; 
          } else if (name.includes('设计') || name.includes('design') || name.includes('plan') || name.includes('requirements') || name.includes('charter')) {
            barColor = '#00a3e0'; 
          }
        }
        
        svgHtml += `
          <g class="gantt-row" style="cursor:pointer;" onclick="window.pmpScheduleComponent.openEditModalById('${task.id}')">
            <rect x="${x}" y="${y}" width="${layout.width}" height="${barHeight}" 
                  class="gantt-bar" style="fill: #e9ecef; stroke: var(--border-color); stroke-width:1;" />
            <rect x="${x}" y="${y}" width="${progressWidth}" height="${barHeight}" 
                  class="gantt-bar-progress" style="fill: ${barColor};" />
            <title>${task.name}\nTimeline: ${task.startDate} to ${task.endDate}\nOwner: ${task.owner}\nProgress: ${progress}%</title>
          </g>
        `;
      }
    });

    svgHtml += `</svg>`;
    this.ganttContainer.innerHTML = svgHtml;
    window.pmpScheduleComponent = this;
  }

  renderTable(schedule) {
    if (schedule.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted);">
            No schedule activities found. Click upper right to add.
          </td>
        </tr>
      `;
      return;
    }

    const sorted = [...schedule].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    let html = '';
    sorted.forEach(task => {
      const isMilestone = task.isMilestone || task.name.includes('里程碑') || task.name.includes('Milestone');

      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); display:flex; align-items:center; gap:6px;">
              ${task.name}
              ${isMilestone ? `<span class="badge" style="background:rgba(251,192,45,0.15); color:var(--status-warning); border:1px solid var(--status-warning)30; font-size:9px;">${t('header_project_status')}</span>` : ''}
            </div>
            <div class="task-id">${task.id}</div>
          </td>
          <td>
            <span style="font-size:13px;">${task.startDate}</span>
            <span style="color:var(--text-muted); padding:0 4px;">→</span>
            <span style="font-size:13px;">${task.endDate}</span>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; width:35px;">${task.progress}%</span>
              <div style="width:60px; background:var(--bg-secondary); border:1px solid var(--border-color); height:6px; border-radius:3px; overflow:hidden;">
                <div style="width:${task.progress}%; background:${task.progress === 100 ? 'var(--status-success)' : 'var(--accent-secondary)'}; height:100%;"></div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-size:13px;">${task.owner || '-'}</span>
          </td>
          <td>
            <span style="font-size:12px; color:var(--text-muted);">${task.dependencies || '-'}</span>
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" data-action="edit" data-id="${task.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_edit')}</button>
              <button class="btn btn-danger" data-action="delete" data-id="${task.id}" style="padding: 3px 8px; font-size:12px;">${t('btn_delete')}</button>
            </div>
          </td>
        </tr>
      `;
    });

    this.tableBody.innerHTML = html;

    // Single delegated listener instead of per-button bindings
    this.tableBody.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') {
        this.openEditModalById(id);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(t('msg_confirm_delete_task') || 'Are you sure you want to delete this task? This will break dependency lines.')) {
          store.deleteScheduleItem(id);
          store.publish('notify', { type: 'success', messageKey: 'msg_item_deleted', params: { item: t('item_activity') } });
        }
      }
    };
  }

  openEditModalById(id) {
    const task = store.state.schedule.find(t => t.id === id);
    if (task) this.openEditModal(task);
  }

  getFormHtml(task = {}) {
    const allOtherTasks = store.state.schedule.filter(t => t.id !== task.id);
    const depHelpStr = allOtherTasks.map(t => `${t.id} (${t.name.substring(0,8)})`).join(', ');

    return `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label for="task-name">${t('label_task_name')}</label>
          <input type="text" id="task-name" name="name" class="form-control" value="${task.name || ''}" placeholder="${t('placeholder_task_name')}" required>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="task-start">${t('label_task_start')}</label>
            <input type="date" id="task-start" name="startDate" class="form-control" value="${task.startDate || ''}" required>
          </div>
          <div class="form-group">
            <label for="task-end">${t('label_task_end')}</label>
            <input type="date" id="task-end" name="endDate" class="form-control" value="${task.endDate || ''}" required>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div class="form-group">
            <label for="task-progress">${t('label_task_progress')}</label>
            <input type="number" id="task-progress" name="progress" min="0" max="100" class="form-control" value="${task.progress !== undefined ? task.progress : 0}" required>
          </div>
          <div class="form-group">
            <label for="task-owner">${t('label_task_owner')}</label>
            <input type="text" id="task-owner" name="owner" class="form-control" value="${task.owner || ''}" placeholder="${t('placeholder_person_name')}" required>
          </div>
        </div>
        <div class="form-group">
          <label for="task-deps">${t('label_task_dep')}</label>
          <input type="text" id="task-deps" name="dependencies" class="form-control" value="${task.dependencies || ''}" placeholder="${t('placeholder_task_dependencies')}">
          ${depHelpStr ? `<p style="font-size:10px; color:var(--text-muted); margin-top:4px;">${t('label_available_predecessor_ids')}: ${depHelpStr}</p>` : ''}
        </div>
      </div>
    `;
  }

  openAddModal() {
    ModalHelper.open(
      t('modal_task_add'),
      this.getFormHtml(),
      (data) => {
        if (new Date(data.startDate) > new Date(data.endDate)) {
          store.publish('notify', { type: 'error', message: t('msg_date_error') });
          return false;
        }
        store.addScheduleItem(data);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_created', params: { item: t('item_activity') } });
        return true;
      }
    );
  }

  openEditModal(task) {
    ModalHelper.open(
      `${t('modal_task_edit')}: ${task.name}`,
      this.getFormHtml(task),
      (data) => {
        if (new Date(data.startDate) > new Date(data.endDate)) {
          store.publish('notify', { type: 'error', message: t('msg_date_error') });
          return false;
        }
        store.updateScheduleItem(task.id, data);
        store.publish('notify', { type: 'success', messageKey: 'msg_item_updated', params: { item: t('item_activity') } });
        return true;
      }
    );
  }
}

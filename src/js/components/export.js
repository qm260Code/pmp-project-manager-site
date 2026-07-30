import { store } from '../store.js';
import { PmpCalculators } from '../utils/pmpCalculators.js';
import { t } from '../utils/i18n.js';
import { cloudSync } from '../services/cloudSync.js?v=20260731-1';

export class ExportComponent {
  constructor(container) {
    this.container = container;
    this.btnExportJson = document.getElementById('btn-export-json');
    this.fileImportJson = document.getElementById('file-import-json');
    this.btnExportShCsv = document.getElementById('btn-export-sh-csv');
    this.btnExportRisksCsv = document.getElementById('btn-export-risks-csv');
    this.btnPrintReport = document.getElementById('btn-generate-print-report');
    this.cloudPanel = document.getElementById('cloud-sharing-panel');
    this._unsubscribeCloud = cloudSync.subscribe(state => {
      this.cloudState = state;
      this.renderCloud(state);
    });
    this._unsubscribeStore = store.subscribe('state-updated', () => {
      if (this.cloudState) this.renderCloud(this.cloudState);
    });

    this.initEvents();
  }

  initEvents() {
    this.btnExportJson.addEventListener('click', () => this.exportProjectJson());
    this.fileImportJson.addEventListener('change', (e) => this.importProjectJson(e));
    this.btnExportShCsv.addEventListener('click', () => this.exportStakeholdersCsv());
    this.btnExportRisksCsv.addEventListener('click', () => this.exportRisksCsv());
    this.btnPrintReport.addEventListener('click', () => this.generatePrintReport());
    this.cloudPanel?.addEventListener('click', event => this.handleCloudAction(event));
    this.cloudPanel?.addEventListener('change', event => {
      if (event.target.id === 'cloud-allowlist-file') this.handleAllowlistFile(event);
    });
  }

  // ─── JSON Backup ────────────────────────────────────────────────────────────

  isZh() {
    return (store.state.language || 'en') === 'zh';
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  renderAllowlistManager(state, text) {
    if (!state.canEdit) return '';
    return `
      <div class="cloud-allowlist-box">
        <h4>${text('Stakeholder email allowlist', '干系人邮箱白名单')}</h4>
        <p>${text(
          'Upload an Excel or CSV file containing stakeholder email addresses. Uploading replaces the previous list. Stakeholders receive view-only access.',
          '上传包含干系人邮箱的 Excel 或 CSV 文件。每次上传会替换旧名单，名单内干系人仅有查看权限。'
        )}</p>
        <p><strong>${text('Current stakeholder emails', '当前干系人邮箱数')}:</strong> ${state.stakeholderCount || 0}</p>
        <input class="cloud-file-input" id="cloud-allowlist-file" type="file" accept=".xlsx,.xls,.xlsb,.csv">
      </div>`;
  }

  renderCloud(state) {
    if (!this.cloudPanel) return;
    const zh = this.isZh();
    const text = (en, cn) => zh ? cn : en;
    if (!state.configured) {
      this.cloudPanel.innerHTML = '<h3>' + text('Stakeholder sharing', '干系人共享') + '</h3><p>' + text('Configure Supabase first. See docs/SUPABASE-SETUP.md.', '请先配置 Supabase。具体步骤见 docs/SUPABASE-SETUP.md。') + '</p>';
      return;
    }
    if (!state.email) {
      this.cloudPanel.innerHTML = '<h3>' + text('Stakeholder sharing', '干系人共享') + '</h3><p>' + text('Sign in from the secure access screen to continue.', '请从安全访问页面登录后继续。') + '</p>';
      return;
    }
    if (!state.project) {
      const action = state.canEdit
        ? '<button class="btn btn-primary" data-cloud-action="publish">' + text('Publish current project', '发布当前项目') + '</button>'
        : '<p>' + text('No shared project has been published yet.', '管理员尚未发布共享项目。') + '</p>';
      this.cloudPanel.innerHTML = '<h3>' + text('Stakeholder sharing', '干系人共享') + '</h3><p>' + text('Signed in as ', '当前登录：') + this.escapeHtml(state.email) + ' · ' + (state.canEdit ? text('Administrator', '管理员') : text('Viewer', '只读')) + '</p>' + action + this.renderAllowlistManager(state, text) + '<div class="cloud-actions"><button class="btn btn-secondary" data-cloud-action="sign-out">' + text('Sign out', '退出登录') + '</button></div>';
      return;
    }
    const mode = state.canEdit ? text('Administrator', '管理员') : text('Viewer · view only', '干系人 · 只读');
    const syncLabel = state.canEdit ? text('Save to cloud', '保存到云端') : text('Refresh data', '刷新数据');
    this.cloudPanel.innerHTML = '<h3>' + text('Stakeholder sharing', '干系人共享') + '</h3><p><strong>' + this.escapeHtml(state.project.name) + '</strong> · ' + mode + ' · ' + this.escapeHtml(state.email) + '</p>' + this.renderAllowlistManager(state, text) + '<div class="cloud-actions"><button class="btn btn-secondary" data-cloud-action="sync">' + syncLabel + '</button><button class="btn btn-secondary" data-cloud-action="sign-out">' + text('Sign out', '退出登录') + '</button></div>';
  }

  async handleCloudAction(event) {
    const button = event.target.closest('[data-cloud-action]');
    if (!button) return;
    const action = button.dataset.cloudAction;
    const text = (en, cn) => this.isZh() ? cn : en;
    try {
      if (action === 'publish') {
        await cloudSync.publishCurrentProject();
        store.publish('notify', { type: 'success', message: text('Project published to the shared workspace.', '项目已发布到共享空间。') });
      } else if (action === 'sync') {
        if (this.cloudState?.canEdit) await cloudSync.saveNow();
        else await cloudSync.refresh();
        store.publish('notify', { type: 'success', message: text('Cloud data is up to date.', '云端数据已同步。') });
      } else if (action === 'sign-out') {
        await cloudSync.signOut();
      }
    } catch (error) {
      store.publish('notify', { type: 'error', message: text('Unable to complete the cloud action. Check your setup and email address.', '云端操作未完成，请检查配置和邮箱地址。') });
    }
  }

  async handleAllowlistFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    const text = (en, cn) => this.isZh() ? cn : en;

    try {
      if (!window.XLSX) throw new Error('Excel parser unavailable');
      const workbook = window.XLSX.read(await file.arrayBuffer(), { raw: false });
      const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const emails = new Set();

      workbook.SheetNames.forEach(sheetName => {
        const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
          defval: '',
          raw: false
        });
        rows.forEach(row => row.forEach(cell => {
          const matches = String(cell).match(emailPattern) || [];
          matches.forEach(email => emails.add(email.trim().toLowerCase()));
        }));
      });

      if (!emails.size) {
        throw new Error('No email addresses found');
      }
      if (emails.size > 5000) {
        throw new Error('Too many email addresses');
      }

      const count = await cloudSync.replaceStakeholderAllowlist([...emails]);
      store.publish('notify', {
        type: 'success',
        message: text(
          `Stakeholder allowlist updated: ${count} email address(es).`,
          `干系人白名单已更新：共 ${count} 个邮箱。`
        )
      });
    } catch (error) {
      console.warn('[StakeholderAllowlist] Upload failed.', error);
      store.publish('notify', {
        type: 'error',
        message: text(
          'Unable to import the stakeholder list. Check that the file contains valid email addresses.',
          '无法导入干系人名单，请确认文件中包含有效邮箱地址。'
        )
      });
    } finally {
      input.value = '';
    }
  }
  exportProjectJson() {
    const dataStr = JSON.stringify(store.state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmp-project-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    store.publish('notify', { type: 'success', messageKey: 'msg_backup_downloaded' });
  }

  importProjectJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      store.importData(event.target.result);
      this.fileImportJson.value = '';
    };
    reader.onerror = () => {
      store.publish('notify', { type: 'error', messageKey: 'msg_backup_read_failed' });
    };
    reader.readAsText(file);
  }

  // ─── CSV Exports ─────────────────────────────────────────────────────────────

  exportStakeholdersCsv() {
    const stakeholders = store.state.stakeholders || [];
    const isEn = (store.state.language || 'en') !== 'zh';
    if (stakeholders.length === 0) {
      store.publish('notify', { type: 'warning', messageKey: 'msg_no_stakeholders_export' });
      return;
    }
    const headers = isEn
      ? ['Name', 'Role/Responsibility', 'Power Level', 'Interest Level', 'Engagement Status', 'Participation Strategy']
      : ['相关方姓名', '项目职责/角色', '权力等级', '利益等级', '当前参与水平', '沟通应对策略'];
    const rows = stakeholders.map(sh => [sh.name, sh.role, sh.power, sh.interest, sh.engagement, sh.strategy]);
    this.downloadCsv('stakeholders.csv', headers, rows);
  }

  exportRisksCsv() {
    const risks = store.state.risks || [];
    const isEn = (store.state.language || 'en') !== 'zh';
    if (risks.length === 0) {
      store.publish('notify', { type: 'warning', messageKey: 'msg_no_risks_export' });
      return;
    }
    const headers = isEn
      ? ['Risk Description', 'Category', 'Probability', 'Impact', 'Risk Score', 'Risk Level', 'Response Strategy', 'Owner', 'Status']
      : ['风险描述', '类型/分类', '发生概率', '影响程度', '风险得分', '风险等级', '应对策略', '责任承担人', '状态'];
    const rows = risks.map(r => {
      const calc = PmpCalculators.calculateRisk(r.probability, r.impact);
      return [r.description, r.category, r.probability, r.impact, calc.score, calc.rating, r.strategy, r.owner, r.status];
    });
    this.downloadCsv('risks.csv', headers, rows);
  }

  downloadCsv(filename, headers, rows) {
    const csvContent = '\uFEFF' +
      [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    store.publish('notify', { type: 'success', messageKey: 'msg_report_downloaded', params: { filename } });
  }

  // ─── Print Report ────────────────────────────────────────────────────────────

  generatePrintReport() {
    const state = store.state;
    const isEn = (state.language || 'en') !== 'zh';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      store.publish('notify', { type: 'error', messageKey: 'msg_popup_blocked' });
      return;
    }

    const evm = PmpCalculators.calculateEVM(state.costs, state.projectInfo.budget);
    const btnPrintLabel = isEn ? '🖨️ Print / Save to PDF' : '🖨️ 打印 / 存为 PDF';
    const reportTitle = isEn ? 'PMP Executive Project Performance Report' : 'PMP 项目执行情况与绩效分析报告';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle} - ${state.projectInfo.name}</title>
  <style>${this._reportStyles()}</style>
</head>
<body>
  ${this._renderPrintBanner(isEn, btnPrintLabel)}
  ${this._renderReportHeader(state.projectInfo, isEn)}
  ${this._renderProjectOverview(state.projectInfo, isEn)}
  ${this._renderEvmSection(evm, isEn)}
  <div class="page-break"></div>
  ${this._renderScheduleSection(state.schedule, isEn)}
  ${this._renderRisksSection(state.risks, isEn)}
  ${this._renderTeamSection(state.team || [], isEn)}
  ${this._renderActionItemsSection(state.actionItems || [], isEn)}
  <div class="page-break"></div>
  ${this._renderDocumentsSection(state.documents, isEn)}
  <div class="no-print" style="margin-top:50px; text-align:center; border-top:1px solid #eee; padding-top:20px;">
    <button onclick="window.print()" style="background:#007bc0;color:white;border:none;padding:10px 24px;border-radius:2px;font-weight:bold;font-size:14px;cursor:pointer;">${btnPrintLabel}</button>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  // ─── Report Section Helpers ──────────────────────────────────────────────────

  _reportStyles() {
    return `
      body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 40px; }
      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { margin: 0; font-size: 26px; color: #111; }
      .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
      .section { margin-bottom: 40px; page-break-inside: avoid; }
      .section h2 { border-left: 4px solid #007bc0; padding-left: 10px; font-size: 18px; color: #111; margin-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
      th { background-color: #f5f5f5; font-weight: bold; }
      .badge { display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: #eee; }
      .badge-alert { background: #fce8e6; color: #c5221f; }
      .badge-ok { background: #e6f4ea; color: #137333; }
      .doc-panel { background: #fafafa; border: 1px solid #eee; padding: 20px; border-radius: 6px; font-size: 13px; }
      .doc-empty { color: #999; font-style: italic; text-align: center; padding: 20px; }
      @media print {
        body { margin: 20px; }
        .no-print { display: none; }
        .page-break { page-break-before: always; }
      }
    `;
  }

  _renderPrintBanner(isEn, btnLabel) {
    const tip = isEn
      ? '💡 This is a report preview page. Click the button to export as PDF or print.'
      : '💡 这是项目报告预览页。点击右侧按钮可在您的操作系统中导出为 PDF 或进行纸面打印。';
    return `
      <div class="no-print" style="background:#f1f3f4;padding:12px;border-radius:6px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:#5f6368;">${tip}</span>
        <button onclick="window.print()" style="background:#007bc0;color:white;border:none;padding:8px 16px;border-radius:2px;font-weight:bold;cursor:pointer;">${btnLabel}</button>
      </div>`;
  }

  _renderReportHeader(project, isEn) {
    const title = isEn ? 'PMP Project Control & Performance Analysis Report' : 'PMP 项目执行情况与绩效分析报告';
    return `
      <div class="header">
        <h1>${title}</h1>
        <p>${isEn ? 'Project' : '项目'}: ${project.name} | PM: ${project.manager} | Sponsor: ${project.sponsor}</p>
        <p>${isEn ? 'Generated' : '生成时间'}: ${new Date().toLocaleString()}</p>
      </div>`;
  }

  _renderProjectOverview(project, isEn) {
    const labels = isEn
      ? { title: 'I. Project Overview', start: 'Start Date', end: 'End Date', status: 'Execution Status', budget: 'Approved Budget (BAC)', desc: 'Business Case & Description' }
      : { title: '一、项目基本概要 (Project Overview)', start: '项目开始日期', end: '计划完工日期', status: '整体执行状态', budget: '批准总预算 (BAC)', desc: '商业目标及项目简介' };
    return `
      <div class="section">
        <h2>${labels.title}</h2>
        <table style="margin-bottom:15px;">
          <tr>
            <th style="width:20%;">${labels.start}</th><td style="width:30%;">${project.startDate}</td>
            <th style="width:20%;">${labels.end}</th><td style="width:30%;">${project.endDate}</td>
          </tr>
          <tr>
            <th>${labels.status}</th><td><span class="badge badge-ok">${project.status}</span></td>
            <th>${labels.budget}</th><td>¥${Number(project.budget || 0).toLocaleString()}</td>
          </tr>
        </table>
        <p style="font-size:13px;"><strong>${labels.desc}:</strong><br>${project.description}</p>
      </div>`;
  }

  _renderEvmSection(evm, isEn) {
    const title = isEn ? 'II. Earned Value Management (EVM) Metrics' : '二、挣值绩效评估 (Earned Value Management)';
    const desc = isEn
      ? 'Objectively monitors project financial health and schedule timelines against baseline targets.'
      : '通过对比计划的价值、实际成本以及完成任务挣得的价值，客观反映项目的预算健康度与进度健康度。';
    const h = isEn
      ? ['Metric', 'Value', 'Baseline Assessment', 'EVM Explanation']
      : ['绩效指标', '数值', '控制基准评估', '预测分析说明'];

    const cpiText = evm.CPI >= 1.0 ? (isEn ? 'On Target (CPI >= 1.0)' : '正常 (CPI >= 1.0)') : (isEn ? 'Over Budget (CPI < 1.0)' : '预算超支 (CPI < 1.0)');
    const spiText = evm.SPI >= 1.0 ? (isEn ? 'On Schedule (SPI >= 1.0)' : '正常 (SPI >= 1.0)') : (isEn ? 'Behind Schedule (SPI < 1.0)' : '进度滞后 (SPI < 1.0)');

    const rows = [
      [`<strong>${t('cost_kpi_pv')}</strong>`, `¥${evm.PV.toLocaleString()}`, isEn ? 'Planned baseline budget allocated to WBS' : '计划内分配至各工作包的财务额度', '--'],
      [`<strong>${t('cost_kpi_ev')}</strong>`, `¥${evm.EV.toLocaleString()}`, isEn ? 'Earned credit value of completed tasks' : '已完成工作折算出的预算额度', isEn ? 'Physical completion check' : '当前活动物理完成进度之和'],
      [`<strong>${t('cost_kpi_ac')}</strong>`, `¥${evm.AC.toLocaleString()}`, isEn ? 'Actual total expenditure incurred' : '已发生工作的实际财务流出', '--'],
      [`<strong>${t('cost_kpi_cv')}</strong>`, `<span style="color:${evm.CV >= 0 ? 'green' : 'red'};font-weight:bold;">¥${evm.CV.toLocaleString()}</span>`, `<span class="badge ${evm.CV >= 0 ? 'badge-ok' : 'badge-alert'}">${evm.CV >= 0 ? (isEn ? 'Under Budget' : '成本节约') : (isEn ? 'Over Budget' : '超支警告')}</span>`, isEn ? 'Positive is cost savings; negative is deficit' : '正数代表成本低于预算，负数代表超支'],
      [`<strong>${t('cost_kpi_sv')}</strong>`, `<span style="color:${evm.SV >= 0 ? 'green' : 'red'};font-weight:bold;">¥${evm.SV.toLocaleString()}</span>`, `<span class="badge ${evm.SV >= 0 ? 'badge-ok' : 'badge-alert'}">${evm.SV >= 0 ? (isEn ? 'Ahead' : 'On Schedule') : (isEn ? 'Behind Schedule' : '进度滞后')}</span>`, isEn ? 'Positive is schedule lead; negative is lag' : '正数代表领先于原计划进度，负数代表落后'],
      [`<strong>${t('kpi_cpi')}</strong>`, `<strong>${evm.CPI.toFixed(2)}</strong>`, cpiText, isEn ? `Creating $${evm.CPI.toFixed(2)} for every $1.00 spent` : `1元实际发销创造了 ${evm.CPI.toFixed(2)} 元等值可交付物`],
      [`<strong>${t('kpi_spi')}</strong>`, `<strong>${evm.SPI.toFixed(2)}</strong>`, spiText, isEn ? `Working at ${Math.round(evm.SPI * 100)}% efficiency` : `工作推进效率为计划的 ${Math.round(evm.SPI * 100)}%`],
      [`<strong>${t('cost_kpi_eac')}</strong>`, `<strong>¥${Math.round(evm.EAC).toLocaleString()}</strong>`, isEn ? 'Estimate at completion based on current performance' : '估算剩余工作保持当前绩效', `VAC: ¥${Math.round(evm.VAC).toLocaleString()}`],
    ];

    return `
      <div class="section">
        <h2>${title}</h2>
        <p style="font-size:13px;margin-bottom:10px;">${desc}</p>
        <table>
          <thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  _renderScheduleSection(schedule, isEn) {
    const title = isEn ? 'III. WBS Milestones & Activities Checklist' : '三、进度计划与里程碑清单 (Schedule & Milestones)';
    const h = isEn
      ? ['Activity / Milestone Name', 'Start Date', 'End Date', 'Owner', 'Progress']
      : ['任务/里程碑名称', '计划开始时间', '计划结束时间', '负责人', '完成进度'];
    const rows = schedule.map(task => `
      <tr>
        <td><strong>${task.name}</strong></td>
        <td>${task.startDate}</td>
        <td>${task.endDate}</td>
        <td>${task.owner || '-'}</td>
        <td>${task.progress}%</td>
      </tr>`).join('');
    return `
      <div class="section">
        <h2>${title}</h2>
        <table>
          <thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  _renderRisksSection(risks, isEn) {
    const title = isEn ? 'IV. Priority Risk Log & Response Register' : '四、高风险及应对战略登记册 (Priority Risks Log)';
    const h = isEn
      ? ['Risk Description', 'Prob.', 'Impact', 'Score', 'Level', 'Response Strategy', 'Owner']
      : ['风险描述', '发生概率', '影响程度', '分值', '等级', '应对策略', '责任人'];
    const rows = risks.map(r => {
      const calc = PmpCalculators.calculateRisk(r.probability, r.impact);
      const strategyText = t('risk_strat_' + r.strategy.toLowerCase()) || r.strategy;
      const levelLabel = calc.rating === 'High' ? t('risk_level_high') : calc.rating === 'Medium' ? t('risk_level_med') : t('risk_level_low');
      return `
        <tr>
          <td>${r.description}</td>
          <td>${r.probability}/5</td>
          <td>${r.impact}/5</td>
          <td style="font-weight:bold;">${calc.score}</td>
          <td><span class="badge ${calc.rating === 'High' ? 'badge-alert' : ''}">${levelLabel}</span></td>
          <td>${strategyText}</td>
          <td>${r.owner}</td>
        </tr>`;
    }).join('');
    return `
      <div class="section">
        <h2>${title}</h2>
        <table>
          <thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  _renderTeamSection(team, isEn) {
    const title = isEn ? 'V. Project Team Structure List' : '五、项目团队组织架构成员清单 (Project Team Structure)';
    const h = isEn
      ? ['Name', 'Role / Position', 'Department', 'Reports To']
      : ['姓名', '角色岗位', '所属部门', '汇报上级'];
    const memberMap = {};
    team.forEach(m => { memberMap[m.id] = m; });
    const rows = team.map(m => {
      const parent = m.reportsTo ? memberMap[m.reportsTo] : null;
      return `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.role}</td>
          <td>${m.department}</td>
          <td>${parent ? parent.name : t('team_reports_none')}</td>
        </tr>`;
    }).join('');
    return `
      <div class="section">
        <h2>${title}</h2>
        <table>
          <thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  _renderActionItemsSection(actionItems, isEn) {
    const title = isEn ? 'VI. Action Items Tracker Log' : '六、项目待完成事项清单 (Action Items Tracker)';
    const h = isEn
      ? ['Content Description', 'Triggered', 'Owner', 'Target Date', 'Delay', 'Priority', 'Status']
      : ['待完成事项内容', '触发日期', '负责人', '期望完成日期', '延迟天数', '优先级', '当前状态'];
    const rows = actionItems.map(item => {
      const statusLabel = item.status === 'Completed' ? t('act_status_completed') : t('act_status_pending');
      const priorityLabel = item.priority === 'High' ? t('act_priority_high') : item.priority === 'Medium' ? t('act_priority_med') : t('act_priority_low');
      return `
        <tr>
          <td>${item.content}</td>
          <td>${item.triggerDate}</td>
          <td>${item.owner}</td>
          <td>${item.targetDate}</td>
          <td>${item.delayDays}${t('act_delay_unit')}</td>
          <td>${priorityLabel}</td>
          <td>${statusLabel}</td>
        </tr>`;
    }).join('');
    return `
      <div class="section">
        <h2>${title}</h2>
        <table>
          <thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  _renderDocumentsSection(documents, isEn) {
    const title = isEn ? 'VII. PMP Project Core Deliverables Documents' : '七、PMP 核心过程输出文档 (Process Documents)';
    const sections = [
      { key: 'developProjectCharter', label: isEn ? '1. Project Charter (Integration - Initiating)' : '1. 项目章程 (Integration - Initiating)' },
      { key: 'defineScope',           label: isEn ? '2. Project Scope Statement (Scope - Planning)' : '2. 项目范围说明书 (Scope - Planning)' },
      { key: 'planQualityManagement', label: isEn ? '3. Quality Management Plan (Quality - Planning)' : '3. 项目质量管理计划 (Quality - Planning)' },
    ];
    const docHtml = sections.map(sec => {
      const text = (documents[sec.key] || '').trim();
      const content = text
        ? text
            .replace(/# (.*)/g, '<h2>$1</h2>')
            .replace(/## (.*)/g, '<h3>$1</h3>')
            .replace(/\* (.*)/g, '<li>$1</li>')
            .replace(/\n\n/g, '<p></p>')
            .replace(/\n/g, '<br>')
        : `<div class="doc-empty">(${isEn ? 'Deliverable document empty' : `未录入《${sec.label}》文档`})</div>`;
      return `
        <h3 style="margin-top:20px;border-bottom:1px dashed #ccc;padding-bottom:5px;">${sec.label}</h3>
        <div class="doc-panel">${content}</div>`;
    }).join('');
    return `
      <div class="section">
        <h2>${title}</h2>
        ${docHtml}
      </div>`;
  }
}

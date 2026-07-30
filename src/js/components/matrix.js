import { store } from '../store.js';
import { PmpDocumentEditor } from './documentEditor.js';
import { PMP_PROCESSES, PROCESS_GROUPS, KNOWLEDGE_AREAS } from '../utils/pmpProcesses.js';

const ZH_TERMS = {
  'Project charter': '项目章程', 'Project management plan': '项目管理计划', 'Project documents': '项目文件',
  'Enterprise environmental factors': '事业环境因素', 'Organizational process assets': '组织过程资产',
  'Expert judgment': '专家判断', 'Meetings': '会议', 'Data analysis': '数据分析',
  'Business documents': '商业文件', 'Agreements': '协议', 'Deliverables': '可交付成果',
  'Work performance data': '工作绩效数据', 'Work performance information': '工作绩效信息',
  'Work performance reports': '工作绩效报告', 'Change requests': '变更请求',
  'Approved change requests': '批准的变更请求', 'Project management plan updates': '项目管理计划更新',
  'Project documents updates': '项目文件更新', 'Risk register': '风险登记册',
  'Risk report': '风险报告', 'Quality management plan': '质量管理计划',
  'Quality metrics': '质量测量指标', 'Quality reports': '质量报告',
  'Quality control measurements': '质量控制测量结果', 'Verified deliverables': '已核实可交付成果',
  'Resource management plan': '资源管理计划', 'Resource requirements': '资源需求',
  'Resource calendars': '资源日历', 'Project team assignments': '项目团队分配',
  'Physical resource assignments': '实物资源分配', 'Cost baseline': '成本基准',
  'Schedule baseline': '进度基准', 'Project schedule': '项目进度计划',
  'Scope baseline': '范围基准', 'Stakeholder register': '干系人登记册',
  'Stakeholder engagement plan': '干系人参与计划', 'Requirements documentation': '需求文件',
  'Requirements traceability matrix': '需求跟踪矩阵', 'Procurement management plan': '采购管理计划',
  'Communications management plan': '沟通管理计划', 'Assumption log': '假设日志',
  'Issue log': '问题日志', 'Lessons learned register': '经验教训登记册',
  'Data gathering': '数据收集', 'Decision making': '决策', 'Data representation': '数据表现',
  'Interpersonal and team skills': '人际关系与团队技能', 'Project management information system': '项目管理信息系统',
  'Inspection': '检查', 'Testing or product evaluations': '测试或产品评估', 'Audits': '审计',
  'Problem solving': '问题解决', 'Quality improvement methods': '质量改进方法'
};

export class MatrixComponent {
  constructor() {
    this.container = document.getElementById('pmp-matrix-container');
    this.selectedProcessId = null;
    this.render();
    this._unsubscribe = store.subscribe('state-updated', () => this.render());
  }

  get lang() { return store.state.language === 'zh' ? 'zh' : 'en'; }
  local(value) { return value?.[this.lang] || value?.en || ''; }

  zhItem(value, kind, index) {
    let text = value;
    Object.entries(ZH_TERMS).sort(([a], [b]) => b.length - a.length).forEach(([en, zh]) => {
      text = text.replaceAll(en, zh);
    });
    return /[A-Za-z]/.test(text) ? `项目${kind}项 ${index + 1}` : text;
  }

  render() {
    if (!this.container) return;
    const lang = this.lang;
    let html = '<div class="pmp-matrix itto-matrix">';
    html += `<div class="matrix-header header-ka">${lang === 'zh' ? '知识领域' : 'Knowledge Areas'}</div>`;
    PROCESS_GROUPS.forEach(group => { html += `<div class="matrix-header ${group.key}">${group[lang]}</div>`; });
    KNOWLEDGE_AREAS.forEach((area, index) => {
      html += `<div class="matrix-row-title">${index + 1}. ${area[lang]}</div>`;
      PROCESS_GROUPS.forEach(group => {
        const processes = PMP_PROCESSES.filter(p => p.area === area.key && p.group === group.key);
        html += '<div class="matrix-cell">';
        processes.forEach(process => {
          const active = process.id === this.selectedProcessId ? ' selected' : '';
          html += `<button type="button" class="process-item${active}" data-process-id="${process.id}" title="${lang === 'zh' ? '查看过程详情' : 'View process details'}"><span>${process.id} ${this.local(process.name)}</span></button>`;
        });
        html += '</div>';
      });
    });
    html += '</div>';
    const selected = PMP_PROCESSES.find(process => process.id === this.selectedProcessId);
    html += selected ? this.renderItto(selected) : `<div class="itto-empty">${lang === 'zh' ? '选择一个过程以查看详细内容。' : 'Select a process to inspect its details.'}</div>`;
    this.container.innerHTML = html;
    this.bindEvents();
  }

  renderItto(process) {
    const lang = this.lang;
    const list = (values, kind) => `<ul>${values.map((value, index) => `<li>${lang === 'zh' ? this.zhItem(value, kind, index) : value}</li>`).join('')}</ul>`;
    const purpose = lang === 'zh' ? `该过程用于支持“${process.name.zh}”并实现项目目标。` : this.local(process.purpose);
    return `<section class="itto-detail" aria-live="polite"><div class="itto-detail-header"><div><span class="itto-process-id">${process.id}</span><h3>${this.local(process.name)}</h3><p>${purpose}</p></div><button type="button" class="btn btn-secondary" id="btn-open-process-document">${lang === 'zh' ? '编辑项目文件' : 'Open Project Document'}</button></div><div class="itto-columns"><article><h4>${lang === 'zh' ? '输入' : 'Inputs'}</h4>${list(process.itto.inputs, '输入')}</article><article><h4>${lang === 'zh' ? '工具与技术' : 'Tools & Techniques'}</h4>${list(process.itto.tools, '工具与技术')}</article><article><h4>${lang === 'zh' ? '输出' : 'Outputs'}</h4>${list(process.itto.outputs, '输出')}</article></div></section>`;
  }

  bindEvents() {
    this.container.querySelectorAll('[data-process-id]').forEach(button => button.addEventListener('click', () => {
      this.selectedProcessId = button.dataset.processId;
      this.render();
    }));
    this.container.querySelector('#btn-open-process-document')?.addEventListener('click', () => {
      const process = PMP_PROCESSES.find(item => item.id === this.selectedProcessId);
      if (!process) return;
      const area = KNOWLEDGE_AREAS.find(item => item.key === process.area);
      const group = PROCESS_GROUPS.find(item => item.key === process.group);
      PmpDocumentEditor.openEditor(area?.[this.lang], group?.[this.lang], process.id, this.local(process.name), PmpDocumentEditor.getDocKey(process.area, process.group, process.id));
    });
  }
}

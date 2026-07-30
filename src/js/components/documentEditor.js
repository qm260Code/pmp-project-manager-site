import { store } from '../store.js';
import { ModalHelper } from '../app.js';
import { t } from '../utils/i18n.js';

export const PmpDocumentEditor = {
  /**
   * Templates for documents when empty (Bilingual)
   */
  templates: {
    developProjectCharter: (lang) => {
      const isEn = lang !== 'zh';
      return isEn ? `# 1. Project Charter
## 1.1 Project Background & Purpose
[Describe the business case, background and core pain points being addressed]

## 1.2 Deliverables & Objectives
* Objective 1:
* Objective 2:

## 1.3 High-Level Milestones
1. Milestone 1:
2. Milestone 2:

## 1.4 Project Sponsor & Authorization
Project Manager:
Sponsor Signature:` : `# 项目章程 (Project Charter)
## 一、项目背景与目的
[在此输入项目启动的背景原因，解决什么商业痛点]

## 二、项目可交付成果与目标
* 目标1：
* 目标2：

## 三、高层级里程碑与进度
1. 里程碑 1：
2. 里程碑 2：

## 四、项目发起人(Sponsor)及高层授权
项目经理：
发起人签字：`;
    },

    developProjectManagementPlan: (lang) => {
      const isEn = lang !== 'zh';
      return isEn ? `# 2. Project Management Plan
## 2.1 Project Lifecycle & Methodology
[Describe whether the project follows predictive, agile or hybrid methodologies]

## 2.2 Core Management Sub-plans
1. Scope Management Plan:
2. Schedule Management Plan:
3. Cost Management Plan:
4. Quality Management Plan:
5. Risk Management Plan:

## 2.3 Baseline Configurations
* Scope Baseline:
* Schedule Baseline:
* Cost Baseline:` : `# 项目管理计划 (Project Management Plan)
## 一、项目生命周期及过程方法
[描述项目采用预测型、敏捷型还是混合型生命周期]

## 二、核心管理子计划
1. 范围管理计划：
2. 进度管理计划：
3. 成本管理计划：
4. 质量管理计划：
5. 风险管理计划：

## 三、基准配置 (Baselines)
* 范围基准 (Scope Baseline)：
* 进度基准 (Schedule Baseline)：
* 成本基准 (Cost Baseline)：`;
    },

    defineScope: (lang) => {
      const isEn = lang !== 'zh';
      return isEn ? `# 3. Project Scope Statement
## 3.1 In Scope
[Detail product features, scope boundaries and specific deliverables]

## 3.2 Acceptance Criteria
* Deliverable 1 Criteria:
* Deliverable 2 Criteria:

## 3.3 Out of Scope
* Excluded 1:
* Excluded 2:` : `# 范围说明书 (Project Scope Statement)
## 一、项目范围描述 (In Scope)
[详细描述项目要交付的具体产品或服务内容]

## 二、可交付物标准与验收准则
* 交付物 1 验收标准：
* 交付物 2 验收标准：

## 三、项目边界与除外情况 (Out of Scope)
* 明确不包含：
* 明确不包含：`;
    },

    planQualityManagement: (lang) => {
      const isEn = lang !== 'zh';
      return isEn ? `# 4. Quality Management Plan
## 4.1 Quality Standards
[Reference industrial standards, regulatory specs or internal company guidelines]

## 4.2 Quality Metrics & KPIs
* Metric 1:
* Metric 2:

## 4.3 Quality Assurance (QA) & Quality Control (QC) Activities
* QA Audits:
* QC Testing Frequencies:` : `# 质量管理计划 (Quality Management Plan)
## 一、项目质量标准
[参照的国家标准、行业标准或集团内部规范]

## 二、核心质量测量指标 (Metrics)
* 指标 1：
* 指标 2：

## 三、质量保证 (QA) 与质量控制 (QC) 活动
* QA 审计安排：
* QC 检查频次：`;
    },

    planCommunicationsManagement: (lang) => {
      const isEn = lang !== 'zh';
      return isEn ? `# 5. Communications Management Plan
## 5.1 Communication Needs Analysis
[Identify who needs what information, when and in what format]

## 5.2 Communications Strategy Matrix
* **Meetings**: Stakeholders, frequency, format.
* **Reports**: Target audience, frequency, delivery path.
* **Escalations**: Escalation chain and decision paths.` : `# 沟通管理计划 (Communications Management Plan)
## 一、沟通需求分析
[各利益相关方所需要的关键信息、格式及获取时间]

## 二、沟通策略矩阵
* **例会**：对象、频率、汇报形式。
* **报告**：对象、频率、发送方式。
* **变更升级**：决策流程及审批链条。`;
    },

    generic: (kaName, pgName, processName, lang) => {
      const isEn = lang !== 'zh';
      return `# ${processName} (PMP Record)
* **${isEn ? 'Knowledge Area' : '知识领域'}**: ${kaName}
* **${isEn ? 'Process Group' : '过程组'}**: ${pgName}
* **${isEn ? 'Last Updated By' : '最后更新人'}**: ${store.state.projectInfo.manager}
* **${isEn ? 'Status' : '状态'}**: Draft

## ${isEn ? 'I. Inputs' : '一、过程输入 (Inputs)'}
* 

## ${isEn ? 'II. Tools & Techniques' : '二、工具与技术 (Tools & Techniques)'}
* 

## ${isEn ? 'III. Outputs / Deliverable Log' : '三、过程输出 / 实战记录 (Outputs / Log)'}
[Record project activities, changes and outputs here.]`;
    }
  },

  getDocKey(kaKey, pgKey, processId) {
    const mapping = {
      'integration_initiating_1': 'developProjectCharter',
      'integration_planning_2': 'developProjectManagementPlan',
      'scope_planning_3': 'defineScope',
      'quality_planning_1': 'planQualityManagement',
      'communications_planning_1': 'planCommunicationsManagement'
    };
    return mapping[processId] || `doc_${kaKey}_${pgKey}_${processId}`;
  },

  openEditor(kaName, pgName, processId, processName, docKey) {
    const state = store.state;
    const lang = state.language || 'en';
    const isEn = lang !== 'zh';
    
    let text = state.documents[docKey] || '';
    
    if (!text.trim()) {
      if (this.templates[docKey]) {
        text = this.templates[docKey](lang);
      } else {
        text = this.templates.generic(kaName, pgName, processName, lang);
      }
    }

    let status = 'not-started';
    if (state.documents[docKey]) {
      status = text.includes('状态: 定稿') || text.includes('status: final') || text.includes('Status: Final') || text.includes('状态: 定稿发布') || text.includes('状态: 最终') ? 'final' : 'draft';
    }

    const labelKa = isEn ? 'Knowledge Area' : '知识领域';
    const labelPg = isEn ? 'Process Group' : '过程组';
    const labelStatus = isEn ? 'Release Status' : '发布状态';
    const labelDraft = isEn ? 'Drafting (Draft)' : '草稿中 (Draft)';
    const labelFinal = isEn ? 'Finalized (Final)' : '定稿发布 (Final)';
    const labelTip = isEn ? 
      '💡 Hint: Standard Markdown format is supported. Saving writes directly to local storage.' :
      '💡 提示：该文档支持标准 Markdown 格式。完成修改后点击“保存”会自动写入 LocalStorage。';
    const labelSaveBtn = isEn ? 'Save' : '保存';

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; color:var(--text-muted);">
            ${labelKa}: <strong>${kaName}</strong> | ${labelPg}: <strong>${pgName}</strong>
          </span>
          <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:8px;">
            <label for="doc-status" style="margin-bottom:0;">${labelStatus}:</label>
            <select name="status" id="doc-status" class="form-control" style="width:130px; padding:4px 8px;">
              <option value="draft" ${status === 'draft' || status === 'not-started' ? 'selected' : ''}>${labelDraft}</option>
              <option value="final" ${status === 'final' ? 'selected' : ''}>${labelFinal}</option>
            </select>
          </div>
        </div>
        
        <div class="form-group" style="margin-bottom:4px;">
          <textarea name="documentText" id="editor-textarea" class="form-control" style="height:350px; font-family: 'Courier New', Courier, monospace; font-size:13px; line-height:1.6; background-color: var(--bg-secondary); color: var(--text-primary);">${text}</textarea>
        </div>
        
        <p style="font-size:11px; color:var(--text-muted); margin-bottom:0;">
          ${labelTip}
        </p>
      </div>
    `;

    ModalHelper.open(
      `${isEn ? 'Edit' : '编辑'}：${processName}`,
      bodyHtml,
      (data) => {
        let textToSave = data.documentText || '';
        
        if (data.status === 'final') {
          if (!textToSave.includes('Status: Final') && !textToSave.includes('状态: 定稿发布') && !textToSave.includes('状态: 最终')) {
            textToSave = textToSave.replace(/Status: (Draft|Not Started)/g, 'Status: Final');
            textToSave = textToSave.replace(/状态: (草稿|未开始)/g, '状态: 定稿发布');
          }
        }
        
        store.updateDocument(docKey, textToSave);
        store.publish('notify', { type: 'success', message: isEn ? `"${processName}" document saved successfully.` : `《${processName}》文档保存成功` });
        return true;
      },
      labelSaveBtn
    );
  }
};

import { InitialData } from './utils/initialData.js';
import { translateKnownData } from './utils/i18n.js';

// All keys that belong to a single project record - defined once to avoid repetition
export const PROJECT_KEYS = [
  'projectInfo', 'documents', 'stakeholders', 'risks', 'schedule', 'costs',
  'raci', 'team', 'actionItems', 'sidebarTitles', 'changeRequests', 'requirements',
  'evmHistory', 'sprintBurndown', 'cfd', 'dashboardDataSourceVersion', 'resources', 'qualityMeasurements', 'resourceHistogram', 'controlChart'
];

// Keys whose default value is [] instead of {}
const ARRAY_KEYS = new Set([
  'stakeholders', 'risks', 'schedule', 'costs', 'team', 'actionItems',
  'changeRequests', 'requirements', 'evmHistory', 'sprintBurndown',
  'cfd', 'resources', 'qualityMeasurements', 'resourceHistogram', 'controlChart'
]);

/** Deep-clone all project keys from a source object into { id, ...keys }. */
function extractProjectData(id, source) {
  const obj = { id };
  PROJECT_KEYS.forEach(key => {
    obj[key] = JSON.parse(JSON.stringify(source[key] ?? (key === 'dashboardDataSourceVersion' ? 0 : (ARRAY_KEYS.has(key) ? [] : {}))));
  });
  return obj;
}

/** Apply all project keys from a source record onto a target object (mutates target). */
function applyProjectData(target, source) {
  PROJECT_KEYS.forEach(key => {
    target[key] = JSON.parse(JSON.stringify(source[key] ?? (key === 'dashboardDataSourceVersion' ? 0 : (ARRAY_KEYS.has(key) ? [] : {}))));
  });
}

class PmpStore {
  constructor() {
    this.subscribers = {};
    this.history = [];
    this.maxHistory = 3;
    this._saveTimer = null;

    // Load initial state
    const loadedState = this.loadState();
    this.state = translateKnownData(loadedState, loadedState.language || 'en');
    this.ensureDashboardModules(false);
    if (this.state.dashboardDataSourceVersion !== 1) {
      this.state.evmHistory = [];
      this.state.sprintBurndown = [];
      this.state.cfd = [];
      this.state.dashboardDataSourceVersion = 1;
    }
    this.rebuildDerivedDashboardData();
  }

  /**
   * Safe loader from LocalStorage
   */
  loadState() {
    try {
      const stored = localStorage.getItem('pmp_project_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.validateStateSchema(parsed)) {
          let updated = false;

          // Dynamic patch for sidebar custom titles if upgrading from older caches
          if (!parsed.sidebarTitles) {
            parsed.sidebarTitles = {};
          }
          const defaultTitles = {
            dashboard: "Dashboard",
            matrix: "Process Area Matrix",
            stakeholders: "Stakeholder Register",
            risks: "Risk Register",
            schedule: "Schedule & Gantt",
            cost: "Cost & EVM",
            raci: "RACI Matrix",
            team: "Team Structure",
            actionItems: "Action Items Tracker",
            changeRequests: "Change Requests Log",
            requirements: "Requirements Matrix (RTM)",
            resources: "Resource Management",
            quality: "Quality Management",
            export: "Export & Report"
          };
          Object.keys(defaultTitles).forEach(k => {
            if (!parsed.sidebarTitles[k]) {
              parsed.sidebarTitles[k] = defaultTitles[k];
              updated = true;
            }
          });

          // i18n Language patch
          if (!parsed.language) {
            parsed.language = 'en';
            updated = true;
          }

          // Dynamic patch for team, actionItems, changeRequests, and requirements
          if (!parsed.team) {
            parsed.team = JSON.parse(JSON.stringify(InitialData.team || []));
            updated = true;
          }
          if (!parsed.actionItems) {
            parsed.actionItems = JSON.parse(JSON.stringify(InitialData.actionItems || []));
            updated = true;
          }
          if (!parsed.changeRequests) {
            parsed.changeRequests = [];
            updated = true;
          }
          if (!parsed.requirements) {
            parsed.requirements = [];
            updated = true;
          }
          if (!Array.isArray(parsed.resources)) { parsed.resources = JSON.parse(JSON.stringify(InitialData.resources || [])); updated = true; }
          if (!Array.isArray(parsed.qualityMeasurements)) { parsed.qualityMeasurements = JSON.parse(JSON.stringify(InitialData.qualityMeasurements || [])); updated = true; }

          // Dynamic patch for Charting Data Streams
          ['evmHistory', 'sprintBurndown', 'cfd', 'dashboardDataSourceVersion', 'resources', 'qualityMeasurements', 'resourceHistogram', 'controlChart'].forEach(key => {
            if (!parsed[key]) {
              parsed[key] = JSON.parse(JSON.stringify(InitialData[key] || []));
              updated = true;
            }
          });

          // Migration to Multi-project Schema
          if (!parsed.projectsList || !parsed.currentProjectId) {
            parsed.projectsList = [];
            parsed.currentProjectId = 'p-1';
            parsed.projectsList.push(extractProjectData('p-1', parsed));
            updated = true;
          } else {
            // Force-sync active root fields from projectsList to avoid inconsistency
            const activeProject = parsed.projectsList.find(p => p.id === parsed.currentProjectId);
            if (activeProject) {
              applyProjectData(parsed, activeProject);
            }
          }

          if (updated) {
            this.saveToStorage(parsed);
          }

          return parsed;
        } else {
          console.warn('[PmpStore] LocalStorage data failed schema validation. Resetting to template.');
        }
      }
    } catch (e) {
      console.error('[PmpStore] Failed parsing LocalStorage JSON:', e);
    }

    // Fallback to initial default data
    const defaultData = JSON.parse(JSON.stringify(InitialData));
    defaultData.projectsList = [];
    defaultData.currentProjectId = 'p-1';
    defaultData.language = 'en';

    const firstProject = extractProjectData('p-1', defaultData);
    // Ensure new module sidebar titles are present
    firstProject.sidebarTitles.changeRequests = firstProject.sidebarTitles.changeRequests || "Change Requests Log";
    firstProject.sidebarTitles.requirements = firstProject.sidebarTitles.requirements || "Requirements Matrix (RTM)";
    defaultData.projectsList.push(firstProject);

    this.saveToStorage(defaultData);
    return defaultData;
  }

  /**
   * Validate structural presence of core properties to avoid UI crashes
   */
  validateStateSchema(data) {
    if (!data) return false;
    const requiredKeys = ['projectInfo', 'documents', 'stakeholders', 'risks', 'schedule', 'costs', 'raci'];
    return requiredKeys.every(key => key in data);
  }

  /**
   * Direct write to LocalStorage
   */
  saveToStorage(data) {
    try {
      localStorage.setItem('pmp_project_data', JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[PmpStore] LocalStorage write failed:', e);
      return false;
    }
  }

  /**
   * Push current state clone into rollback history
   */
  pushHistory() {
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push(JSON.stringify(this.state));
  }

  /**
   * Rollback to last saved state
   */
  rollback() {
    if (this.history.length > 0) {
      const previous = this.history.pop();
      try {
        const parsed = JSON.parse(previous);
        this.state = parsed;
        // Rollback is urgent - flush immediately, skip debounce
        clearTimeout(this._saveTimer);
        this._saveTimer = null;
        this.saveToStorage(this.state);
        this.publish('state-updated', this.state);
        this.publish('notify', { type: 'warning', messageKey: 'msg_rollback_success' });
        return true;
      } catch (e) {
        console.error('[PmpStore] Failed during history parse rollback:', e);
      }
    }
    return false;
  }

  /**
   * Commit state: sync projectsList, notify UI immediately,
   * then debounce the expensive localStorage write (300ms).
   */
  commit() {
    if (this.state.cloud?.role === 'viewer' && !this._allowReadOnlyCommit) {
      if (this._readOnlySnapshot) this.state = JSON.parse(this._readOnlySnapshot);
      this.publish('state-updated', this.state);
      this.publish('notify', {
        type: 'warning',
        message: this.state.language === 'zh' ? '只读成员不能修改共享项目。' : 'Viewers cannot modify the shared project.'
      });
      return false;
    }

    // Keep every Dashboard series synchronized with its operational source.
    // Same-day snapshots are replaced, so rapid edits never create fake history points.
    this.rebuildDerivedDashboardData();
    this.pushHistory();

    // Sync active project data into projectsList
    if (this.state.projectsList && this.state.currentProjectId) {
      const activeIdx = this.state.projectsList.findIndex(p => p.id === this.state.currentProjectId);
      if (activeIdx !== -1) {
        this.state.projectsList[activeIdx] = extractProjectData(this.state.currentProjectId, this.state);
      }
    }

    // Notify UI immediately so renders feel instant
    this.publish('state-updated', this.state);

    // Debounce the actual localStorage write to avoid hammering on rapid changes
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const success = this.saveToStorage(this.state);
      if (!success) {
        this.publish('notify', { type: 'error', messageKey: 'msg_save_error' });
      }
      this._saveTimer = null;
    }, 300);
  }

  /**
   * Flush any pending debounced save immediately (e.g. before app unload).
   */
  flushSave() {
    if (this._saveTimer !== null) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      this.saveToStorage(this.state);
    }
  }

  /**
   * Import project from external JSON payload
   */
  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (this.validateStateSchema(parsed)) {
        this.pushHistory();
        this.state = parsed;
        this.commit();
        this.publish('notify', { type: 'success', messageKey: 'msg_import_success' });
        return true;
      } else {
        throw new Error('JSON 数据缺失 PMP 核心架构键值（例如 risks, schedule, costs）。');
      }
    } catch (e) {
      console.error('[PmpStore] Import failed:', e);
      this.publish('notify', { type: 'error', messageKey: 'msg_import_failed' });
      return false;
    }
  }

  /**
   * Reset database back to default initial template
   */
  resetToDefault() {
    this.pushHistory();
    const defaultData = JSON.parse(JSON.stringify(InitialData));
    defaultData.projectsList = [];
    defaultData.currentProjectId = 'p-1';
    defaultData.language = this.state.language || 'en';
    defaultData.projectsList.push(extractProjectData('p-1', defaultData));
    this.state = defaultData;
    this.commit();
    this.publish('notify', { type: 'success', messageKey: 'msg_reset_success' });
  }

  /**
   * Pub/Sub Event System
   */
  subscribe(topic, callback) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = [];
    }
    this.subscribers[topic].push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers[topic] = this.subscribers[topic].filter(cb => cb !== callback);
    };
  }

  publish(topic, data) {
    if (this.subscribers[topic]) {
      this.subscribers[topic].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[PmpStore] Error executing callback for ${topic}:`, e);
        }
      });
    }
  }

  /**
   * State Mutators
   */
  updateProjectInfo(info) {
    this.state.projectInfo = { ...this.state.projectInfo, ...info };
    this.commit();
  }

  updateDocument(docId, text) {
    this.state.documents[docId] = text;
    this.commit();
  }

  getSharedProjectPayload() {
    const payload = {};
    PROJECT_KEYS.forEach(key => {
      payload[key] = JSON.parse(JSON.stringify(this.state[key] ?? (ARRAY_KEYS.has(key) ? [] : {})));
    });
    return payload;
  }

  applySharedProjectPayload(payload, cloud = {}) {
    if (!payload || typeof payload !== 'object') return false;
    this.pushHistory();
    applyProjectData(this.state, payload);
    this.state.cloud = { ...(this.state.cloud || {}), ...cloud };
    this._allowReadOnlyCommit = true;
    this.commit();
    this._allowReadOnlyCommit = false;
    if (this.state.cloud?.role === 'viewer') this._readOnlySnapshot = JSON.stringify(this.state);
    return true;
  }
  // Stakeholders
  addStakeholder(sh) {
    const newSh = { id: 'sh-' + Date.now(), ...sh };
    this.state.stakeholders.push(newSh);
    this.commit();
  }

  updateStakeholder(id, updated) {
    this.state.stakeholders = this.state.stakeholders.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteStakeholder(id) {
    this.state.stakeholders = this.state.stakeholders.filter(item => item.id !== id);
    this.commit();
  }

  // Risks
  addRisk(risk) {
    const newRisk = { id: 'r-' + Date.now(), ...risk };
    this.state.risks.push(newRisk);
    this.commit();
  }

  updateRisk(id, updated) {
    this.state.risks = this.state.risks.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteRisk(id) {
    this.state.risks = this.state.risks.filter(item => item.id !== id);
    this.commit();
  }

  // Dashboard dependency modules. Chart series are derived from operational records.
  ensureDashboardModules(commit = false) {
    let changed = false;
    if (!Array.isArray(this.state.resources)) { this.state.resources = []; changed = true; }
    if (!Array.isArray(this.state.qualityMeasurements)) { this.state.qualityMeasurements = []; changed = true; }
    if (!Array.isArray(this.state.resourceHistogram)) { this.state.resourceHistogram = []; changed = true; }
    if (!Array.isArray(this.state.controlChart)) { this.state.controlChart = []; changed = true; }
    if (commit && changed) this.commit();
    return changed;
  }

  rebuildResourceHistogram() {
    const buckets = new Map();
    (this.state.resources || []).forEach(resource => {
      const period = resource.period || 'Unscheduled';
      const role = resource.role || resource.name || 'Unassigned';
      const key = `${period}::${role}`;
      const current = buckets.get(key) || { period, role, allocatedHours: 0, capacityHours: 0 };
      current.allocatedHours += Number(resource.allocatedHours) || 0;
      current.capacityHours += Number(resource.capacityHours) || 0;
      buckets.set(key, current);
    });
    this.state.resourceHistogram = Array.from(buckets.values());
  }

  rebuildControlChart() {
    this.state.controlChart = (this.state.qualityMeasurements || []).map((measurement, index) => ({
      sampleId: measurement.sampleId || `S${index + 1}`,
      measurement: Number(measurement.measurement) || 0,
      UCL: Number(measurement.ucl) || 0,
      LCL: Number(measurement.lcl) || 0,
      mean: Number(measurement.target) || 0
    }));
  }

  rebuildEvmHistory() {
    const totals = (this.state.costs || []).reduce((sum, cost) => ({
      PV: sum.PV + (Number(cost.plannedValue) || 0),
      EV: sum.EV + (Number(cost.earnedValue) || 0),
      AC: sum.AC + (Number(cost.actualCost) || 0)
    }), { PV: 0, EV: 0, AC: 0 });
    const timePoint = new Date().toISOString().slice(0, 10);
    const record = { timePoint, ...totals };
    const history = Array.isArray(this.state.evmHistory) ? this.state.evmHistory : [];
    const last = history[history.length - 1];
    this.state.evmHistory = last?.timePoint === timePoint
      ? [...history.slice(0, -1), record]
      : [...history, record].slice(-365);
  }

  rebuildAgileSnapshots() {
    const tasks = this.state.schedule || [];
    const total = tasks.length * 100;
    const remaining = tasks.reduce((sum, task) => sum + (100 - Math.max(0, Math.min(100, Number(task.progress) || 0))), 0);
    const timePoint = new Date().toISOString().slice(0, 10);
    const validStarts = tasks.map(task => new Date(task.startDate)).filter(date => !Number.isNaN(date.getTime()));
    const validEnds = tasks.map(task => new Date(task.endDate)).filter(date => !Number.isNaN(date.getTime()));
    const start = validStarts.length ? new Date(Math.min(...validStarts.map(date => date.getTime()))) : null;
    const end = validEnds.length ? new Date(Math.max(...validEnds.map(date => date.getTime()))) : null;
    const today = new Date(`${timePoint}T00:00:00`);
    const duration = start && end ? Math.max(1, end.getTime() - start.getTime()) : 1;
    const elapsedRatio = start && end
      ? Math.max(0, Math.min(1, (today.getTime() - start.getTime()) / duration))
      : 0;
    const idealRemaining = Math.round(total * (1 - elapsedRatio));
    const burndownRecord = { day: timePoint, idealRemaining, actualRemaining: Math.round(remaining) };
    const burndown = Array.isArray(this.state.sprintBurndown) ? this.state.sprintBurndown : [];
    const lastBurndown = burndown[burndown.length - 1];
    this.state.sprintBurndown = lastBurndown?.day === timePoint
      ? [...burndown.slice(0, -1), burndownRecord]
      : [...burndown, burndownRecord].slice(-365);

    const flowRecord = {
      date: timePoint,
      todo: tasks.filter(task => Number(task.progress || 0) === 0).length,
      inProgress: tasks.filter(task => Number(task.progress || 0) > 0 && Number(task.progress || 0) < 75).length,
      testing: tasks.filter(task => Number(task.progress || 0) >= 75 && Number(task.progress || 0) < 100).length,
      done: tasks.filter(task => Number(task.progress || 0) >= 100).length
    };
    const cfd = Array.isArray(this.state.cfd) ? this.state.cfd : [];
    const lastCfd = cfd[cfd.length - 1];
    this.state.cfd = lastCfd?.date === timePoint ? [...cfd.slice(0, -1), flowRecord] : [...cfd, flowRecord].slice(-365);
  }

  rebuildDerivedDashboardData() {
    this.rebuildResourceHistogram();
    this.rebuildControlChart();
    this.rebuildEvmHistory();
    this.rebuildAgileSnapshots();
  }
  addResource(resource) {
    this.ensureDashboardModules();
    this.state.resources.push({ id: 'res-' + Date.now(), ...resource });
    this.rebuildResourceHistogram();
    this.commit();
  }

  updateResource(id, updated) {
    this.ensureDashboardModules();
    this.state.resources = this.state.resources.map(item => item.id === id ? { ...item, ...updated } : item);
    this.rebuildResourceHistogram();
    this.commit();
  }

  deleteResource(id) {
    this.ensureDashboardModules();
    this.state.resources = this.state.resources.filter(item => item.id !== id);
    this.rebuildResourceHistogram();
    this.commit();
  }

  addQualityMeasurement(measurement) {
    this.ensureDashboardModules();
    this.state.qualityMeasurements.push({ id: 'qm-' + Date.now(), ...measurement });
    this.rebuildControlChart();
    this.commit();
  }

  updateQualityMeasurement(id, updated) {
    this.ensureDashboardModules();
    this.state.qualityMeasurements = this.state.qualityMeasurements.map(item => item.id === id ? { ...item, ...updated } : item);
    this.rebuildControlChart();
    this.commit();
  }

  deleteQualityMeasurement(id) {
    this.ensureDashboardModules();
    this.state.qualityMeasurements = this.state.qualityMeasurements.filter(item => item.id !== id);
    this.rebuildControlChart();
    this.commit();
  }
  // Schedule / Gantt
  addScheduleItem(task) {
    const newTask = { id: 't-' + Date.now(), ...task };
    this.state.schedule.push(newTask);
    this.commit();
  }

  updateScheduleItem(id, updated) {
    this.state.schedule = this.state.schedule.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteScheduleItem(id) {
    this.state.schedule = this.state.schedule.filter(item => item.id !== id);
    this.commit();
  }

  // Costs / Budget
  addCostItem(cost) {
    const newCost = { id: 'c-' + Date.now(), ...cost };
    this.state.costs.push(newCost);
    this.commit();
  }

  updateCostItem(id, updated) {
    this.state.costs = this.state.costs.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteCostItem(id) {
    this.state.costs = this.state.costs.filter(item => item.id !== id);
    this.commit();
  }

  // RACI Matrix
  updateRaci(activityIndex, roleName, value) {
    if (this.state.raci.matrix[activityIndex]) {
      this.state.raci.matrix[activityIndex].roles[roleName] = value;
      this.commit();
    }
  }

  addRaciActivity(activity) {
    const rolesObj = {};
    this.state.raci.roles.forEach(role => {
      rolesObj[role] = '';
    });
    this.state.raci.matrix.push({ activity, roles: rolesObj });
    this.commit();
  }

  deleteRaciActivity(index) {
    this.state.raci.matrix.splice(index, 1);
    this.commit();
  }

  updateRaciRoles(roles) {
    const oldMatrix = this.state.raci.matrix;
    const newMatrix = oldMatrix.map(row => {
      const newRoles = {};
      roles.forEach(role => {
        newRoles[role] = row.roles[role] || '';
      });
      return { activity: row.activity, roles: newRoles };
    });

    this.state.raci.roles = roles;
    this.state.raci.matrix = newMatrix;
    this.commit();
  }

  updateSidebarTitle(tabId, title) {
    if (this.state.sidebarTitles) {
      this.state.sidebarTitles[tabId] = title;
      this.commit();
    }
  }

  // Team Organisation Chart mutators
  addTeamMember(member) {
    const newMember = { id: 'm-' + Date.now(), ...member };
    this.state.team.push(newMember);
    this.commit();
  }

  updateTeamMember(id, updated) {
    this.state.team = this.state.team.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteTeamMember(id) {
    // Break relationships pointing to this deleted node to avoid rendering cycles
    this.state.team = this.state.team.map(item =>
      item.reportsTo === id ? { ...item, reportsTo: '' } : item
    );
    this.state.team = this.state.team.filter(item => item.id !== id);
    this.commit();
  }

  // Action Items mutators
  addActionItem(item) {
    const newItem = { id: 'a-' + Date.now(), ...item };
    this.state.actionItems.push(newItem);
    this.commit();
  }

  updateActionItem(id, updated) {
    this.state.actionItems = this.state.actionItems.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteActionItem(id) {
    this.state.actionItems = this.state.actionItems.filter(item => item.id !== id);
    this.commit();
  }

  // Multi-Project APIs
  switchProject(newProjectId) {
    if (newProjectId === this.state.currentProjectId) return;

    // 1. Save current active state to projectsList
    const currentIdx = this.state.projectsList.findIndex(p => p.id === this.state.currentProjectId);
    if (currentIdx !== -1) {
      this.state.projectsList[currentIdx] = extractProjectData(this.state.currentProjectId, this.state);
    }

    // 2. Load target project data to root
    const targetProject = this.state.projectsList.find(p => p.id === newProjectId);
    if (targetProject) {
      applyProjectData(this.state, targetProject);
      this.state.currentProjectId = newProjectId;

      // Clear history when switching projects to avoid cross-project rollbacks
      this.history = [];
      this.commit();
      this.publish('notify', {
        type: 'success',
        messageKey: 'msg_switched_project',
        params: { name: this.state.projectInfo.name }
      });
    }
  }

  createNewProject(name) {
    // Save current active project first
    const currentIdx = this.state.projectsList.findIndex(p => p.id === this.state.currentProjectId);
    if (currentIdx !== -1) {
      this.state.projectsList[currentIdx] = extractProjectData(this.state.currentProjectId, this.state);
    }

    const newId = 'p-' + Date.now();
    const newProject = {
      id: newId,
      projectInfo: {
        name,
        manager: 'Unassigned',
        sponsor: 'Unassigned',
        status: 'Planning',
        budget: 100000,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        description: 'No business case description yet.'
      },
      documents: {
        developProjectCharter: `# 1. Project Charter\n\n## 1.1 Project Background & Purpose\n(Enter background and business purpose here)\n\n## 1.2 Objectives\n(e.g., timeline, budget, delivery standard)`,
        developProjectManagementPlan: `# 2. Project Management Plan\n\n(Enter planning for each knowledge area here)`,
        defineScope: `# 3. Project Scope Statement\n\n## 3.1 Scope Description\n\n## 3.2 Acceptance Criteria`
      },
      stakeholders: [],
      risks: [],
      schedule: [],
      costs: [],
      raci: {
        roles: ['Project Manager', 'Technical Lead', 'Customer Rep', 'Test Lead'],
        matrix: []
      },
      team: [],
      actionItems: [],
      sidebarTitles: {
        dashboard: "Dashboard",
        matrix: "Process Area Matrix",
        stakeholders: "Stakeholder Register",
        risks: "Risk Register",
        schedule: "Schedule & Gantt",
        cost: "Cost & EVM",
        raci: "RACI Matrix",
        team: "Team Structure",
        actionItems: "Action Items Tracker",
        changeRequests: "Change Requests Log",
        requirements: "Requirements Matrix (RTM)",
            resources: "Resource Management",
            quality: "Quality Management",
            export: "Export & Report"
      },
      changeRequests: [],
      requirements: [],
      dashboardDataSourceVersion: 1,
      resources: [],
      qualityMeasurements: [],
      evmHistory: JSON.parse(JSON.stringify(InitialData.evmHistory || [])),
      sprintBurndown: JSON.parse(JSON.stringify(InitialData.sprintBurndown || [])),
      cfd: JSON.parse(JSON.stringify(InitialData.cfd || [])),
      resourceHistogram: JSON.parse(JSON.stringify(InitialData.resourceHistogram || [])),
      controlChart: JSON.parse(JSON.stringify(InitialData.controlChart || []))
    };

    this.state.projectsList.push(newProject);
    applyProjectData(this.state, newProject);
    this.state.currentProjectId = newId;

    this.history = [];
    this.commit();
    this.publish('notify', {
      type: 'success',
      messageKey: 'msg_switched_project',
      params: { name }
    });
  }

  deleteProject(projectId) {
    if (this.state.projectsList.length <= 1) {
      this.publish('notify', { type: 'error', messageKey: 'msg_cannot_delete_last_project' });
      return false;
    }

    const indexToDelete = this.state.projectsList.findIndex(p => p.id === projectId);
    if (indexToDelete === -1) return false;

    this.state.projectsList = this.state.projectsList.filter(p => p.id !== projectId);

    // If we deleted the active project, switch to first remaining
    if (this.state.currentProjectId === projectId) {
      const nextProject = this.state.projectsList[0];
      applyProjectData(this.state, nextProject);
      this.state.currentProjectId = nextProject.id;
    }

    this.history = [];
    this.commit();
    this.publish('notify', { type: 'success', messageKey: 'msg_project_deleted' });
    return true;
  }

  // Change Requests Mutators
  addChangeRequest(cr) {
    if (!this.state.changeRequests) this.state.changeRequests = [];
    const newCr = { id: 'cr-' + Date.now(), dateRaised: new Date().toISOString().split('T')[0], ...cr };
    this.state.changeRequests.push(newCr);
    this.commit();
  }

  updateChangeRequest(id, updated) {
    if (!this.state.changeRequests) this.state.changeRequests = [];
    this.state.changeRequests = this.state.changeRequests.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteChangeRequest(id) {
    if (!this.state.changeRequests) this.state.changeRequests = [];
    this.state.changeRequests = this.state.changeRequests.filter(item => item.id !== id);
    this.commit();
  }

  // Requirements Mutators
  addRequirement(req) {
    if (!this.state.requirements) this.state.requirements = [];
    const newReq = { id: 'req-' + Date.now(), ...req };
    this.state.requirements.push(newReq);
    this.commit();
  }

  updateRequirement(id, updated) {
    if (!this.state.requirements) this.state.requirements = [];
    this.state.requirements = this.state.requirements.map(item =>
      item.id === id ? { ...item, ...updated } : item
    );
    this.commit();
  }

  deleteRequirement(id) {
    if (!this.state.requirements) this.state.requirements = [];
    this.state.requirements = this.state.requirements.filter(item => item.id !== id);
    this.commit();
  }

  changeLanguage(lang) {
    this.state = translateKnownData(this.state, lang);
    this.state.language = lang;
    this.commit();
  }
}

export const store = new PmpStore();
window.pmpStore = store; // attach globally for debug

// Flush any pending debounced save before the page unloads to prevent data loss
window.addEventListener('beforeunload', () => store.flushSave());

export default store;

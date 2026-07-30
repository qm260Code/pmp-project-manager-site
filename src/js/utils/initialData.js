/**
 * Baseline Project Template Data
 * Focus: Smart Warehousing & Cold Chain Logistics Digital Upgrade Project
 * Language: English (Default)
 */
export const InitialData = {
  projectInfo: {
    name: 'Smart Warehousing & Cold Chain Logistics Digital Upgrade',
    manager: 'Li Guoqiang (PMP)',
    sponsor: 'Zhang Jianhua (Group VP)',
    status: 'In Progress',
    startDate: '2026-06-01',
    endDate: '2026-11-30',
    budget: 500000,
    description: 'Implement real-time digital monitoring for logistics operations via IoT sensors, automated warehousing system (WMS), and temperature sensors. Target a 20% throughput increase and 100% transport safety compliance.'
  },
  sidebarTitles: {
    dashboard: "Project Dashboard",
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
    export: "Export & Reports"
  },
  // Text contents for PMP major deliverables (English Default)
  documents: {
    // Initiating
    developProjectCharter: `# 1. Project Charter
## 1.1 Project Background & Purpose
The current cold chain storage and logistics have low automation and lack real-time temperature/humidity monitoring. This creates food safety risks and compliance audit gaps. The project aims to upgrade the warehouse logistics management system through digitization.

## 1.2 Project Objectives
* Deploy the system before Nov 30, 2026, within a budget of 500,000 RMB.
* Reach a 100% cold chain temperature compliance rate and eliminate manual monitoring.
* Improve warehouse throughput and sorting efficiency by over 20%.

## 1.3 High-Level Milestones
1. Project charter signed: 2026-06-15
2. System requirements and outline design: 2026-07-15
3. Sensor hardware procurement and core WMS integration: 2026-09-15
4. Site deployment, network setup, and team training: 2026-10-15
5. UAT testing and official go-live: 2026-11-15
6. Project contract closing and handover: 2026-11-30

## 1.4 High-Level Risks
* Supply chain constraints delaying custom temperature sensor delivery.
* Steel structure of the warehouse shielding IoT signals and causing data packet loss.
* Warehouse staff resisting the new digital tools due to operational complexity.`,

    // Planning
    developProjectManagementPlan: `# 2. Project Management Plan
## 2.1 Integration Management Plan
Coordinated by Project Manager Li Guoqiang. Conduct weekly milestone reviews. Any scope, cost, or schedule baseline changes must be approved by the Change Control Board (CCB).

## 2.2 Scope Management Plan
Refer to WBS and Scope Statement. Establish a rigorous scope baseline to prevent unapproved scope creep.

## 2.3 Schedule & Cost Baselines
* Schedule Baseline: Follow up weekly using SVG Gantt chart and actual progress percentages.
* Cost Baseline: Allocate the 500,000 RMB budget to specific WBS packages. Monitor weekly using Earned Value Management (EVM).`,

    defineScope: `# 3. Project Scope Statement
## 3.1 Project Scope Description
Included in this project:
1. Deploy WiFi/LoRa IoT mesh network in 3 main logistics centers.
2. Procure, calibrate, and install 50 cold-chain temperature sensors.
3. Integrate and develop the WMS inventory, cold chain monitoring, and warning center modules.
4. Conduct hands-on system training for warehouse administrators and operators.

## 3.2 Acceptance Criteria
* Sensors report data at intervals <= 5 minutes with a packet loss rate < 0.1%.
* WMS system handles 100+ concurrent sensor uploads with response time < 2s.
* Power outage and hardware warnings send SMS alerts within 30s.

## 3.3 Out of Scope
* Physical renovation of warehouse elevator shafts or racking systems.
* GPS fleet tracking for external long-haul transportation (deferred to Phase 2).`,

    planQualityManagement: `# 4. Quality Management Plan
## 4.1 Quality Metrics
* Sensor calibration bias: temperature <= ±0.2°C, humidity <= ±2% RH.
* System availability: uptime >= 99.9% annually.
* Code coverage: unit tests >= 85%, UAT test cases pass rate = 100%.

## 4.2 Quality Control Methods
* Enforce developer peer code reviews before commits.
* Calibrate all IoT sensors in labs before deployment.
* Conduct continuous 48-hour system stress testing.`,

    planCommunicationsManagement: `# 5. Communications Management Plan
## 5.1 Communication Matrix
* **Daily Standup**: Project team, 15 mins, status updates and blockers, verbal.
* **Weekly Status Report**: PM to Sponsor and Customer representative, EVM status and risk log, email.
* **Monthly Milestone Review**: Sponsor, Customer, PM, and Tech Lead, demo deliverables and reviews, meeting.`
  },

  // Stakeholders Registry
  stakeholders: [
    { id: 'sh-1', name: 'Zhang Jianhua', role: 'Project Sponsor / Group VP', power: 5, interest: 5, engagement: 'Supportive', strategy: 'Weekly financial updates, regular milestone syncs to maintain alignment.' },
    { id: 'sh-2', name: 'Wang Zhiqiang', role: 'Key User / Logistics Director', power: 4, interest: 5, engagement: 'Leading', strategy: 'Involve deeply in UAT designs and system demos, ensure operational satisfaction.' },
    { id: 'sh-3', name: 'Liu Ming', role: 'Tech Lead / Software Architect', power: 3, interest: 5, engagement: 'Supportive', strategy: 'Delegate technical path design, resolve blockers in daily standups.' },
    { id: 'sh-4', name: 'Chen Xiaoli', role: 'QA Manager / Test Lead', power: 3, interest: 3, engagement: 'Neutral', strategy: 'Provide test report drafts and compliance specs to secure support.' },
    { id: 'sh-5', name: 'Zhao Tiezhu', role: 'Vendor PM / Sensor Supplier', power: 2, interest: 4, engagement: 'Resistant', strategy: 'Monitor supply chain delivery SLA, check dates closely.' },
    { id: 'sh-6', name: 'Wang Xiaoer', role: 'Warehouse Operator Rep', power: 1, interest: 3, engagement: 'Neutral', strategy: 'Provide clear manuals and hands-on training to ease transition anxiety.' }
  ],

  // Risks Registry
  risks: [
    { id: 'r-1', description: 'IoT sensor shipment delays impact onsite installation schedule', category: 'External', probability: 4, impact: 3, strategy: 'Mitigate', owner: 'Zhao Tiezhu', status: 'Active' },
    { id: 'r-2', description: 'Warehouse steel structure shields signals, causing LoRa data loss', category: 'Technical', probability: 3, impact: 4, strategy: 'Mitigate', owner: 'Liu Ming', status: 'Active' },
    { id: 'r-3', description: 'Business departments request out-of-scope integrations, causing scope creep', category: 'Project Management', probability: 3, impact: 3, strategy: 'Avoid', owner: 'Li Guoqiang', status: 'Active' },
    { id: 'r-4', description: 'Warehouse staff resist new system operations, slowing system adoption', category: 'Organizational', probability: 2, impact: 4, strategy: 'Mitigate', owner: 'Li Guoqiang', status: 'Active' },
    { id: 'r-5', description: 'Budget cuts from corporate delaying project payments', category: 'Organizational', probability: 1, impact: 5, strategy: 'Transfer', owner: 'Zhang Jianhua', status: 'Active' }
  ],

  // Schedule WBS
  schedule: [
    { id: 't-1', name: 'Project Charter Signed (Milestone)', startDate: '2026-06-01', endDate: '2026-06-15', progress: 100, owner: 'Li Guoqiang', dependencies: '' },
    { id: 't-2', name: 'Requirements Analysis & System Design', startDate: '2026-06-16', endDate: '2026-07-15', progress: 95, owner: 'Wang Zhiqiang', dependencies: 't-1' },
    { id: 't-3', name: 'Sensor Procurement & Lab Calibration', startDate: '2026-07-16', endDate: '2026-08-20', progress: 60, owner: 'Zhao Tiezhu', dependencies: 't-2' },
    { id: 't-4', name: 'WMS Cold Chain & Alert Module Development', startDate: '2026-07-16', endDate: '2026-09-15', progress: 40, owner: 'Liu Ming', dependencies: 't-2' },
    { id: 't-5', name: 'Wireless Mesh Setup & Hardware Site Deployment', startDate: '2026-09-16', endDate: '2026-10-15', progress: 0, owner: 'Liu Ming', dependencies: 't-3,t-4' },
    { id: 't-6', name: 'System Integration & User Acceptance Testing (Milestone)', startDate: '2026-10-16', endDate: '2026-11-15', progress: 0, owner: 'Chen Xiaoli', dependencies: 't-5' },
    { id: 't-7', name: 'System Go-Live, Training & Project Closing', startDate: '2026-11-16', endDate: '2026-11-30', progress: 0, owner: 'Li Guoqiang', dependencies: 't-6' }
  ],

  // Costs (EVM Baseline)
  costs: [
    { id: 'c-1', description: 'Consulting fees & project outline preparation', plannedValue: 50000, earnedValue: 50000, actualCost: 48000 },
    { id: 'c-2', description: 'WMS software licenses & database setup', plannedValue: 150000, earnedValue: 142500, actualCost: 145000 },
    { id: 'c-3', description: 'IoT sensors & master gateway hardware procurement', plannedValue: 120000, earnedValue: 72000, actualCost: 82000 },
    { id: 'c-4', description: 'Onsite cabling, mesh installation & scaffolding', plannedValue: 80000, earnedValue: 32000, actualCost: 42000 },
    { id: 'c-5', description: 'System integration services & custom APIs', plannedValue: 60000, earnedValue: 0, actualCost: 0 },
    { id: 'c-6', description: 'Project management overhead, travel & training', plannedValue: 40000, earnedValue: 0, actualCost: 0 }
  ],

  // RACI Matrix
  raci: {
    roles: ['Li Guoqiang (PM)', 'Zhang Jianhua (Sponsor)', 'Wang Zhiqiang (Customer)', 'Liu Ming (Tech Lead)', 'Chen Xiaoli (QA)', 'Zhao Tiezhu (Vendor)'],
    matrix: [
      { activity: 'Create Project Charter', roles: { 'Li Guoqiang (PM)': 'A', 'Zhang Jianhua (Sponsor)': 'R', 'Wang Zhiqiang (Customer)': 'C', 'Liu Ming (Tech Lead)': 'C', 'Chen Xiaoli (QA)': 'I', 'Zhao Tiezhu (Vendor)': 'I' } },
      { activity: 'Gather Core Requirements', roles: { 'Li Guoqiang (PM)': 'A', 'Zhang Jianhua (Sponsor)': 'I', 'Wang Zhiqiang (Customer)': 'R', 'Liu Ming (Tech Lead)': 'R', 'Chen Xiaoli (QA)': 'C', 'Zhao Tiezhu (Vendor)': 'C' } },
      { activity: 'Develop Work Breakdown Structure (WBS)', roles: { 'Li Guoqiang (PM)': 'A', 'Zhang Jianhua (Sponsor)': 'I', 'Wang Zhiqiang (Customer)': 'C', 'Liu Ming (Tech Lead)': 'R', 'Chen Xiaoli (QA)': 'I', 'Zhao Tiezhu (Vendor)': 'I' } },
      { activity: 'Hardware Installation & Integration', roles: { 'Li Guoqiang (PM)': 'A', 'Zhang Jianhua (Sponsor)': 'I', 'Wang Zhiqiang (Customer)': 'I', 'Liu Ming (Tech Lead)': 'R', 'Chen Xiaoli (QA)': 'R', 'Zhao Tiezhu (Vendor)': 'R' } },
      { activity: 'Formulate Risk Response Plans', roles: { 'Li Guoqiang (PM)': 'A', 'Zhang Jianhua (Sponsor)': 'R', 'Wang Zhiqiang (Customer)': 'C', 'Liu Ming (Tech Lead)': 'R', 'Chen Xiaoli (QA)': 'C', 'Zhao Tiezhu (Vendor)': 'R' } },
      { activity: 'User Acceptance Testing (UAT)', roles: { 'Li Guoqiang (PM)': 'C', 'Zhang Jianhua (Sponsor)': 'I', 'Wang Zhiqiang (Customer)': 'A', 'Liu Ming (Tech Lead)': 'C', 'Chen Xiaoli (QA)': 'R', 'Zhao Tiezhu (Vendor)': 'I' } },
      { activity: 'Project Closing & Contract Handover', roles: { 'Li Guoqiang (PM)': 'A', 'Zhang Jianhua (Sponsor)': 'R', 'Wang Zhiqiang (Customer)': 'R', 'Liu Ming (Tech Lead)': 'I', 'Chen Xiaoli (QA)': 'I', 'Zhao Tiezhu (Vendor)': 'C' } }
    ]
  },
  
  // Team Register
  team: [
    { id: 'm-1', name: 'Li Guoqiang', role: 'Project Manager (PM)', department: 'PMO', reportsTo: '' },
    { id: 'm-2', name: 'Zhang Jianhua', role: 'Project Sponsor', department: 'Executive Board', reportsTo: '' },
    { id: 'm-3', name: 'Liu Ming', role: 'Tech Lead / Architect', department: 'R&D Dept', reportsTo: 'm-1' },
    { id: 'm-4', name: 'Chen Xiaoli', role: 'QA Manager', department: 'Quality Assurance', reportsTo: 'm-1' },
    { id: 'm-5', name: 'Zhao Tiezhu', role: 'Vendor PM', department: 'Supply Chain Dept', reportsTo: 'm-1' },
    { id: 'm-6', name: 'Zhang San', role: 'Senior Software Engineer (SE)', department: 'R&D Dept', reportsTo: 'm-3' },
    { id: 'm-7', name: 'Li Si', role: 'QA Test Engineer (STE)', department: 'Quality Assurance', reportsTo: 'm-4' }
  ],
  
  actionItems: [
    { id: 'a-1', content: 'Test IoT temperature sensors in lab under low-power mode', triggerDate: '2026-06-10', owner: 'Chen Xiaoli', targetDate: '2026-06-20', delayDays: 0, priority: 'High', status: 'Pending' },
    { id: 'a-2', content: 'Submit WMS network topology schema of Warehouse #1 to Wang Zhiqiang', triggerDate: '2026-06-12', owner: 'Liu Ming', targetDate: '2026-06-18', delayDays: 2, priority: 'Medium', status: 'Completed' },
    { id: 'a-3', content: 'Draft memo for Phase 2 fleet GPS tracking integration plans', triggerDate: '2026-06-15', owner: 'Li Guoqiang', targetDate: '2026-06-30', delayDays: 0, priority: 'Low', status: 'Pending' }
  ],
  
  dashboardDataSourceVersion: 0,

  // Resource and quality operational records are the source of Dashboard charts.
  resources: [
    { id: 'res-1', name: 'Development squad', type: 'Labor', role: 'Dev Team', period: 'W1', allocatedHours: 140, capacityHours: 160, workPackage: 'WBS 2.1', owner: 'Liu Ming', status: 'Assigned' },
    { id: 'res-2', name: 'Development squad', type: 'Labor', role: 'Dev Team', period: 'W2', allocatedHours: 160, capacityHours: 160, workPackage: 'WBS 2.2', owner: 'Liu Ming', status: 'Assigned' },
    { id: 'res-3', name: 'QA team', type: 'Labor', role: 'QA Team', period: 'W3', allocatedHours: 130, capacityHours: 120, workPackage: 'WBS 3.1', owner: 'Chen Xiaoli', status: 'Assigned' }
  ],
  qualityMeasurements: [
    { id: 'qm-1', sampleId: 'S1', metric: 'Sensor response time (s)', measurement: 5.1, target: 5.0, ucl: 6.0, lcl: 4.0, acceptanceCriteria: '4.0 to 6.0 seconds', verificationMethod: 'Bench test', owner: 'Chen Xiaoli', status: 'Verified' },
    { id: 'qm-2', sampleId: 'S2', metric: 'Sensor response time (s)', measurement: 6.2, target: 5.0, ucl: 6.0, lcl: 4.0, acceptanceCriteria: '4.0 to 6.0 seconds', verificationMethod: 'Bench test', owner: 'Chen Xiaoli', status: 'Open' }
  ],
  // Dashboard Charting Module - derived fallback data streams
  evmHistory: [
    { timePoint: '2026-06-15', PV: 20000, EV: 20000, AC: 18000 },
    { timePoint: '2026-06-30', PV: 50000, EV: 48000, AC: 52000 },
    { timePoint: '2026-07-15', PV: 90000, EV: 85000, AC: 95000 },
    { timePoint: '2026-07-31', PV: 140000, EV: 130000, AC: 145000 },
    { timePoint: '2026-08-15', PV: 200000, EV: 180000, AC: 210000 },
    { timePoint: '2026-08-31', PV: 260000, EV: 246500, AC: 269000 }
  ],
  sprintBurndown: [
    { day: 'Day 1', idealRemaining: 100, actualRemaining: 100 },
    { day: 'Day 2', idealRemaining: 90, actualRemaining: 95 },
    { day: 'Day 3', idealRemaining: 80, actualRemaining: 90 },
    { day: 'Day 4', idealRemaining: 70, actualRemaining: 75 },
    { day: 'Day 5', idealRemaining: 60, actualRemaining: 65 },
    { day: 'Day 6', idealRemaining: 50, actualRemaining: 60 },
    { day: 'Day 7', idealRemaining: 40, actualRemaining: 55 },
    { day: 'Day 8', idealRemaining: 30, actualRemaining: 40 },
    { day: 'Day 9', idealRemaining: 20, actualRemaining: 25 },
    { day: 'Day 10', idealRemaining: 10, actualRemaining: 15 },
    { day: 'Day 11', idealRemaining: 0, actualRemaining: 5 }
  ],
  cfd: [
    { date: '2026-06-01', todo: 50, inProgress: 10, testing: 0, done: 0 },
    { date: '2026-06-08', todo: 40, inProgress: 15, testing: 5, done: 0 },
    { date: '2026-06-15', todo: 30, inProgress: 18, testing: 7, done: 5 },
    { date: '2026-06-22', todo: 20, inProgress: 20, testing: 10, done: 10 },
    { date: '2026-06-29', todo: 15, inProgress: 15, testing: 15, done: 15 },
    { date: '2026-07-06', todo: 5, inProgress: 10, testing: 20, done: 25 }
  ],
  resourceHistogram: [
    { period: 'W1', role: 'Dev Team', allocatedHours: 140, capacityHours: 160 },
    { period: 'W2', role: 'Dev Team', allocatedHours: 160, capacityHours: 160 },
    { period: 'W3', role: 'Dev Team', allocatedHours: 190, capacityHours: 160 },
    { period: 'W4', role: 'Dev Team', allocatedHours: 150, capacityHours: 160 },
    { period: 'W5', role: 'QA Team', allocatedHours: 100, capacityHours: 120 },
    { period: 'W6', role: 'QA Team', allocatedHours: 130, capacityHours: 120 }
  ],
  controlChart: [
    { sampleId: 'S1', measurement: 5.1, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S2', measurement: 5.2, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S3', measurement: 4.9, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S4', measurement: 5.8, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S5', measurement: 6.2, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S6', measurement: 5.5, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S7', measurement: 5.6, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S8', measurement: 5.7, UCL: 6.0, LCL: 4.0, mean: 5.0 },
    { sampleId: 'S9', measurement: 5.8, UCL: 6.0, LCL: 4.0, mean: 5.0 }
  ]
};

/**
 * PMP Mathematical & Logical Calculators
 */
export const PmpCalculators = {
  /**
   * EVM (Earned Value Management) Calculations
   */
  calculateEVM(costs, projectBudget = 0) {
    // Aggregates PV, EV, AC from costs array
    let totalPV = 0;
    let totalEV = 0;
    let totalAC = 0;

    if (Array.isArray(costs)) {
      costs.forEach(item => {
        totalPV += Number(item.plannedValue || 0);
        totalEV += Number(item.earnedValue || 0);
        totalAC += Number(item.actualCost || 0);
      });
    }

    const BAC = projectBudget > 0 ? projectBudget : totalPV; // Budget at Completion
    const CV = totalEV - totalAC; // Cost Variance
    const SV = totalEV - totalPV; // Schedule Variance

    // Performance Indices
    const CPI = totalAC === 0 ? (totalEV > 0 ? totalEV : 1.0) : totalEV / totalAC;
    const SPI = totalPV === 0 ? (totalEV > 0 ? totalEV : 1.0) : totalEV / totalPV;

    // Forecasting
    // EAC = Estimate At Completion (assuming current CPI is typical)
    const EAC = CPI === 0 ? BAC : BAC / CPI;
    const ETC = EAC - totalAC; // Estimate To Complete
    const VAC = BAC - EAC; // Variance At Completion

    return {
      PV: totalPV,
      EV: totalEV,
      AC: totalAC,
      BAC,
      CV,
      SV,
      CPI,
      SPI,
      EAC,
      ETC,
      VAC
    };
  },

  /**
   * Risk Rating (Qualitative Risk Analysis)
   * Probability (1-5), Impact (1-5)
   */
  calculateRisk(probability, impact) {
    const p = Math.max(1, Math.min(5, Number(probability || 1)));
    const i = Math.max(1, Math.min(5, Number(impact || 1)));
    const score = p * i;
    
    let rating = 'Low';
    if (score >= 12) {
      rating = 'High';
    } else if (score >= 5) {
      rating = 'Medium';
    }

    return {
      probability: p,
      impact: i,
      score,
      rating
    };
  },

  /**
   * Date formatting and math
   */
  parseDate(dateString) {
    if (!dateString) return new Date();
    return new Date(dateString);
  },

  formatDate(date) {
    if (!date || isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  getDaysDifference(d1, d2) {
    const timeDiff = d2.getTime() - d1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  },

  /**
   * Gantt Chart positioning helpers
   * Computes left-offset and width in pixels for SVG drawing
   */
  getGanttBarLayout(taskStartStr, taskEndStr, projectStartStr, projectEndStr, chartWidth) {
    const projectStart = this.parseDate(projectStartStr);
    const projectEnd = this.parseDate(projectEndStr);
    const taskStart = this.parseDate(taskStartStr);
    const taskEnd = this.parseDate(taskEndStr);

    const projectDuration = Math.max(1, this.getDaysDifference(projectStart, projectEnd));
    
    // Compute pixel offsets
    let offsetDays = this.getDaysDifference(projectStart, taskStart);
    if (offsetDays < 0) offsetDays = 0;
    
    let taskDays = this.getDaysDifference(taskStart, taskEnd);
    if (taskDays < 0) taskDays = 0;

    const left = (offsetDays / projectDuration) * chartWidth;
    const width = (taskDays / projectDuration) * chartWidth;

    return {
      left: Math.max(0, Math.min(chartWidth, left)),
      width: Math.max(5, Math.min(chartWidth - left, width)) // minimum 5px bar so it is visible
    };
  }
};

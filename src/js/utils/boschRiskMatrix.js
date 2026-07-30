export const BOSCH_RISK_LEVELS = {
  threat: [
    ['attention', 'attention', 'critical', 'critical', 'critical'],
    ['attention', 'attention', 'critical', 'critical', 'critical'],
    ['neutral', 'attention', 'attention', 'critical', 'critical'],
    ['neutral', 'neutral', 'attention', 'attention', 'attention'],
    ['neutral', 'neutral', 'neutral', 'attention', 'attention']
  ],
  opportunity: [
    ['strong', 'strong', 'strong', 'positive', 'positive'],
    ['strong', 'strong', 'positive', 'positive', 'positive'],
    ['strong', 'positive', 'positive', 'positive', 'neutral'],
    ['positive', 'positive', 'positive', 'neutral', 'neutral'],
    ['positive', 'positive', 'neutral', 'neutral', 'neutral']
  ]
};

export function normalizeRiskType(risk) {
  return risk?.type === 'opportunity' ? 'opportunity' : 'threat';
}

export function getBoschRiskLevel(type, probability, impact) {
  const normalizedType = type === 'opportunity' ? 'opportunity' : 'threat';
  const p = Math.max(1, Math.min(5, Number(probability) || 1));
  const i = Math.max(1, Math.min(5, Number(impact) || 1));
  return BOSCH_RISK_LEVELS[normalizedType][5 - p][normalizedType === 'threat' ? i - 1 : 5 - i];
}

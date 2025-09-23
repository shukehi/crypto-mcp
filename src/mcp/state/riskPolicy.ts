export type RiskPolicy = {
  perTradeMaxRiskPct: number;
  maxLeverage: number;
  dailyDrawdownStopPct: number;
  allowlist: string[];
};

const defaultPolicy: RiskPolicy = {
  perTradeMaxRiskPct: 2,
  maxLeverage: 3,
  dailyDrawdownStopPct: 3,
  allowlist: [],
};

let currentPolicy: RiskPolicy = { ...defaultPolicy };

export function getRiskPolicy(): RiskPolicy {
  return { ...currentPolicy, allowlist: [...currentPolicy.allowlist] };
}

export function setRiskPolicy(update: Partial<RiskPolicy>): RiskPolicy {
  currentPolicy = {
    ...currentPolicy,
    ...update,
    allowlist: update.allowlist ? [...update.allowlist] : currentPolicy.allowlist,
  };
  return getRiskPolicy();
}

export function resetRiskPolicy(): RiskPolicy {
  currentPolicy = { ...defaultPolicy };
  return getRiskPolicy();
}

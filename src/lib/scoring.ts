export type Tier = 1 | 2 | 3;

export interface Requirement {
  id: string;
  name: string;
  tier: Tier;
  weight: number;
  isRequired: boolean;
  minScore: number;
}

export interface RequirementScore {
  requirementId: string;
  score: number; // 0-100
}

export type Verdict = "strong_match" | "potential_match" | "not_suitable";

export interface SuitabilityResult {
  suitability: number; // 0-100, two decimals
  verdict: Verdict;
  gatesPassed: boolean;
  breakdown: {
    requirementId: string;
    name: string;
    tier: Tier;
    weight: number;
    score: number;
    gateFailed: boolean;
  }[];
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function computeSuitability(
  requirements: Requirement[],
  scores: RequirementScore[]
): SuitabilityResult {
  const byId = new Map(scores.map((s) => [s.requirementId, clamp(s.score)]));

  const breakdown = requirements.map((r) => {
    const score = byId.get(r.id) ?? 0; // unanswered counts as 0
    return {
      requirementId: r.id,
      name: r.name,
      tier: r.tier,
      weight: r.weight,
      score,
      gateFailed: r.isRequired && score < r.minScore,
    };
  });

  const totalWeight = breakdown.reduce((a, b) => a + b.weight, 0);
  const weighted = breakdown.reduce((a, b) => a + b.score * b.weight, 0);
  const suitability = totalWeight
    ? Math.round((weighted / totalWeight) * 100) / 100
    : 0;

  const gatesPassed = !breakdown.some((b) => b.gateFailed);
  const verdict: Verdict =
    !gatesPassed || suitability < 60
      ? "not_suitable"
      : suitability >= 80
      ? "strong_match"
      : "potential_match";

  return { suitability, verdict, gatesPassed, breakdown };
}

// A failed Tier 1 gate means later tiers can be skipped.
export function shouldStopEarly(
  requirements: Requirement[],
  scores: RequirementScore[]
): boolean {
  const byId = new Map(scores.map((s) => [s.requirementId, s.score]));
  return requirements.some((r) => {
    const score = byId.get(r.id);
    return r.tier === 1 && r.isRequired && score !== undefined && score < r.minScore;
  });
}

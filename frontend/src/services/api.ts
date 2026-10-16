import { ClaimDecision, AuditRecord, EvidenceRecord, GradingResult, IndexDoctorSimulation } from '../types/contracts';

export interface ClaimBundle {
  _case: number;
  _label: string;
  _description: string;
  grading: GradingResult;
  evidence: EvidenceRecord;
  decision: ClaimDecision;
  audit: AuditRecord;
}

export interface AdjusterDecisionRequest {
  adjuster_id: string;
  action: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  notes: string;
}

export interface ValidationSummary {
  frozen_protocol: {
    frozen_commit_hash: string;
    frozen_commit_timestamp: string;
    trigger_percentile_cutoff: number;
    ndvi_stress_cutoff_z: number;
    critical_growth_stage: string;
    protocol_file: string;
    sql_file: string;
    status: string;
  };
  ablation_study: Array<{
    arm_id: string;
    arm_name: string;
    description: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    false_escalation_rate: number;
    abstain_rate: number;
    natural_gaps_caught: number;
    total_natural_gaps: number;
    gap_detection_rate: number;
    latency_ms: number;
    cost_per_claim_usd: number;
  }>;
  risk_coverage_curve: Array<{
    coverage_pct: number;
    precision_pct: number;
    abstain_pct: number;
    label: string;
  }>;
  integrity_forensics: {
    total_planted_bundles: number;
    detected_bundles: number;
    detection_rate_pct: number;
    false_holds_on_clean_bundles: number;
    breakdown: Array<{
      attack_vector: string;
      tested: number;
      caught: number;
      tool: string;
    }>;
  };
  unit_economics: {
    assumed_annual_claims: number;
    manual_field_visit_cost_usd: number;
    ai_triage_cost_per_claim_usd: number;
    abstain_rate_pct: number;
    manual_cost_baseline_usd: number;
    fieldproof_hybrid_cost_usd: number;
    net_savings_usd: number;
    operational_savings_pct: number;
    decision_turnaround_hours: number;
    traditional_turnaround_days: number;
  };
}

export interface PolicyClausesResponse {
  policy_ref: string;
  description: string;
  clauses: Array<{
    clause_id: string;
    section: number;
    title: string;
    summary: string;
    maps_to_outcome: string | null;
    maps_to_action: string | null;
  }>;
}

const API_BASE = '/api';

export const api = {
  async getClaims(): Promise<ClaimBundle[]> {
    try {
      const res = await fetch(`${API_BASE}/claims`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn("Failed to fetch claims from backend, falling back to local mock data", e);
      const res = await fetch('/contracts/demo_cases.mock.json');
      return await res.json();
    }
  },

  async getClaim(claimId: string): Promise<ClaimBundle> {
    const res = await fetch(`${API_BASE}/claims/${claimId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async recordDecision(claimId: string, req: AdjusterDecisionRequest): Promise<ClaimBundle> {
    const res = await fetch(`${API_BASE}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async uploadClaim(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/claims/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async simulateIndexDoctor(percentile: number): Promise<IndexDoctorSimulation> {
    const res = await fetch(`${API_BASE}/index-doctor/simulate?percentile=${percentile}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getValidationSummary(): Promise<ValidationSummary> {
    const res = await fetch(`${API_BASE}/validation/summary`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getPolicyClauses(): Promise<PolicyClausesResponse> {
    const res = await fetch(`${API_BASE}/policy/clauses`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getPolicyText(): Promise<{ policy_ref: string; title: string; full_text: string }> {
    const res = await fetch(`${API_BASE}/policy/text`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
};

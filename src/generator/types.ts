/** Минимальная форма входа генератора после JSON.parse (ожидается внешний Ajv-валидатор). */

export interface TruthBrief {
  readonly name: string;
  readonly category?: string;
  readonly website?: string;
  readonly short_description: string;
  readonly audiences?: readonly string[];
}

export interface TruthPositioning {
  readonly use_cases?: readonly string[];
  readonly fit_for?: readonly string[];
  readonly not_fit_for?: readonly string[];
}

export interface TruthClaim {
  readonly id: string;
  readonly statement: string;
  readonly kind?: string;
  readonly truth_status: "evidenced" | "hypothesis" | "policy_forbidden";
  readonly evidence_ids?: readonly string[];
  readonly entity_id?: string;
}

export interface TruthEvidence {
  readonly id: string;
  readonly kind?: string;
  readonly citation: string;
  readonly url?: string;
  readonly source_refs?: readonly Record<string, unknown>[];
}

export interface TruthCompetitor {
  readonly name?: string;
  readonly notes?: string;
}

export interface ProductTruthModel {
  readonly schema_version: string;
  readonly product_id: string;
  readonly updated_at: string;
  readonly brief: TruthBrief;
  readonly positioning?: TruthPositioning;
  readonly competitor_context?: readonly TruthCompetitor[];
  readonly claims: readonly TruthClaim[];
  readonly evidence: readonly TruthEvidence[];
  readonly target_llm_queries: readonly {
    readonly query: string;
    readonly coverage_doc_slugs?: readonly string[];
  }[];
  readonly source_of_truth: Record<string, unknown>;
  readonly policy_constraints: readonly string[];
}

export interface ManifestArtifactRow {
  readonly type: string;
  readonly relative_path: string;
  readonly url: string;
  readonly media_type: string;
}

export interface PackageIndexManifest {
  readonly package_version: string;
  readonly generated_at: string;
  readonly product_id: string;
  readonly base_url: string;
  readonly artifacts: readonly ManifestArtifactRow[];
}

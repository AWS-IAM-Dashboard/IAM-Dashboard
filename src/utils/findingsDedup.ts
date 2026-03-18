import findingsRules from '../config/findings-rules.json';

type Finding = Record<string, any>;

type FindingsRules = {
  suppression?: {
    enabled?: boolean;
    suppressSeverities?: string[];
    fieldMatches?: Array<{
      field: string;
      regex: string;
      flags?: string;
    }>;
  };
  deduplication?: {
    enabled?: boolean;
    identityStrategies?: Array<{
      requiredFields: string[];
      fingerprintFields: string[];
    }>;
  };
};

const rules = findingsRules as FindingsRules;

function normalizeSeverity(severity: unknown): string {
  const s = typeof severity === 'string' ? severity : String(severity ?? '');
  return s.trim().toLowerCase();
}

function severityRank(severity: unknown): number {
  switch (normalizeSeverity(severity)) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    case 'informational':
    case 'info':
      return 0;
    default:
      return 0;
  }
}

function normalizeText(value: unknown, opts?: { truncateTo?: number }): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (opts?.truncateTo && cleaned.length > opts.truncateTo) {
    return cleaned.slice(0, opts.truncateTo);
  }
  return cleaned;
}

function getFindingField(find: Finding, field: string): unknown {
  // Canonical aliasing for commonly used finding keys.
  switch (field) {
    case 'rule_id':
      return find.rule_id ?? find.ruleId ?? find.ruleID ?? find.rule;
    case 'finding_type':
      return find.finding_type ?? find.findingType ?? find.findingTypeLabel ?? find.finding;
    case 'resource_id':
      return (
        find.resource_id ??
        find.resourceId ??
        find.resource_name ??
        find.resourceName ??
        find.resource
      );
    case 'resource_arn':
      return find.resource_arn ?? find.resourceArn ?? find.arn;
    default: {
      // Support basic dot-paths: e.g. "foo.bar".
      if (field.includes('.')) {
        const parts = field.split('.').filter(Boolean);
        let cur: any = find;
        for (const part of parts) {
          cur = cur?.[part];
          if (cur === undefined || cur === null) return '';
        }
        return cur;
      }
      return find[field];
    }
  }
}

function simpleHash(input: string): string {
  // Deterministic non-crypto hash for compact dedup keys.
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Convert to unsigned 32-bit and hex.
  return (hash >>> 0).toString(16);
}

function computeFingerprint(find: Finding): string | null {
  if (!rules.deduplication?.enabled) return null;
  const strategies = rules.deduplication.identityStrategies ?? [];
  for (const strat of strategies) {
    const requiredValues = strat.requiredFields.map((field) => normalizeText(getFindingField(find, field)));
    const missing = requiredValues.some((v) => v.length === 0);
    if (missing) continue;

    const fingerprintFields = strat.fingerprintFields.map((field) => {
      const raw = getFindingField(find, field);
      // Truncate long text fields to improve stability across sources.
      if (field === 'description' || field === 'message') {
        return normalizeText(raw, { truncateTo: 160 });
      }
      if (field === 'title') return normalizeText(raw, { truncateTo: 120 });
      return normalizeText(raw);
    });

    const fingerprint = fingerprintFields.join('|');
    if (fingerprint.trim().length === 0) continue;
    return fingerprint;
  }
  return null;
}

export function getDedupKey(find: Finding): string | null {
  const fp = computeFingerprint(find);
  if (!fp) return null;
  return `fnd:${simpleHash(fp)}`;
}

function compileFieldMatchRules() {
  const fieldMatches = rules.suppression?.fieldMatches ?? [];
  return fieldMatches
    .map((r) => {
      try {
        const flags = r.flags ?? 'i';
        return {
          field: r.field,
          regex: new RegExp(r.regex, flags),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ field: string; regex: RegExp }>;
}

const compiledFieldMatches = compileFieldMatchRules();

export function applySuppression(findings: Finding[]): Finding[] {
  if (!rules.suppression?.enabled) return findings;
  const suppressSeverities = (rules.suppression.suppressSeverities ?? []).map((s) => s.toLowerCase());

  return findings.filter((f) => {
    const sev = normalizeSeverity(f.severity);
    if (suppressSeverities.includes(sev)) return false;

    // Pattern-based suppression (optional).
    for (const m of compiledFieldMatches) {
      const fieldVal = normalizeText(getFindingField(f, m.field), { truncateTo: 4000 });
      if (fieldVal && m.regex.test(fieldVal)) return false;
    }

    return true;
  });
}

export function computeSeverityCounts(findings: Finding[]): {
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
} {
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const f of findings) {
    const sev = normalizeSeverity(f.severity);
    if (sev === 'critical') critical++;
    else if (sev === 'high') high++;
    else if (sev === 'medium') medium++;
    else if (sev === 'low') low++;
  }

  return {
    critical_findings: critical,
    high_findings: high,
    medium_findings: medium,
    low_findings: low,
  };
}

export function deduplicateFindings(findings: Finding[]): Finding[] {
  if (!rules.deduplication?.enabled) return findings;

  // Keep insertion order deterministic; pick "best" severity rep for each key.
  const out: Finding[] = [];
  const keyToIndex = new Map<string, number>();

  for (const f of findings) {
    const key = getDedupKey(f);
    if (!key) {
      out.push(f);
      continue;
    }

    const existingIdx = keyToIndex.get(key);
    if (existingIdx === undefined) {
      f._dedup_key = key;
      f._dedup_count = 1;
      out.push(f);
      keyToIndex.set(key, out.length - 1);
      continue;
    }

    const rep = out[existingIdx];
    rep._dedup_count = (rep._dedup_count ?? 1) + 1;

    // Representative selection: keep the highest severity item.
    if (severityRank(f.severity) > severityRank(rep.severity)) {
      const dupCount = rep._dedup_count ?? 1;
      f._dedup_key = key;
      f._dedup_count = dupCount;
      out[existingIdx] = f;
    }
  }

  return out;
}


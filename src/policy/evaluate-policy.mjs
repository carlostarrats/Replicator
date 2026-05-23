export function evaluatePolicy(report, policy) {
  const envKeys = new Set((report.envs || []).map((env) => env.key).filter(Boolean));
  const domains = new Set((report.domains || []).map((domain) => domain.name).filter(Boolean));
  const failures = [];

  for (const key of policy.requiredEnvKeys || []) {
    if (!envKeys.has(key)) {
      failures.push(`${key} missing`);
    }
  }

  for (const key of policy.forbiddenPublicEnvKeys || []) {
    if (envKeys.has(key)) {
      failures.push(`${key} is forbidden`);
    }
  }

  for (const domain of policy.requiredDomains || []) {
    if (!domains.has(domain)) {
      failures.push(`${domain} domain missing`);
    }
  }

  for (const [key, expected] of Object.entries(policy.requiredProjectSettings || {})) {
    const actual = report.project?.[key];
    if (actual !== expected) {
      failures.push(`${key} expected ${expected} but found ${formatValue(actual)}`);
    }
  }

  for (const [key, forbidden] of Object.entries(policy.forbiddenProjectSettings || {})) {
    const actual = report.project?.[key];
    if (actual === forbidden) {
      failures.push(`${key} must not be ${forbidden}`);
    }
  }

  const envByKey = new Map((report.envs || []).map((env) => [env.key, env]));
  for (const rule of policy.forbiddenEnvTargets || []) {
    const env = envByKey.get(rule.key);
    const targets = new Set([].concat(env?.target || []));
    for (const target of rule.targets || []) {
      if (targets.has(target)) {
        failures.push(`${rule.key} must not target ${target}`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

function formatValue(value) {
  return value === undefined || value === null ? 'not set' : String(value);
}

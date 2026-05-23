export function evaluatePolicy(report, policy) {
  const envKeys = new Set((report.envs || []).map((env) => env.key).filter(Boolean));
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

  return {
    passed: failures.length === 0,
    failures,
  };
}

import { readFile } from 'node:fs/promises';
import { evaluatePolicy } from '../policy/evaluate-policy.mjs';
import { validatePolicy } from '../validation/local-schemas.mjs';

export async function checkPolicy(options) {
  if (!options.reportFile || !options.policyFile) {
    throw new Error('Usage: vcopy policy-check --report <analysis.json> --policy <policy.json>');
  }

  const report = JSON.parse(await readFile(options.reportFile, 'utf8'));
  const policy = JSON.parse(await readFile(options.policyFile, 'utf8'));
  validatePolicy(policy);
  const result = evaluatePolicy(report, policy);

  if (result.passed) {
    return {
      passed: true,
      output: 'Policy passed.\n',
    };
  }

  return {
    passed: false,
    output: [
      'Policy failed.',
      '',
      ...result.failures.map((failure) => `- ${failure}`),
      '',
    ].join('\n'),
  };
}

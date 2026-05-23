import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { calculateReadiness } from '../analysis/readiness.mjs';
import { scanCodeEnvReferences } from '../analysis/scan-code-env.mjs';

export async function checkProject(options) {
  const snapshot = await loadConfigSnapshot(options, options.project);
  const codeEnvRefs = options.codeRoot
    ? await scanCodeEnvReferences(options.codeRoot)
    : [];
  return calculateReadiness(snapshot, codeEnvRefs);
}

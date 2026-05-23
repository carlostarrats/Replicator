import { diffSnapshots } from '../analysis/diff.mjs';
import { calculateReadiness } from '../analysis/readiness.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { renderDiff, renderReadiness } from '../output/terminal.mjs';

export async function runCiCheck(options) {
  const [source, target] = await Promise.all([
    loadConfigSnapshot(options, options.fromProject),
    loadConfigSnapshot(options, options.toProject),
  ]);
  const readiness = calculateReadiness(target);
  const diff = {
    leftName: source.project.name || options.fromProject,
    rightName: target.project.name || options.toProject,
    diff: diffSnapshots(source, target),
  };
  const failed = readiness.blocked.length > 0 || hasDrift(diff);

  const result = {
    status: failed ? 'failed' : 'passed',
    readiness,
    diff,
  };

  return {
    exitCode: failed ? 2 : 0,
    output: options.format === 'json'
      ? `${JSON.stringify(result, null, 2)}\n`
      : renderCiReport(result),
  };
}

function renderCiReport({ status, readiness, diff }) {
  return [
    'Vercel config CI',
    '',
    `Status: ${status}`,
    '',
    '## Readiness',
    '',
    renderReadiness(readiness).trim(),
    '',
    '## Drift',
    '',
    renderDiff(diff).trim(),
    '',
  ].join('\n');
}

function hasDrift(result) {
  return result.diff.different.length > 0
    || result.diff.missingFromLeft.length > 0
    || result.diff.missingFromRight.length > 0;
}

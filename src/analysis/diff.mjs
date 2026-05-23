import { envScopeMap } from './config-snapshot.mjs';

const SETTING_FIELDS = [
  ['Framework', 'framework'],
  ['Root directory', 'rootDirectory'],
  ['Install command', 'installCommand'],
  ['Build command', 'buildCommand'],
  ['Output directory', 'outputDirectory'],
];

export function diffSnapshots(left, right) {
  const same = [];
  const different = [];

  for (const [label, field] of SETTING_FIELDS) {
    const leftValue = left.project[field] || 'not set';
    const rightValue = right.project[field] || 'not set';
    if (leftValue === rightValue) {
      same.push(`${label}: ${leftValue}`);
    } else {
      different.push(`${label}: ${leftValue} -> ${rightValue}`);
    }
  }

  const leftEnv = envScopeMap(left.envs);
  const rightEnv = envScopeMap(right.envs);
  const leftKeys = [...leftEnv.keys()].sort();
  const rightKeys = [...rightEnv.keys()].sort();
  const missingFromLeft = rightKeys.filter((key) => !leftEnv.has(key));
  const missingFromRight = leftKeys.filter((key) => !rightEnv.has(key));

  for (const key of leftKeys.filter((candidate) => rightEnv.has(candidate))) {
    const leftScopes = leftEnv.get(key).join(', ');
    const rightScopes = rightEnv.get(key).join(', ');
    if (leftScopes === rightScopes) {
      same.push(`${key} exists in ${leftScopes || 'unknown'}`);
    } else {
      different.push(`${key}: ${leftScopes || 'none'} -> ${rightScopes || 'none'}`);
    }
  }

  const leftDomains = new Set((left.domains || []).map((domain) => domain.name));
  const rightDomains = new Set((right.domains || []).map((domain) => domain.name));

  for (const name of [...leftDomains].sort()) {
    if (rightDomains.has(name)) {
      same.push(`Domain ${name}`);
    } else {
      different.push(`Domain ${name}: only in left project`);
    }
  }

  for (const name of [...rightDomains].sort()) {
    if (!leftDomains.has(name)) {
      different.push(`Domain ${name}: only in right project`);
    }
  }

  return {
    same,
    different,
    missingFromLeft,
    missingFromRight,
  };
}

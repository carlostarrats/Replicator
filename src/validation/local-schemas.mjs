export function validateVcopyConfig(config) {
  const errors = [];
  requirePlainObject(config, '.vcopyrc.json', errors);
  if (errors.length > 0) {
    throwIfInvalid('.vcopyrc.json', errors);
  }
  optionalString(config, 'teamId', errors);
  optionalString(config, 'testProjectPrefix', errors);
  optionalString(config, 'defaultOutDir', errors);
  throwIfInvalid('.vcopyrc.json', errors);
}

export function validatePolicy(policy) {
  const errors = [];
  requirePlainObject(policy, 'policy.json', errors);
  if (errors.length > 0) {
    throwIfInvalid('policy.json', errors);
  }
  optionalStringArray(policy, 'requiredEnvKeys', errors);
  optionalStringArray(policy, 'forbiddenPublicEnvKeys', errors);
  optionalStringArray(policy, 'requiredDomains', errors);
  optionalStringObject(policy, 'requiredProjectSettings', errors);
  optionalStringObject(policy, 'forbiddenProjectSettings', errors, { allowBoolean: true });

  if (policy.forbiddenEnvTargets !== undefined) {
    if (!Array.isArray(policy.forbiddenEnvTargets)) {
      errors.push('forbiddenEnvTargets must be an array');
    } else {
      policy.forbiddenEnvTargets.forEach((rule, index) => {
        if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
          errors.push(`forbiddenEnvTargets[${index}] must be an object`);
          return;
        }
        if (typeof rule.key !== 'string') {
          errors.push(`forbiddenEnvTargets[${index}].key must be a string`);
        }
        if (!Array.isArray(rule.targets) || !rule.targets.every((target) => typeof target === 'string')) {
          errors.push(`forbiddenEnvTargets[${index}].targets must be an array of strings`);
        }
      });
    }
  }

  throwIfInvalid('policy.json', errors);
}

export function validateTemplate(template) {
  const errors = [];
  requirePlainObject(template, 'template.json', errors);
  if (errors.length > 0) {
    throwIfInvalid('template.json', errors);
  }

  if (template.kind !== 'vercel-project-template') {
    errors.push('kind must be vercel-project-template');
  }
  if (template.project !== undefined && (!template.project || typeof template.project !== 'object' || Array.isArray(template.project))) {
    errors.push('project must be an object');
  }
  if (template.env !== undefined) {
    if (!Array.isArray(template.env)) {
      errors.push('env must be an array');
    } else {
      template.env.forEach((env, index) => {
        if (!env || typeof env !== 'object' || Array.isArray(env)) {
          errors.push(`env[${index}] must be an object`);
          return;
        }
        if (typeof env.key !== 'string') {
          errors.push(`env[${index}].key must be a string`);
        }
        if (!Array.isArray(env.target) || !env.target.every((target) => typeof target === 'string')) {
          errors.push(`env[${index}].target must be an array of strings`);
        }
        if (env.type !== undefined && typeof env.type !== 'string') {
          errors.push(`env[${index}].type must be a string`);
        }
      });
    }
  }
  optionalStringArray(template, 'manualReview', errors);

  throwIfInvalid('template.json', errors);
}

function requirePlainObject(value, name, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} must be an object`);
  }
}

function optionalString(object, field, errors) {
  if (object[field] !== undefined && typeof object[field] !== 'string') {
    errors.push(`${field} must be a string`);
  }
}

function optionalStringArray(object, field, errors) {
  if (object[field] !== undefined && (!Array.isArray(object[field]) || !object[field].every((item) => typeof item === 'string'))) {
    errors.push(`${field} must be an array of strings`);
  }
}

function optionalStringObject(object, field, errors, options = {}) {
  if (object[field] === undefined) {
    return;
  }
  if (!object[field] || typeof object[field] !== 'object' || Array.isArray(object[field])) {
    errors.push(`${field} must be an object`);
    return;
  }
  for (const [key, value] of Object.entries(object[field])) {
    const allowed = typeof value === 'string' || (options.allowBoolean && typeof value === 'boolean');
    if (!allowed) {
      errors.push(`${field}.${key} must be ${options.allowBoolean ? 'a string or boolean' : 'a string'}`);
    }
  }
}

function throwIfInvalid(name, errors) {
  if (errors.length > 0) {
    throw new Error(`Invalid ${name}: ${errors.join('; ')}`);
  }
}

import { classifyLikelyServices } from '../analysis/classify-services.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';

export async function createIntegrationPlan(options) {
  if (!options.fromProject || !options.toProject) {
    throw new Error('Usage: vcopy integration-plan --from <source> --to <target> --dry-run');
  }

  const source = await loadConfigSnapshot(options, options.fromProject);
  const services = classifyLikelyServices(source.envs);
  return [
    'Integration reconnection checklist',
    '',
    `Source: ${options.fromProject}`,
    `Target: ${options.toProject}`,
    '',
    'Likely services:',
    ...(services.length ? services.map((service) => `- ${service}`) : ['- None']),
    '',
    'Manual steps:',
    '- Reinstall marketplace integrations on the target project.',
    '- Enter provider credentials directly in Vercel or the provider dashboard.',
    '- Run vcopy check after reconnecting services.',
    '',
  ].join('\n');
}

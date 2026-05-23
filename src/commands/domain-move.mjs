import { addProjectDomain, removeProjectDomain } from '../vercel/client.mjs';
import { assertDryRunOrTestWrite } from './destructive-safety.mjs';

export async function moveDomain(options) {
  if (!options.fromProject || !options.toProject || !options.domain) {
    throw new Error('Usage: vcopy domain-move --from <source> --to <target> --domain <domain> [--dry-run|--test-project-only --apply --yes]');
  }

  assertDryRunOrTestWrite(options, [options.fromProject, options.toProject]);
  if (!options.apply) {
    return renderDomainMove('Domain move plan', options);
  }

  try {
    await removeProjectDomain({
      apiBase: options.apiBase,
      token: options.token,
      teamId: options.teamId,
      idOrName: options.fromProject,
      domain: options.domain,
    });
    await addProjectDomain({
      apiBase: options.apiBase,
      token: options.token,
      teamId: options.teamId,
      idOrName: options.toProject,
      domain: options.domain,
    });
  } catch (error) {
    throw new Error(`Domain move failed before completion. Review source and target domains for manual recovery. ${error.message}`);
  }

  return renderDomainMove('Domain moved', options);
}

function renderDomainMove(title, options) {
  return [
    title,
    '',
    `- ${options.domain}: ${options.fromProject} -> ${options.toProject}`,
    '',
  ].join('\n');
}

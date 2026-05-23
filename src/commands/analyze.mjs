import { classifyLikelyServices } from '../analysis/classify-services.mjs';
import { readVercelConfig } from '../analysis/read-vercel-config.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { scanCodeEnvReferences } from '../analysis/scan-code-env.mjs';
import { renderAnalysisReport } from '../output/markdown.mjs';

export async function analyzeProject(options) {
  const { project, envs, domains } = await loadConfigSnapshot(options, options.project);
  const codeEnvRefs = options.codeRoot
    ? await scanCodeEnvReferences(options.codeRoot)
    : [];
  const vercelConfig = options.codeRoot
    ? await readVercelConfig(options.codeRoot)
    : undefined;
  const likelyServices = classifyLikelyServices(envs);

  return {
    project,
    envs,
    domains,
    codeEnvRefs,
    vercelConfig,
    likelyServices,
    markdown: renderAnalysisReport({ project, envs, domains, codeEnvRefs, vercelConfig, likelyServices }),
    json: JSON.stringify({ project, envs, domains, codeEnvRefs, vercelConfig, likelyServices }, null, 2),
  };
}

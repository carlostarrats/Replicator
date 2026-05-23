import { classifyDeploymentFailure } from '../analysis/deployment-logs.mjs';
import { getDeploymentEvents, listDeployments } from '../vercel/client.mjs';

export async function verifyProject(options) {
  const deployments = await listDeployments({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    projectName: options.project,
    limit: 1,
  });

  const deployment = deployments[0];
  if (!deployment) {
    return { status: 'none' };
  }

  if (deployment.state === 'READY') {
    return { status: 'ready', deployment: sanitizeDeployment(deployment) };
  }

  const events = await getDeploymentEvents({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    deploymentId: deployment.uid || deployment.id,
  });
  const classification = classifyDeploymentFailure(deployment, events);

  return {
    status: 'failed',
    deployment: sanitizeDeployment(deployment),
    classification,
  };
}

function sanitizeDeployment(deployment) {
  return {
    uid: deployment.uid || deployment.id,
    name: deployment.name,
    projectId: deployment.projectId,
    url: deployment.url,
    state: deployment.state,
    readyState: deployment.readyState,
    readySubstate: deployment.readySubstate,
    target: deployment.target,
    created: deployment.created,
    inspectorUrl: deployment.inspectorUrl,
  };
}

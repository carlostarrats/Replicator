export async function getProject({ apiBase, token, teamId, idOrName }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}`,
  });
}

export async function listProjects({ apiBase, token, teamId }) {
  const body = await vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: '/v9/projects',
  });
  return body.projects || [];
}

export async function listTeams({ apiBase, token }) {
  const body = await vercelRequest({
    apiBase,
    token,
    pathname: '/v2/teams',
  });
  return body.teams || [];
}

export async function listProjectEnv({ apiBase, token, teamId, idOrName }) {
  const body = await vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}/env`,
  });
  return body.envs || [];
}

export async function listProjectDomains({ apiBase, token, teamId, idOrName }) {
  const body = await vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}/domains`,
  });
  return body.domains || [];
}

export async function createProject({ apiBase, token, teamId, project }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: '/v10/projects',
    method: 'POST',
    body: project,
  });
}

export async function updateProject({ apiBase, token, teamId, idOrName, project }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}`,
    method: 'PATCH',
    body: project,
  });
}

export async function createProjectEnv({ apiBase, token, teamId, idOrName, env }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}/env`,
    method: 'POST',
    body: env,
  });
}

export async function removeProjectEnv({ apiBase, token, teamId, idOrName, envId }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}/env/${encodeURIComponent(envId)}`,
    method: 'DELETE',
  });
}

export async function addProjectDomain({ apiBase, token, teamId, idOrName, domain }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v10/projects/${encodeURIComponent(idOrName)}/domains`,
    method: 'POST',
    body: { name: domain },
  });
}

export async function removeProjectDomain({ apiBase, token, teamId, idOrName, domain }) {
  return vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v9/projects/${encodeURIComponent(idOrName)}/domains/${encodeURIComponent(domain)}`,
    method: 'DELETE',
  });
}

export async function listDeployments({ apiBase, token, teamId, projectName, limit = 1 }) {
  const query = new Map([
    ['projectId', projectName],
    ['limit', String(limit)],
  ]);
  let body;
  try {
    body = await vercelRequest({
      apiBase,
      token,
      teamId,
      pathname: '/v13/deployments',
      query,
    });
  } catch (error) {
    if (!/Invalid API version/i.test(error.message)) {
      throw error;
    }
    body = await vercelRequest({
      apiBase,
      token,
      teamId,
      pathname: '/v6/deployments',
      query,
    });
  }
  return body.deployments || [];
}

export async function getDeploymentEvents({ apiBase, token, teamId, deploymentId }) {
  const body = await vercelRequest({
    apiBase,
    token,
    teamId,
    pathname: `/v3/deployments/${encodeURIComponent(deploymentId)}/events`,
  });
  return Array.isArray(body) ? body : body.events || [];
}

async function vercelRequest({ apiBase, token, teamId, pathname, method = 'GET', body: requestBody, query }) {
  const url = new URL(pathname, normalizeApiBase(apiBase));
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }
  if (query) {
    for (const [key, value] of query) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  const request = {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      ...(requestBody ? { 'content-type': 'application/json' } : {}),
    },
    body: requestBody ? JSON.stringify(requestBody) : undefined,
  };

  let response = await fetch(url, request);
  if (response.status === 429) {
    await waitForRetry(response.headers.get('retry-after'));
    response = await fetch(url, request);
  }

  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const detail = responseBody?.error?.message || response.statusText;
    throw new Error(`Vercel API request failed (${response.status}): ${detail}`);
  }

  return responseBody;
}

async function waitForRetry(retryAfter) {
  const seconds = Number.parseFloat(retryAfter || '1');
  const delayMs = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 1000;
  if (delayMs === 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function normalizeApiBase(apiBase) {
  return apiBase.endsWith('/') ? apiBase : `${apiBase}/`;
}

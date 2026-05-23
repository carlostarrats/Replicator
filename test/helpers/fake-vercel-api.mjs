import { createServer } from 'node:http';

export async function startFakeVercelApi(options = {}) {
  const requests = [];
  const rateLimitedPaths = new Set();
  const server = createServer((request, response) => {
    let requestBody = '';
    request.on('data', (chunk) => {
      requestBody += chunk;
    });
    request.on('end', () => handleRequest(request, response, requestBody));
  });

  function handleRequest(request, response, requestBody) {
    requests.push({
      method: request.method,
      url: request.url,
      auth: request.headers.authorization,
      body: requestBody ? JSON.parse(requestBody) : undefined,
    });

    const url = new URL(request.url, 'http://localhost');
    response.setHeader('content-type', 'application/json');

    if (options.rateLimitProjectOnce && url.pathname === '/v9/projects/brand-a-web' && !rateLimitedPaths.has(url.pathname)) {
      rateLimitedPaths.add(url.pathname);
      response.statusCode = 429;
      response.setHeader('retry-after', '0');
      response.end(JSON.stringify({ error: { message: 'Rate limited' } }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-a-web') {
      response.end(JSON.stringify({
        id: 'prj_123',
        name: 'brand-a-web',
        framework: 'nextjs',
        buildCommand: 'pnpm build',
        installCommand: 'pnpm install',
        devCommand: 'pnpm dev',
        outputDirectory: '.next',
        rootDirectory: 'apps/web',
        nodeVersion: '20.x',
        serverlessFunctionRegion: 'iad1',
        ssoProtection: null,
        gitForkProtection: true,
        autoExposeSystemEnvs: false,
        webAnalytics: { id: 'wa_123' },
        gitRepository: {
          repo: 'acme/app-monorepo',
          type: 'github',
        },
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-b-web') {
      response.end(JSON.stringify({
        id: 'prj_456',
        name: 'brand-b-web',
        framework: 'nextjs',
        buildCommand: 'pnpm build',
        installCommand: 'pnpm install',
        outputDirectory: '.next',
        rootDirectory: 'apps/web',
        gitRepository: {
          repo: 'acme/app-monorepo',
          type: 'github',
        },
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects') {
      response.end(JSON.stringify({
        projects: [
          { id: 'prj_123', name: 'brand-a-web', framework: 'nextjs' },
          { id: 'prj_456', name: 'brand-b-web', framework: 'nextjs' },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v2/teams') {
      response.end(JSON.stringify({
        teams: [
          { id: 'team_123', slug: 'acme', name: 'Acme' },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-a-web/env') {
      response.end(JSON.stringify({
        envs: [
          {
            id: 'vq_delete',
            key: 'DATABASE_URL',
            target: ['production', 'preview'],
            type: 'encrypted',
            value: 'encrypted-payload',
            createdBy: 'user_123',
            lastEditedByDisplayName: 'Person',
          },
          {
            key: 'NEXT_PUBLIC_APP_URL',
            target: ['production', 'preview', 'development'],
            type: 'plain',
          },
          {
            key: 'OPENAI_API_KEY',
            target: ['production', 'preview'],
            type: 'encrypted',
          },
          {
            id: 'vq_blob_delete',
            key: 'BLOB_READ_WRITE_TOKEN',
            target: ['production'],
            type: 'encrypted',
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-a-web/domains') {
      response.end(JSON.stringify({
        domains: [
          { name: 'brand-a.example.com', verified: true },
          { name: 'www.brand-a.example.com', verified: false },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-b-web/env') {
      response.end(JSON.stringify({
        envs: [
          {
            key: 'DATABASE_URL',
            target: ['production'],
            type: 'encrypted',
          },
          {
            key: 'NEXT_PUBLIC_APP_URL',
            target: ['production', 'preview', 'development'],
            type: 'plain',
          },
          {
            key: 'NEXT_PUBLIC_BRAND',
            target: ['production', 'preview'],
            type: 'plain',
          },
          {
            key: 'OPENAI_API_KEY',
            target: ['production', 'preview'],
            type: 'encrypted',
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v9/projects/brand-b-web/domains') {
      response.end(JSON.stringify({
        domains: [
          { name: 'brand-b.example.com', verified: true },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v13/deployments') {
      response.end(JSON.stringify({
        deployments: [
          {
            uid: 'dpl_failed',
            url: 'brand-b-web-failed.vercel.app',
            name: 'brand-b-web',
            state: 'ERROR',
            target: 'preview',
            creator: { email: 'person@example.com' },
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v6/deployments') {
      response.end(JSON.stringify({
        deployments: [
          {
            uid: 'dpl_failed',
            url: 'brand-b-web-failed.vercel.app',
            name: 'brand-b-web',
            state: 'ERROR',
            target: 'preview',
          },
        ],
      }));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v3/deployments/dpl_failed/events') {
      response.end(JSON.stringify([
        {
          type: 'stderr',
          payload: {
            text: 'PrismaClientInitializationError: error: Environment variable not found: DATABASE_URL',
          },
        },
      ]));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/v10/projects') {
      response.statusCode = 201;
      response.end(JSON.stringify({
        id: 'prj_789',
        name: requestBody ? JSON.parse(requestBody).name : 'brand-c-web',
        accountId: 'team_secret_scope',
        features: { webAnalytics: true },
      }));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/v9/projects/brand-a-web/env') {
      response.statusCode = 201;
      response.end(JSON.stringify({
        created: true,
        key: requestBody ? JSON.parse(requestBody).key : undefined,
      }));
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/v9/projects/brand-a-web/env/vq_delete') {
      response.end(JSON.stringify({ removed: true }));
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/v9/projects/brand-a-web/env/vq_blob_delete') {
      response.end(JSON.stringify({ removed: true }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: { message: 'not found' } }));
  }

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    apiBase: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function startDestructiveFakeApi() {
  const requests = [];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const parsedBody = body ? JSON.parse(body) : undefined;
      requests.push({
        method: request.method,
        url: request.url,
        body: parsedBody,
      });
      handleRequest(request, response, parsedBody);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    apiBase: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function handleRequest(request, response, body) {
  const url = new URL(request.url, 'http://localhost');
  response.setHeader('content-type', 'application/json');

  if (request.method === 'GET' && url.pathname === '/v9/projects/vcopy-test-source') {
    response.end(JSON.stringify({
      name: 'vcopy-test-source',
      gitForkProtection: true,
      ssoProtection: 'standard',
      autoExposeSystemEnvs: false,
      bypassSecret: 'do-not-copy',
    }));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/v9/projects/vcopy-test-target') {
    response.end(JSON.stringify({
      name: 'vcopy-test-target',
      gitForkProtection: false,
      ssoProtection: null,
      autoExposeSystemEnvs: true,
    }));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/v9/projects/vcopy-test-source/env') {
    response.end(JSON.stringify({
      envs: [
        { key: 'DATABASE_URL', target: ['preview'], type: 'encrypted', value: 'encrypted-payload' },
        { key: 'BLOB_READ_WRITE_TOKEN', target: ['production'], type: 'encrypted', value: 'encrypted-payload' },
      ],
    }));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/v9/projects/vcopy-test-target/env') {
    response.end(JSON.stringify({ envs: [] }));
    return;
  }

  if (request.method === 'GET' && url.pathname.endsWith('/domains')) {
    response.end(JSON.stringify({ domains: [{ name: 'vcopy-test.example.com', verified: true }] }));
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v9/projects/vcopy-test-target/env') {
    response.statusCode = 201;
    response.end(JSON.stringify({ created: true, key: body.key }));
    return;
  }

  if (request.method === 'DELETE' && url.pathname === '/v9/projects/vcopy-test-source/domains/vcopy-test.example.com') {
    response.end(JSON.stringify({ removed: true }));
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v10/projects/vcopy-test-target/domains') {
    response.statusCode = 201;
    response.end(JSON.stringify({ name: body.name }));
    return;
  }

  if (request.method === 'PATCH' && url.pathname === '/v9/projects/vcopy-test-target') {
    response.end(JSON.stringify({ updated: true }));
    return;
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ error: { message: 'not found' } }));
}


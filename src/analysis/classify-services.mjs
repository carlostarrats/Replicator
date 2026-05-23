const SERVICE_PATTERNS = [
  ['Vercel Blob', /(^|_)BLOB_|BLOB_READ_WRITE_TOKEN/],
  ['OpenAI', /OPENAI/],
  ['Postgres/database', /DATABASE_URL|POSTGRES|POSTGRES_URL|PRISMA/],
  ['Upstash Redis', /UPSTASH|REDIS/],
  ['Stripe', /STRIPE/],
  ['Sentry', /SENTRY/],
];

export function classifyLikelyServices(envs) {
  const keys = envs.map((env) => env.key).join('\n');
  return SERVICE_PATTERNS
    .filter(([, pattern]) => pattern.test(keys))
    .map(([service]) => service)
    .sort();
}

import { listProjects } from '../vercel/client.mjs';

export async function listVercelProjects(options) {
  return listProjects(options);
}

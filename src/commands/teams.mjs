import { listTeams } from '../vercel/client.mjs';

export async function listVercelTeams(options) {
  return listTeams(options);
}

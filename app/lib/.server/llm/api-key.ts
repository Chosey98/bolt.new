import { env } from 'node:process';

export function getAPIKey(cloudflareEnv?: Env) {
  /**
   * In Node.js deployment, prioritize process.env
   * The `cloudflareEnv` is only used when deployed to Cloudflare Workers
   */
  return env.ANTHROPIC_API_KEY || cloudflareEnv?.ANTHROPIC_API_KEY;
}

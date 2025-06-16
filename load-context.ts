// load context for Node.js deployment
export interface Env {
  ANTHROPIC_API_KEY?: string;
  [key: string]: any;
}

declare module '@remix-run/node' {
  interface AppLoadContext {
    env: Env;
  }
}

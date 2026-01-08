import { Env } from "./env";

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {
      GITHUB_TOKEN: string;
    }
  }
}

export {};

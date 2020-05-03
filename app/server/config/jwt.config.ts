import { ENV_CONFIG } from "./env.config";

export const JWT_CONFIG = {
  secret: ENV_CONFIG.JWT_SECRET || 'secret-secret-hush-hush-hush'
};

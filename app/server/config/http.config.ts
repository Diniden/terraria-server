import { ENV_CONFIG } from "./env.config";

export const HTTP_CONFIG = {
  port: ENV_CONFIG.SERVER_PORT || (ENV_CONFIG.NODE_ENV === "production" ? '80' : '8081')
};

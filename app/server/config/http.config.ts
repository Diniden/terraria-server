import { awaitConfig, ENV_CONFIG } from "./env.config";

export const HTTP_CONFIG = {
  port: -1
};

async function init() {
  Object.assign(HTTP_CONFIG, {
    port: ENV_CONFIG.SERVER_PORT || (ENV_CONFIG.NODE_ENV === "production" ? '80' : '8081')
  });
}

awaitConfig(init);
init();

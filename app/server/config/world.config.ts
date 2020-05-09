import { awaitConfig, ENV_CONFIG } from "./env.config";

/**
 * Configuration for the worlds
 */
export const WORLD_CONFIG = {
  portRange: [9000, 10000],
  maxWorlds: ENV_CONFIG.WORLD_MAX,
  worldDataPath: ENV_CONFIG.WORLD_DATA_PATH
};

async function init() {
  Object.assign(WORLD_CONFIG, {
    portRange: [ENV_CONFIG.WORLD_PORT_START || 9000, ENV_CONFIG.WORLD_PORT_END || 10000],
    maxWorlds: ENV_CONFIG.WORLD_MAX,
    worldDataPath: ENV_CONFIG.WORLD_DATA_PATH
  });
}

awaitConfig(init);
init();

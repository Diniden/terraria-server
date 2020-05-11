import { awaitConfig, ENV_CONFIG } from "./env.config";

/**
 * Configuration for the worlds
 */
export const WORLD_CONFIG = {
  portRange: [9000, 10000],
  maxWorlds: Number.parseFloat(ENV_CONFIG.WORLD_MAX || "5"),
  worldDataPath: ENV_CONFIG.WORLD_DATA_PATH,
  worldStartTimeout: Number.parseFloat(ENV_CONFIG.WORLD_START_TIMEOUT || "60000"),
  worldCreateTimeout: Number.parseFloat(ENV_CONFIG.WORLD_CREATE_TIMEOUT || "180000"),
};

async function init() {
  Object.assign(WORLD_CONFIG, {
    portRange: [ENV_CONFIG.WORLD_PORT_START || 9000, ENV_CONFIG.WORLD_PORT_END || 10000],
    maxWorlds: ENV_CONFIG.WORLD_MAX,
    worldDataPath: ENV_CONFIG.WORLD_DATA_PATH,
    worldStartTimeout: Number.parseFloat(ENV_CONFIG.WORLD_START_TIMEOUT || "60000"),
    worldCreateTimeout: Number.parseFloat(ENV_CONFIG.WORLD_CREATE_TIMEOUT || "180000"),
  });

  if (isNaN(WORLD_CONFIG.maxWorlds)) {
    WORLD_CONFIG.maxWorlds = 5;
  }

  if (isNaN(WORLD_CONFIG.worldStartTimeout)) {
    WORLD_CONFIG.worldStartTimeout = 60000;
  }

  if (isNaN(WORLD_CONFIG.worldCreateTimeout)) {
    WORLD_CONFIG.worldCreateTimeout = 180000;
  }
}

awaitConfig(init);
init();

import { ENV_CONFIG } from "./env.config";

/**
 * Configuration for the worlds
 */
export const WORLD_CONFIG = {
  portRange: [ENV_CONFIG.WORLD_PORT_START, ENV_CONFIG.WORLD_PORT_END],
  maxWorlds: ENV_CONFIG.WORLD_MAX
};

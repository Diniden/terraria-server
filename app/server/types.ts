import Joi from '@hapi/joi';
import { IWorld } from "../types/rest/world";

export interface IWorldInternal extends IWorld {
  /** This stores whether or not the server is active/running */
  isActive: boolean;
  /** This is the port this world is broadcast on */
  port: number;
  /**
   * This is the identifier which number input should be used to load the world in the terraria
   * server world picker.
   */
  loadId: number;
}

export const IWorldInternalSchema = Joi.object({
  difficulty: Joi.string().valid('Normal', 'Expert', 'Extreme', 'Unknown'),
  maxPlayers: Joi.number().min(1).max(8),
  name: Joi.string(),
  online: Joi.number().min(0).max(8),
  password: Joi.string().allow(''),
  port: Joi.number().min(1024).max(65535),
  loadId: Joi.number().min(0),
  size: Joi.string().valid('Small', 'Medium', 'Large', 'Unknown'),
  isActive: Joi.bool()
})
.with('name', ['maxPlayers', 'difficulty', 'online', 'password', 'port', 'loadId'])
;

/**
 * This is the expected information to appear from cosmiconfig search results.
 * Each of these is simply the env variable configuration but in camel case.
 */
export interface IConfig {
  adminName?: string;
  adminPassword?: string;
  httpsCert?: string;
  httpsKey?: string;
  httpsPassphrase?: string;
  httpsServerPort?: number;
  jwtSecret?: string;
  maxWorlds?: number;
  nodeEnv?: 'production' | 'development';
  resourcePath?: string;
  saltRounds?: number;
  serverPort?: number;
  worldMax?: number;
  worldPortEnd?: number;
  worldPortStart?: number;
  worldDataPath?: string;
}

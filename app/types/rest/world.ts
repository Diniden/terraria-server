import Joi from '@hapi/joi';

export interface IWorld {
  /** The difficulty this server was set to */
  difficulty: 'Normal' | 'Expert' | 'Extreme' | 'Unknown';
  /**
   * This indicates whether or not the server is active/running. There is no point to the
   * client populating this. It is only feedback from the server.
   */
  isActive?: boolean;
  /** Number of players allowed on this server */
  maxPlayers: number;
  /** Unique name and identifier of the world */
  name: string;
  /** Number of players detected to be online */
  online: number;
  /** The declared size of the world */
  size: 'Small' | 'Medium' | 'Large' | 'Unknown';
  /** This is only populated from the client side. The server NEVER delivers the password */
  password?: string;
  /** When populated, this contains the information needed to connect to this world. */
  connection?: string;
}

/**
 * Joi schema for the IWorld interface
 */
export const IWorldSchema = Joi.object({
  difficulty: Joi.string().valid('Normal', 'Expert', 'Extreme', 'Unknown'),
  maxPlayers: Joi.number().min(1).max(8),
  name: Joi.string(),
  online: Joi.number().min(0).max(8),
  password: Joi.string().allow(''),
  size: Joi.string().valid('Small', 'Medium', 'Large', 'Unknown'),
  isActive: Joi.bool(),
  connection: Joi.string()
})
.with('name', ['maxPlayers', 'difficulty'])
.with('password', ['name', 'maxPlayers', 'difficulty'])
;

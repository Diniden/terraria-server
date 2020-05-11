import Joi from '@hapi/joi';

export interface IWorld {
  /** The difficulty this server was set to */
  difficulty: 'Normal' | 'Expert' | 'Extreme' | 'Unknown';
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
}

/**
 * Joi schema for the IWorld interface
 */
export const IWorldSchema = Joi.object({
  difficulty: Joi.string().valid('Normal', 'Expert', 'Extreme'),
  maxPlayers: Joi.number().min(1).max(8),
  name: Joi.string(),
  online: Joi.number().min(1).max(8),
  password: Joi.string().min(1)
})
.with('name', ['maxPlayers', 'difficulty'])
.with('password', ['name', 'maxPlayers', 'difficulty'])
;

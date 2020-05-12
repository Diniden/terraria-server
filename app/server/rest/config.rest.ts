import { Express } from 'express';
import passport from 'passport';
import { WORLD_CONFIG } from '../config/world.config';

/**
 * REST configuration for public facing server configuration.
 */
export function RESTConfig(app: Express) {
  // GET / FETCH the config for this host
  app.get('/config', passport.authenticate('jwt', { session: true}), (_req, res) => {
    res.status(200).send({
      maxWorlds: WORLD_CONFIG.maxWorlds
    });
  });
}

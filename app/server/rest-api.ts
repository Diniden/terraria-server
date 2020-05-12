import { Express } from 'express';
import { RESTConfig } from './rest/config.rest';
import { RESTLogin } from './rest/login.rest';
import { RESTWorld } from './rest/world.rest';

/**
 * Configure all app paths for the server
 */
export function configureREST(app: Express) {
  RESTLogin(app);
  RESTConfig(app);
  RESTWorld(app);
}

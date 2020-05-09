import { Express } from 'express';
import { RESTLogin } from './rest/login.rest';
import { RESTWorld } from './rest/world.rest';

/**
 * Configure all app paths for the server
 */
export function configureREST(app: Express) {
  RESTLogin(app);
  RESTWorld(app);
}

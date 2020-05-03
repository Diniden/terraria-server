import { Express } from 'express';
import { RESTLogin } from './rest/login';
import { RESTWorld } from './rest/world';

/**
 * Configure all app paths for the server
 */
export function configureREST(app: Express) {
  RESTLogin(app);
  RESTWorld(app);
}

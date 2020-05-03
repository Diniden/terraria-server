import { UserAction } from './user.action';
import { WorldAction } from './world.action';

export const Action = {
  User: new UserAction(),
  World: new WorldAction()
};

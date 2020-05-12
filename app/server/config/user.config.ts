import { awaitConfig, ENV_CONFIG } from './env.config';
import { HASH_CONFIG } from './hash.config';

export interface IUser {
  name: string;
  password: string;
}

export const USER_CONFIG: IUser = {
  name: ENV_CONFIG.ADMIN_NAME || 'diniden',
  password: ENV_CONFIG.ADMIN_PASSWORD || '',
};

awaitConfig(async () => {
  Object.assign(USER_CONFIG, {
    name: ENV_CONFIG.ADMIN_NAME || 'diniden',
    password: await HASH_CONFIG.hash(ENV_CONFIG.ADMIN_PASSWORD || 'a'),
  });
});

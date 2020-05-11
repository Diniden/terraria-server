import { awaitConfig, ENV_CONFIG } from './env.config';
const bcrypt = require('bcrypt');

let SALT_ROUNDS = 11;

export const HASH_CONFIG = {
  salt: SALT_ROUNDS,
  hash: async (input: string) => await bcrypt.hash(input, SALT_ROUNDS)
};

awaitConfig(async () => {
  SALT_ROUNDS = Number.parseFloat(ENV_CONFIG.SALT_ROUNDS || '11');
  Object.assign(HASH_CONFIG, {
    salt: SALT_ROUNDS,
    hash: async (input: string) => await bcrypt.hash(input, SALT_ROUNDS),
  });
});

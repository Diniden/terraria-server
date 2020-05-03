import { ENV_CONFIG } from './env.config';
const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number.parseFloat(ENV_CONFIG.SALT_ROUNDS || '11');

export default {
  salt: SALT_ROUNDS,
  hash: async (input: string) => await bcrypt.hash(input, SALT_ROUNDS)
};

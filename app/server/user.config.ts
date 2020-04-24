import hashConfig from '../common/config/hash.config';

export interface IUser {
  name: string;
  password: string;
}

const USER_CONFIG: IUser = {
  name: process.env.ADMIN_NAME || 'diniden',
  password: '',
};

async function init() {
  if (USER_CONFIG.password) return;
  USER_CONFIG.password = await hashConfig.hash(process.env.ADMIN_PASSWORD || 'Mining for gold!');
}

export async function userConfig() {
  await init();
  return USER_CONFIG;
}

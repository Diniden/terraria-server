/**
 * This file makes it easier to track the environment variables that can configure the system.
 * Instead of using process.env throughout the app, you should instead add the variable to this
 * file and make the process.env calls ONLY here, then import this file for elsewhere.
 *
 * NOTE: Do NOT specify defaults in this file. It should be up to the usecase within the app
 * to determine what a default should be. For instance, it is a usecase for an env to NOT be
 * specified. It is hard to communicate those needs in a config file like this and can only
 * be seen when and WHY in the context it's being used.
 */
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV,
  HTTPS_CERT: process.env.HTTPS_CERT,
  HTTPS_KEY: process.env.HTTPS_KEY,
  HTTPS_PASSPHRASE: process.env.HTTPS_PASSPHRASE,
  HTTPS_SERVER_PORT: process.env.HTTPS_SERVER_PORT,
  SERVER_PORT: process.env.SERVER_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_NAME: process.env.ADMIN_NAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  RESOURCE_PATH: process.env.RESOURCE_PATH,
  SALT_ROUNDS: process.env.SALT_ROUNDS,
};

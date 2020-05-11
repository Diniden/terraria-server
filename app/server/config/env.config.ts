import { constantCase } from 'change-case';
import { IConfig } from "../types";

const awaiting: Function[] = [];

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
  /** The development mode for the bundling procedure */
  NODE_ENV: process.env.NODE_ENV,
  /** Path to the https certificate */
  HTTPS_CERT: process.env.HTTPS_CERT,
  /** The key for the https certificate */
  HTTPS_KEY: process.env.HTTPS_KEY,
  /** The passphrase needed for the HTTPS certificate if one exists */
  HTTPS_PASSPHRASE: process.env.HTTPS_PASSPHRASE,
  /** The port to use if HTTPS is enabled */
  HTTPS_SERVER_PORT: process.env.HTTPS_SERVER_PORT,
  /** The port for HTTP */
  SERVER_PORT: process.env.SERVER_PORT,
  /** The secret passphrase used to generate the JWT tokens. */
  JWT_SECRET: process.env.JWT_SECRET,
  /** The user name of the admin (this is not relevant for the current single user the server supports) */
  ADMIN_NAME: process.env.ADMIN_NAME,
  /** The password the ADMIN (or all users) will use to access the web UI */
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  /** The path the server hosts resources from */
  RESOURCE_PATH: process.env.RESOURCE_PATH,
  /** The number of SALT hashes to execute for the bcrypt algorithm */
  SALT_ROUNDS: process.env.SALT_ROUNDS,
  /** The desired number of worlds your server instance should allow running at once */
  MAX_WORLDS: process.env.MAX_WORLDS,
  /**
   * The start PORTs the server can use to host worlds (If there are less ports available than MAX_WORLDS
   * then that number will be limited by the number of PORTs available).
   */
  WORLD_PORT_START: process.env.WORLD_PORT_START,
  /**
   * The end PORT range the server can use to host worlds (If there are less ports available than MAX_WORLDS
   * then that number will be limited by the number of PORTs available).
   */
  WORLD_PORT_END: process.env.WORLD_PORT_END,
  /** The number of active worlds this server will allow to run simultaneously at once. */
  WORLD_MAX: process.env.WORLD_MAX,
  /** This is where the server stores the meta data for the active worlds it has started up */
  WORLD_DATA_PATH: process.env.WORLD_DATA_PATH,
  /**
   * This is how long it should take for a world to start up. If it takes longer the system will error
   * and close the process.
   */
  WORLD_START_TIMEOUT: process.env.WORLD_START_TIMEOUT,
  /**
   * This is how long it should take for a world to start up. If it takes longer the system will error
   * and close the process.
   */
  WORLD_CREATE_TIMEOUT: process.env.WORLD_CREATE_TIMEOUT,
};

export function applyEnvConfig(config: IConfig) {
  const toApply: any = {};

  // Convert the cosmic config properties to environment var keys
  Object.keys(config).forEach((prop: keyof IConfig) => {
    toApply[constantCase(prop)] = config[prop];
  });

  // Apply the config to the environment vars, but prioritize the already set environment vars
  Object.assign(
    ENV_CONFIG,
    toApply,
    ENV_CONFIG
  );

  awaiting.forEach(async fn => await fn());
  awaiting.splice(0);
}

export function awaitConfig(fn: () => Promise<void>) {
  awaiting.push(fn);
}

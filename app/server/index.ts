import bodyParser from "body-parser";
import compression from "compression";
import { cosmiconfig } from "cosmiconfig";
import express from "express";
import session from "express-session";
import http from 'http';
import https from 'https';
import passport from "passport";
import path from "path";
import { applyEnvConfig, ENV_CONFIG } from "./config/env.config";
import { HTTP_CONFIG } from './config/http.config';
import { HTTPS_CONFIG } from './config/https.config';
import "./config/passport.config";
import { configureREST } from "./rest-api";
import { InstanceManager } from "./terraria/instance-manager";
import { WorldMetaData } from "./terraria/world-meta-data.store";
import { IConfig } from "./types";

/**
 * Creates our server instance and configures it
 */
async function startServer() {
  // Before we start the server, we should first
  const { RESOURCE_PATH = "" } = ENV_CONFIG;
  const app = express();
  app.use(compression());

  // When HTTPS is enabled, we want ALL requests to route to HTTPS and not allow any http traffic to be had.
  if (HTTPS_CONFIG.enabled) {
    // Middleware to force connection to https
    app.use(function (req, res, next) {
      console.warn('Checking protocol...');
      if (req.secure) {
        // Request was via https, so do no special handling
        next();
      } else {
        // Request was via http, so redirect to https
        const httpsRedirect = `https://${req.headers.host}${req.url}`;
        console.warn('Redirect to', httpsRedirect);
        res.redirect(httpsRedirect);
      }
    });
  }

  // Configure all middleware to enable authentication and resource handling
  console.warn("RESOURCE_PATH:", path.resolve(RESOURCE_PATH));
  app.use("/", express.static(path.resolve(RESOURCE_PATH)));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up the RESTful API for the server
  configureREST(app);

  // Always have an HTTP server enabled to handle requests
  http.createServer(app).listen(HTTP_CONFIG.port, () => {
    // tslint:disable-next-line
    console.log('HTTP Server is listening on port:', HTTP_CONFIG.port);
  });

  // If we're in an environment where HTTPS needs to be active, then we will activate the HTTPS server
  if (HTTPS_CONFIG.enabled) {
    https.createServer(HTTPS_CONFIG, app).listen(HTTPS_CONFIG, () => {
      // tslint:disable-next-line
      console.log('HTTPS Server is listening on port:', HTTPS_CONFIG.port);
    });
  }
}

/**
 * Initializes the server instance management, which is required to pass before we have a valid server that
 * can be started.
 */
async function startInstanceManager() {
  await InstanceManager.init();
}

/**
 * This starts all of the configuration loading from environment variables and configuration files for the
 * server.
 */
async function initConfiguration() {
  // Listen for program kill signals
  process.on('SIGTERM', handleProcessTermination(0));
  process.on('SIGINT', handleProcessTermination(0));
  process.on('uncaughtException', handleProcessTermination(1));

  const explorer = cosmiconfig('server');
  const result = await explorer.search();
  let config: IConfig = result?.config;
  if (!result || !config) config = {};
  // Update the environment configuration with any cosmic configuration found
  await applyEnvConfig(config);
  // Load up our world meta data and ensure the meta data location is valid
  await WorldMetaData.load();
}

/**
 * Handles the termination of the server and ensures all child processes are shut down gracefully
 * so as to not cause orphaned children.
 */
function handleProcessTermination(signal: number) {
  return async () => {
    console.warn('TERMINATING');
    setTimeout(async () => {
      // Gracefully stop all of our running servers before exiting
      await InstanceManager.stopAll(true);
      // Make sure our meta data has been saved
      WorldMetaData.save();
      // Finally, exit the program
      console.warn('EXIT', signal);
      process.exit(signal);
    });
  };
}

/**
 * Entry to the server execution
 */
async function start() {
  await initConfiguration();
  await startInstanceManager();
  await startServer();
}

start();

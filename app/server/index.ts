import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import session from "express-session";
import http from 'http';
import https from 'https';
import passport from "passport";
import path from "path";
import { configureREST } from "./api";
import { ENV_CONFIG } from "./env.config";
import { HTTP_CONFIG } from './http.config';
import { HTTPS_CONFIG } from './https.config';

const { RESOURCE_PATH = "" } = ENV_CONFIG;
const app = express();

app.use(compression());

// When HTTPS is enabled, we want ALL requests to route to HTTPS and not allow any http traffic to be had.
if (HTTPS_CONFIG.enabled) {
  // Middleware to force connection to https
  app.use(function (req, res, next) {
    console.warn('Checking protocol...');
    if (req.secure) {
      // request was via https, so do no special handling
      next();
    } else {
      // request was via http, so redirect to https
      const httpsRedirect = `https://${req.headers.host}${req.url}`;
      console.warn('Redirect to', httpsRedirect);
      res.redirect(httpsRedirect);
    }
  });
}

// Configure all middleware to enable authentication and resource handling
console.warn("RESOURCE_PATH:", path.resolve(RESOURCE_PATH));
app.use("/", express.static(path.resolve(RESOURCE_PATH)));
app.use(bodyParser.urlencoded({ extended: false }));
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

if (HTTPS_CONFIG.enabled) {
  https.createServer(HTTPS_CONFIG, app).listen(HTTPS_CONFIG, () => {
    // tslint:disable-next-line
    console.log('HTTPS Server is listening on port:', HTTPS_CONFIG.port);
  });
}

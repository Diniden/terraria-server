import fs from "fs";
import path from "path";
import { ENV_CONFIG } from "./env.config";

export const HTTPS_CONFIG = {
  enabled: Boolean(ENV_CONFIG.HTTPS_KEY || ENV_CONFIG.HTTPS_CERT || ENV_CONFIG.HTTPS_PASSPHRASE),
  port: ENV_CONFIG.HTTPS_SERVER_PORT || ENV_CONFIG.NODE_ENV === 'production' ? '443' : '8082',
  key: fs.readFileSync(ENV_CONFIG.HTTPS_KEY || path.resolve('./app/asset/dev/key.pem')),
  cert: fs.readFileSync(ENV_CONFIG.HTTPS_CERT || path.resolve('./app/asset/dev/cert.pem')),
  passphrase: ENV_CONFIG.HTTPS_PASSPHRASE || 'terraria',
};

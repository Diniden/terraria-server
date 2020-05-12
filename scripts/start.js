const path = require('path');
process.env.RESOURCE_PATH = path.resolve('dist/app/client');
process.env.NODE_ENV = "production";
require(path.resolve('dist/app/server'));

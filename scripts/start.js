const path = require('path');
process.env.RESOURCE_PATH = path.resolve('dist/client');
require(path.resolve('dist/server'));

const express = require('express');
const compression = require('compression');
const { resolve } = require('path');

const { SERVER_PORT = 8081 } = process.env;

const app = express();

app.use(compression());

app.use('/', express.static(resolve('test')));

// app.get('/', (req, res) => {
//   res.sendFile(resolve('server/client/index.html'));
// });

app.listen(SERVER_PORT, () => {
  console.log(`App running at http://localhost:${SERVER_PORT}/`);
});

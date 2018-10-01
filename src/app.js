var express = require('express');

var app = express();
const PORT = parseInt(process.env['PORT'], 10) || 3000;

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}...`);
});

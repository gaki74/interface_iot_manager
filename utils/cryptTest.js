var request = require('request');
var encrypt = require('./encrypt');

var datum = { value: 28.1, date: new Date() };
var strKey = '[センサーの秘密鍵]';

var requestBody = encrypt(datum, strKey);

console.log('Plain:');
console.log(datum);
console.log('Request Body:');
console.log(requestBody);

var options = {
  url: 'https://[App name].herokuapp.com/sensors/1/datum',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: requestBody
}

request(options, (error, response, body) => {
  console.log('Response:')
  console.log(body);
});

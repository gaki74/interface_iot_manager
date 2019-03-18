// javascript版暗号化処理

var crypto = require('crypto');
var digest = require('./digest');

var encrypt = (datum, strKey) => {
  var strDate = datum.date.toISOString();
  var strValue = String(datum.value);

  var key = Buffer.from(strKey, 'base64');
  var iv = digest(strDate);
  var cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  var plainText = strValue + ',' + digest(strValue, 'hex');
  var cipherText = cipher.update(plainText, 'utf8', 'base64');
  cipherText += cipher.final('base64');

  return JSON.stringify({ strDate, cipherText });
};

module.exports = encrypt;

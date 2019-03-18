var crypto = require('crypto');
var digest = require('./digest');

var decrypt = (objRequestBody, strKey) => {
  var { strDate, cipherText } = objRequestBody;

  if ((typeof strDate === "string") && (typeof cipherText === "string")) {
    var key = Buffer.from(strKey, 'base64');
    var iv = digest(strDate);
    var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    var plainText = decipher.update(cipherText, 'base64', 'utf8');

    plainText += decipher.final('utf8');

    var arrDatum = plainText.split(',');
    if (arrDatum.length === 2) {
      var [strValue, strDigest] = arrDatum;
    }
  }

  if (strValue && (strDigest === digest(strValue, 'hex'))) {
    return { value: Number(strValue), date: new Date(strDate) };
  } else {
    return undefined;
  }
};

module.exports = decrypt;

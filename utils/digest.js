var crypto = require('crypto');

var digest = (strDate, type = undefined) => {
  return crypto.createHash('md5').update(strDate).digest(type);
};

module.exports = digest;

var moment = require('moment-timezone');

// 今週の始まりを返す関数
var startOfThisWeek = () => {
  return moment().tz('Asia/Tokyo').startOf('week').toDate();
}

module.exports = startOfThisWeek;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var basicAuth = require('basic-auth');

var indexRouter = require('./routes/index');
var sensorsRouter = require('./routes/sensors');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
  if (req.url.match(/^\/sensors\/\d+\/datum$/) && req.method === 'POST') {
    return next();
  } else {
    const users = { 'taro': { pass: 'interface' } };
    var auth = basicAuth(req);
    if(!auth || !users[auth.name] || auth.pass !== users[auth.name].pass) {
      res.set('WWW-Authenticate', 'Basic realm="myapp"');
      return res.status(401).send('authentication error');
    }
    return next();
  }
});

app.use('/', indexRouter);
app.use('/sensors', sensorsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

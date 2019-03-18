var express = require('express');
var mongodb = require('mongodb');
var decrypt = require('../utils/decrypt');

var router = express.Router();

var mongoClient = mongodb.MongoClient;
const options = { useNewUrlParser: true };
const uri = process.env.MONGODB_URI;
const dbName = uri.split('/').pop();

const sensors = {
  1: { strKey: '[上記で作成した共通鍵1]' },
  2: { strKey: '[上記で作成した共通鍵2]' }
};

/* POST datum */
router.post('/:id/datum', function(request, response) {
  var id = Number(request.params['id']);
  var sensor = sensors[id];

  if (sensor) {
    var datum = decrypt(request.body, sensor.strKey);

    if (datum) {
      datum.sensorId = id;

      mongoClient.connect(uri, options, (error, client) => {
        if (error) {
          response.send(error);
        } else {
          var collection = client.db(dbName).collection('data');
          collection.insertOne(datum, (error) => {
            response.send(error || 'ok');
            client.close();
          });
        }
      });
    } else {
      response.send('decrypt error');
    }
  } else {
    response.send('no sensor found');
  }
});

/* GET data */
router.get('/:id/data', function(request, response) {
  var id = Number(request.params['id']);
  var sensor = sensors[id];

  if (sensor) {
    mongoClient.connect(uri, options, (error, client) => {
      if (error) {
        resquest.send(error);
      } else {
        var data = client.db(dbName).collection('data').find({ sensorId: id })
        data.toArray((error, documents) => {
          if (error) {
            response.send(error);
          } else {
            response.send(documents);
          }
          client.close();
        });
      }
    });
  } else {
    response.send('no sensor found');
  }
});

module.exports = router;

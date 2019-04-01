var express = require('express');
var mongodb = require('mongodb');
var mqtt = require('mqtt');
var decrypt = require('../utils/decrypt');
var startOfThisWeek = require('../utils/startOfThisWeek');

var router = express.Router();

var mongoClient = mongodb.MongoClient;
const options = { useNewUrlParser: true };
const uri = process.env.MONGODB_URI;
const dbName = uri.split('/').pop();

// Heroku Addonとして提供されているCluodMQTTを使用します。
// 以下のコマンドでcat（無料）プランでMQTTを有効化できます。
// `$ heroku addons:create cloudmqtt:cat`
// また、Node.jsからMQTTを操作するためには以下のコマンドを実行し、必要な
// パッケージをインストールする必要があります。
// `$ npm install --save mqtt`
var mqttClient = mqtt.connect(process.env.CLOUDMQTT_URL);
const mqttTopic = (sensorId) => `alerts/sensor${sensorId}`;

// NQTT通信機能の追加に伴い、`threshold`というキーと追加します。
// センサーがこれよりも大きな値を計測した場合、警報を出します。
const sensors = {
  1: { strKey: '[上記で作成した共通鍵1]', threshold: 30 },
  2: { strKey: '[上記で作成した共通鍵2]' }
};

/* POST datum */
mqttClient.on('connect', () => {
  router.post('/:id/datum', function(request, response) {
    var id = Number(request.params['id']);
    var sensor = sensors[id];

    if (sensor) {
      var datum = decrypt(request.body, sensor.strKey);

      if (datum) {
        datum.sensorId = id;

        mongoClient.connect(uri, options, (error, mongo) => {
          if (error) {
            response.status(500).send(error);
          } else {
            var collection = mongo.db(dbName).collection('data');
            collection.insertOne(datum, (error) => {
              if (error) {
                response.status(500).send(error)
              } else {
                if (sensor.threshold && datum.value >= sensor.threshold) {
                  mqttClient.publish(
                    mqttTopic(datum.sensorId),
                    datum.date.toString()
                  );
                }
                response.status(201).send(datum);
              }
            });
            mongo.close();
          }
        });
      } else {
        response.status(400).send('undecryptable request');
      }
    } else {
      response.status(404).send('no sensor found');
    }
  });
});

/* GET data */
router.get('/:id/data', function(request, response) {
  var id = Number(request.params['id']);
  var sensor = sensors[id];

  if (sensor) {
    mongoClient.connect(uri, options, (error, client) => {
      if (error) {
        resquest.status(500).send(error);
      } else {
        var data = client
                     .db(dbName)
                     .collection('data')
                     .find({ sensorId: id })
                     .sort({ date: 1 });
        data.toArray((error, documents) => {
          if (error) {
            response.status(500).send(error);
          } else {
            response.send(documents);
          }
          client.close();
        });
      }
    });
  } else {
    response.status(404).send('no sensor found');
  }
});

/* GET this week data */
router.get('/:id/data_this_week', function(request, response) {
  var id = Number(request.params['id']);
  var sensor = sensors[id];

  if (sensor) {
    mongoClient.connect(uri, options, (error, client) => {
      if (error) {
        resquest.send(error);
      } else {
        var data = client
                     .db(dbName)
                     .collection('data')
                     .find({ sensorId: id , date: { $gte: startOfThisWeek() } })
                     .sort({ date: 1 });
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

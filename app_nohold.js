var http = require('http');
var fs = require('fs');
var path = require('path');
var util = require('util');
var assert = require('assert');
var ex = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/test';
var app = ex();
var index = './index.html';

var insertData = function(db, doc, callback) {
    db.collection('data').insertOne(doc, function(err) {
        assert.equal(err, null);
        console.log("Inserted Data");
        callback();
    });
};

var insertGPoints = function(db, doc, callback) {
    var newdoc = {
        "_id": doc._id,
        "latitude": doc.latitude,
        "longitude": doc.longitude,
        "username": doc.username
    };
    db.collection('location').insertOne(newdoc, function(err) {
        assert.equal(err, null);
        console.log("Inserted GPoints");
        callback();
    });
};

var replaceData = function(db, doc, callback) {
    db.collection('data').replaceOne(
        {"_id" : doc._id} ,doc, function(err) {
        assert.equal(err, null);
        console.log("Updated Data");
        callback();
    });
};

var replaceLocation = function(db, doc, callback) {
    var newdoc = {
        "_id": doc._id,
        "latitude": doc.latitude,
        "longitude": doc.longitude,
        "username": doc.username
    };
    db.collection('location').replaceOne(
        {"_id": doc._id }, newdoc, function(err) {
        assert.equal(err, null);
        console.log("Inserted GPoints");
        callback();
    });
};

var deleteData = function(db, col, id, callback) {
    db.collection(col).deleteOne(
        { "_id": id}, function(err) {
            assert.equal(err, null);
            callback();
        }
    )
}

var queryLocation = function(db, lst, callback) {
    var lst2 = lst;
    var location = db.collection('location').find();
    location.each(function(err, doc) {
        assert.equal(err, null);
        if (doc != null) {
            lst2.push(doc);
        } else {
            callback(lst2);
        }
    });
};

var queryData = function(db, id, callback) {
    var data = null;
    var location = db.collection('data').find( {"_id": id} );
    location.each(function(err, doc) {
        assert.equal(err, null);
        if (doc != null) {
            data = doc;
        } else {
            callback(data);
        }
    });
};

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json());

app.get('/', function (req, res){
    console.log("index viewed");
    res.sendfile(index);
});

app.put('/update', function (req, res) {
    console.log(req.body);
    var reqbody = req.body;
    reqbody._id = reqbody.id;
    delete reqbody.id;
    var item = req.body.modified;
    console.log(item);
    if (item == false) {
        mongo.connect(url, function (err, db) {
            queryData(db, reqbody._id, function(dta){
                if (dta == null) {
                    insertData(db, reqbody, function () {
                        console.log(reqbody._id + " Data inserted");
                        insertGPoints(db, reqbody, function () {
                            console.log(reqbody._id + " GPoints inserted");
                            db.close();
                            res.send(reqbody);
                        })
                    })
                } else {
                    console.log("err needs to be handle");
                    res.send({"error":"existed id"});
                }
            })
        })
    }
    else {
        mongo.connect(url, function (err, db){
            replaceData(db, reqbody, function() {
                console.log(reqbody._id + " Data replaced");
                replaceLocation(db, reqbody, function () {
                    console.log(reqbody._id + " GPoints replaced");
                    db.close();
                    res.send(reqbody);
                })
            })
        })
    }
});

app.put('/delete', function (req, res) {
    var id = req.headers['id'];
    mongo.connect(url, function(err, db){
        deleteData(db, 'data', id, function(){
            console.log('deleted data');
            deleteData(db, 'location', id, function(){
                console.log('deleted location');
                db.close();
            })
        })
    })
    res.send({"result":'probably succesfully deleted'});
});

app.get('/queryLocation', function (req, res){
    var lst = [];
    mongo.connect(url, function(err, db){
        queryLocation(db, lst, function(lst2){
            console.log("all locations are queried");
            console.log(lst2);
            var doc = {
                "data": lst2
            }
            db.close();
            res.send(doc);
        })
    })
});

app.get('/queryData', function (req, res){
    var id = req.headers['id'];
    console.log("getting ID " + id);
    mongo.connect(url, function(err, db){
        queryData(db, id, function(dta){
            console.log("the data is queried");
            console.log(dta);
            var doc = dta;
            db.close();
            res.send(doc);
        })
    })
});

app.listen(4000, function() {
    mongo.connect(url, function (err, db) {
        console.log("Successfully connected to the MONGODATABASE");
        db.close();
    });
});

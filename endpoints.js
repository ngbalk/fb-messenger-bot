
/*
*
* endpoints
*
*/

// configure database
var firebase = require("firebase-admin");
firebase.initializeApp({
  credential: firebase.credential.cert("firebase-sdk-keys.json"),
  databaseURL: "https://flights-genie.firebaseio.com"
});
// Get a reference to the database service
var database = firebase.database();

// setup express
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

// load and configure genieApi
var genieApi = require('genie.apiclient');
genieApi.config({accessKey: '79ecbb99-fd8f-4dc7-9cfb-825c1d79fb29', accessSecret: '9be5a4eba01d0de93b67f2821156141d91dcf5e55662068d91715e8c8aa2924e'});

// load valid US airport codes for validation
var fs = require("fs");
var buffer = fs.readFileSync("./airport-codes.dat");
var airportCodes = buffer.toString().split("\n");

//register endpoints
var app = express();
app.use(bodyParser.json());
app.use(cors());
app.get('/genie_profile', function (req, res) {
	console.log("getting configuration");
    database.ref('/airports/' + req.query.blendKey).once('value').then(function(dataSnapshot) {
        var retData = { data : [{
                        name: 'airport',
                        value: dataSnapshot.val()
                    }]};
        res.status(200).json(retData).end();
    });

});

app.get('/vote/:groupKey/:choice', function(req, res){
    database.ref('/votes/'+req.params.groupKey).push(req.params.choice);
    res.send("you voted for "+req.params.choice);
});

app.post('/genie_profile', function (req, res) {
    genieApi.isValidClientRequest(req, function(userKey, cb){
        if(airportCodes.contains(req.body.airport.toUpperCase())){
            database.ref('/airports/' + userKey).set(req.body.airport);
            res.status(200).end();
        }
        else{
            res.status(500).end();
        }
    });
});

app.post('/events', function (req, res) {
    var currentUrl = 'https://letsgetawaytoday.hopto.org/events';
    genieApi.processEvent(currentUrl, req, res, function(err,eventData){
        if (err) return console.error(err);
        if (!eventData || !eventData.event) return;
 
        switch(eventData.event.type){
            case 'subscription/success': break;

            case 'genie/added':
                var groupsRef = database.ref('/groups/' + eventData.group.id);
                var members = [];
            	console.log('added to group', eventData.group.id);
            	for(var i in eventData.payload.members){
            		members.push(eventData.payload.members[i].id);
            	}
                groupsRef.set(members);
            break;

            case 'genie/removed':
                database.ref('/groups/' + eventData.group.id).remove();
            	console.log('removed from group', eventData.group.id);
            break;

            case 'member/leave' || 'member/removed':
                var groupsRef = database.ref('/groups/' + eventData.group.id);
                groupsRef.once("value").then(function(groupSnapshot) {
                    groupSnapshot.forEach(function(memberSnapshot) {
                      if(eventData.payload.members.contains(memberSnapshot.val())){
                        memberSnapshot.ref().remove();
                        console.log('member ' + memberSnapshot.val() + ' left from group');
                      }
                  });
                });
            break;      
            
            case 'member/added':
                var groupsRef = database.ref('/groups/' + eventData.group.id);
                var members = [];
                for(var i in eventData.payload.members){
                    members.push(eventData.payload.members[i].id);
                    console.log('member ' + eventData.payload.members[i].id + ' added to group');
                }
                groupsRef.set(members);
            break;
        }
	});
});

app.get('/', function(req, res){
    res.send("hello genie");
});

app.listen(8080, function () {
  console.log('Genie started on port 8080');
});

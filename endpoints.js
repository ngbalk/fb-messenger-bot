var airportsService = require('./airports-service');
// var database = require('./firebase-config.js');
var flightsService = require('./flights-data-service');
var messagingService = require('./messaging-service');

// setup express
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

// load valid US airport codes for validation
var fs = require("fs");
var buffer = fs.readFileSync("./airport-codes.dat");
var airportCodes = buffer.toString().split("\n");

//register endpoints
var app = express();
app.use(bodyParser.json());
app.use(cors());

//Page Access Token EAAKNgXSzsvABAPhNDJz2yZCiFocO3nNYKBP49N02YQ6szwA0AQent404SGDTL1tKYwJ2N7SoG6A0CeIiwRSbH6cwmarDLlS9Mxy0ZBjRRAXNdRVOvZCx56PYr1i7bT7Ura92nRn8dh8XMnZAvUxD26p1ZC5D7bzJNZCIRkysm1NAZDZD

// GET /webhook
app.get('/webhook', function (req, res) {
	console.log("subscribing via webhook");
if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === "cooking_with_the_sauce") {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
} 
else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
}  

});

// POST /webhook
app.post('/webhook', function (req, res) {
    var data = req.body;

  if (data.object === 'page') {
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
        var pageID = entry.id;
        var timeOfEvent = entry.time;
        entry.messaging.forEach(function(event) {
            if (event.message) {
                processMessage(event);
            } 
            else {
                console.log("Webhook received unknown event: ", event);
            }
        });
    });
    res.sendStatus(200);
  }
});

function processMessage(event){
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {

        switch (messageText) {
            case 'flights':
                // flightsService.getTrips(['JFK','LAX','domestic']);
            break;

            default:
                //doSomethingElse
        }
    }
}


// GET /
app.get('/', function(req, res){
    res.send("hello facebook bot");
});

app.listen(8080, function () {
  console.log('FbM bot started on port 8080');
});

/*
* Send flight messages to a single group
* @groupId group to send flights to
* @destination 'international' or 'domestic'
*/
function sendFlightsMessageToGroup(groupId, destination){
    database.ref('/groups/'+groupId).once('value').then(function(groupSnapshot) {
        database.ref('/airports').once('value').then(function(airportsSnapshot) {
          var group = groupSnapshot.val();
          var airportUserMapping = airportsSnapshot.val();
            var origins = [];
            for(var i=0;i<group.length;i++){
              var member=group[i];
              if(airportUserMapping[member]){
                origins.push(airportUserMapping[member]);
              }
            }
            var promises = flightsService.getTrips(origins,destination);
            messagingService.sendFlightResultsToGroup(promises,groupId);
        });
    });
}
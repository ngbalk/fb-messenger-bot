var airportsService = require('./airports-service');
var database = require('./firebase-config.js');
var flightsService = require('./flights-data-service');
var messagingService = require('./messaging-service');

// setup express
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

// load and configure genieApi
var config = require('./config');
var genieApi = require('genie.apiclient');
genieApi.config(config);

//load fancy pants generator
var fancyPanelGenerator = require('./fancy-panel-generator');

// load valid US airport codes for validation
var fs = require("fs");
var buffer = fs.readFileSync("./airport-codes.dat");
var airportCodes = buffer.toString().split("\n");

//register endpoints
var app = express();
app.use(bodyParser.json());
app.use(cors());

// GET /genie_profile
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

// GET /vote/:groupKey/:choice
app.get('/vote/:groupKey/:choice', function(req, res){
    database.ref('/votes/'+req.params.groupKey).push(req.params.choice);
    res.send("you voted for "+req.params.choice);
});

// POST /genie_profile
app.post('/genie_profile', function (req, res) {
    genieApi.isValidClientRequest(req, function(userKey, cb){
        if(airportCodes.includes(req.body.airport.toUpperCase())){
            database.ref('/airports/' + userKey).set(req.body.airport.toUpperCase());
            res.status(200).end();
        }
        else{
            res.status(401).json({error: "please enter a valid airport code"}).end();
        }
    });
});

// POST /events
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

                // Just added the genie, so tell people to configure it
                var data = 
                    {
                        text: "You added the Lets Get Away Genie! You're awesome!  Now make sure to configure the genie with your preferences under the genie profile so we can start working for you!",
                        display_unit: "default"
                    };
                genieApi.post('/genies/groups/'+eventData.group.id+'/message', data, function(e,r,b){});
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

                // a new member was added, so send message telling them to configure their genie genie_profile
                var data = 
                    {
                        text: "You just added a new member to the group! Make sure to configure your airport code and accept our permissions requests in our genie profile so we can start working for you!",
                        display_unit: "default"
                    };
                genieApi.post('/genies/groups/'+eventData.group.id+'/message', data, function(e,r,b){});
            break;

            case 'content/message':
                var message = eventData.payload.message.text;
                if(message.startsWith("/trips ")){
                    var inputDestination = message.substr(message.indexOf(' ')+1);
                    switch(inputDestination){
                        case 'DOMESTIC':
                            console.log("domestic flights request received from group "+eventData.group.id);
                            sendFlightsMessageToGroup(eventData.group.id,"domestic");
                        break;

                        case 'INTERNATIONAL':
                            console.log("international flights request received from group "+eventData.group.id);
                            sendFlightsMessageToGroup(eventData.group.id,"international");
                        break;

                        default:
                            var codePromise = airportsService.autocompleteAirportCode(inputDestination);
                            codePromise.then(function(code){

                                var panelPromise = fancyPanelGenerator.generate(eventData.group.id, code);
                                panelPromise.then(function(data){
                                    genieApi.post('/genies/groups/'+eventData.group.id+'/message', data, function(e,r,b){
                                            console.log("sending /trips results to group "+eventData.group.id);
                                    });
                                });
                            }).catch(function(e){
                                console.log(e);
                                var data = 
                                    {
                                        text: "Sorry, we couldn't find a matching airport code for your request.",
                                        display_unit: "default"
                                    };
                                genieApi.post('/genies/groups/'+eventData.group.id+'/message', data, function(e,r,b){});
                            });

                    }

                }

        }
	});
});

// GET /
app.get('/', function(req, res){
    res.send("hello genie");
});

// serve images
app.get('/avatar', function(req, res){
    res.sendFile(__dirname+"/genie_avatar.jpg");
});
app.get('/header', function(req, res){
    res.sendFile(__dirname+"/genie_header.jpg");
});
app.get('/chat', function(req, res){
    res.sendFile(__dirname+"/genie_chat.jpg");
});
app.get('/gif', function(req, res){
    res.sendFile(__dirname+"/genie_gif.jpg");
});

app.listen(8080, function () {
  console.log('Genie started on port 8080');
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

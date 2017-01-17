
/*
*
* endpoints
*
*/

// setup express
var express = require('express');
var bodyParser = require('body-parser');

// load and configure genieApi
var genieApi = require('genie.apiclient');
genieApi.config({accessKey: '79ecbb99-fd8f-4dc7-9cfb-825c1d79fb29', accessSecret: '9be5a4eba01d0de93b67f2821156141d91dcf5e55662068d91715e8c8aa2924e'});


//register endpoints
var app = express();
app.use(bodyParser.json());

var airportUserMapping = {};
var groups = {};

app.get('/genie_profile', function (req, res) {
	console.log("getting configuration");
	var retData = { data : [{
						name: 'airport',
						value: airportUserMapping[req.query.blendKey] || 'JFK'
					}]};
	res.status(200).json(retData).end();
});

app.post('/genie_profile', function (req, res) {
	console.log(req);
	airportUserMapping[req.query.blendKey] = req.body.airport;
	res.status(200).end();
});

app.post('/events', function (req, res) {
	console.log("receiving event");
	console.log(req);
    var currentUrl = 'https://genie.localtunnel.me/events';
    genieApi.processEvent(currentUrl, req, res, function(err,eventData){
        if (err) return console.error(err);
        if (!eventData || !eventData.event) return;
 
        switch(eventData.event.type){
            case 'subscription/success': break;

            case 'genie/added': 
            	console.log('added to group', eventData.group.id);
            	groups[eventData.group.id] = [];
            	for(var i in eventData.payload.members){
            		groups[eventData.group.id].push(eventData.payload.members[i].id); 
            		console.log(eventData.payload.members[i]);
            	}
            break;

            case 'genie/removed':
            	delete groups[eventData.group.id];
            	console.log('removed from group', eventData.group.id);
            break;

            case 'member/leave' || 'member/removed':
                for(var i in eventData.payload.members){
                    groups[eventData.group.id].splice(groups[eventData.group.id].indexOf(eventData.payload.members[i].id),1); 
                    console.log('member ' + eventData.payload.members[i].id + ' left from group');
                }
            break;      
            
            case 'member/added':
                for(var i in eventData.payload.members){
                    groups[eventData.group.id].push(eventData.payload.members[i].id); 
                    console.log('member ' + eventData.payload.members[i].id + ' added to group');
                }
            break;
        }
	});
});

app.listen(8080, function () {
  console.log('Genie started on port 8080');
});
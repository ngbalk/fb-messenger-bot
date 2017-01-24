// configure database
var firebase = require("firebase-admin");
firebase.initializeApp({
  credential: firebase.credential.cert("firebase-sdk-keys.json"),
  databaseURL: "https://flights-genie.firebaseio.com"
});
var database = firebase.database();

// configure genie api
var genieApi = require('genie.apiclient');
genieApi.config({accessKey: '79ecbb99-fd8f-4dc7-9cfb-825c1d79fb29', accessSecret: '9be5a4eba01d0de93b67f2821156141d91dcf5e55662068d91715e8c8aa2924e'});

database.ref('/votes').once('value').then(function(groupsSnapshot) {
	var groups = groupsSnapshot.val();
	for(var id in groups){
		var code = "";
		var destCounts = {};
		for(var opId in groups[id]){
			var op = groups[id][opId];
			if(!destCounts[op]){
				destCounts[op]=0;
			}
			destCounts[op]++;
		}
		if(Object.keys(destCounts).length<Object.keys(destCounts).length*.75){
			var data = {
	        	text: 'remember to vote for your favorite destination',
	          	display_unit: "message",
	    	}
		}
		else{
			var winner = Object.keys(destCounts).reduce(function(a, b){return destCounts[a] > destCounts[b] ? a : b });
			var data = {
	        	text: selectRandomMessage(winner),
	          	display_unit: "fancy",
	          	on_tap: 'https://www.skyscanner.com/transport/flights/us/'+winner,
				payload: 
					{
		     			collection_items : 
		     			[
			     			{
			     				type: 'item',
			     				width: 'large',
			     				background_color: '#72ffff',
			     				border: true,
			     				on_tap: 'https://www.skyscanner.com/transport/flights/us/'+winner,
			     				elements: [
			     					{
			     						type: 'image',
			     						image: {
				     						url: 'https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg',
				     						aspect_ratio: 1.33,
			     						},
			     					},

			     					{
				     					type: 'label',
				     					label: {
				     						value: `lets plan your trip to ${winner}!`,
			     						}
			     					}
			     				
			     				],
			     			}
		     			]
	     		}
	        };			
		}
        genieApi.post('/genies/groups/'+id+'/message', data, function(e,r,b){
        	console.log("sending voting results");
        });
    }
});

function selectRandomMessage(winner){
	var messages = [`breaking news... the winner is ${winner}!`,
				`this just in, ${winner} wins!`,
				`drum roll please... its ${winner}!`,
				`lets start planning your trip to... ${winner}!`];
	return messages[getRandomIntInclusive(0,messages.length)];

}
function getRandomIntInclusive(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

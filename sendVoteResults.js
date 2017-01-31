var genieApi = require('genie.apiclient');
var firebase = require("firebase-admin");
var database = require('./database-config');
var config = require('./config');

genieApi.config(config);

database.ref('/votes').once('value').then(function(groupsSnapshot) {
	var groups = groupsSnapshot.val();
	for(var id in groups){
		database.ref('/groups/'+id).once('value').then(function(membersSnapshot){
			var members = membersSnapshot.val();
			var destCounts = {};
			for(var opId in groups[id]){
				var op = groups[id][opId];
				if(!destCounts[op]){
					destCounts[op]=0;
				}
				destCounts[op]++;
			}
			if(Object.keys(destCounts).length<Object.keys(members).length*.75){
				var data = {
		        	text: 'remember to vote for your favorite destination',
		          	display_unit: "default",
		    	}
			}
			else{
				var winner = Object.keys(destCounts).reduce(function(a, b){return destCounts[a] > destCounts[b] ? a : b });
				database.ref('/images').once('value').then(function(imageSnapshot){
					var cityImages=imageSnapshot.val();
					database.ref('/airports').once('value').then(function(airportsSnapshot){
						var airports = airportsSnapshot.val();
						var panels = [];
						for(var i in members){
							var member = members[i];
							var memberOriginAirport = airports[member];
							var panel = 
								{
			     					type: 'item',
			     					width: 'large',
			     					background_color: '#e0f7fc',
			     					border: true,
			     					elements: 
			     					[
			     						{
			     							type: 'image',
			     							image: 
			     							{
			     								url: cityImages[memberOriginAirport] || 'https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg'
			     							}

			     						},
			     						{
			     							type: 'spacing'
			     						},
			     						{
							                type: "icon_label",
							                label: {
							                    value: `flights from ${memberOriginAirport} to ${winner}`,
							                    color: "#000000",
							                    font_size: 18,
							                    font_weight: 'bold',
							                    max_lines: 2, // 2 by default and if not defined a max of 5 lines.
							                },
							                alignment: 'center'
			     						},
			     						{
			     							type: 'spacing'
			     						},
			     						{
			     							type: 'image',
			     							image: 
			     							{
			     								url: cityImages[winner] || 'https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg'
			     							}
			     						},
			     						{
							                type: 'spacing',
							            },
							            {
							                type: 'button',
							                on_tap: `https://www.skyscanner.com/transport/flights/${memberOriginAirport}/${winner}`,
							                background_color: "#d6f0ff",
							                 
							                label: {
							                	value: "book now",
							                    color: "#000000",
							                    font_size: 18,
							                    font_weight: 'normal',
							                    max_lines: 2,
							                    alignment: 'center'
							                }
							            }
			     					]
			     				}
			     			panels.push(panel);
						}
						var data = {
				        	text: selectRandomMessage(winner),
				          	display_unit: "fancy",
							payload: 
								{
					     			collection_items : panels
				     			}
			        	};
					    genieApi.post('/genies/groups/'+id+'/message', data, function(e,r,b){
				        	console.log("sending voting results");
				        });
					});				
				});
			}
	    });
    }
});

function selectRandomMessage(winner){
	var messages = [`breaking news... the winner is ${winner}!`,
				`this just in, ${winner} wins!`,
				`drum roll please... the winner is ${winner}!`,
				`lets start planning your trip to... ${winner}!`];
	return messages[getRandomIntInclusive(0,messages.length)];

}
function getRandomIntInclusive(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

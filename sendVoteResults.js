var genieApi = require('genie.apiclient');
var firebase = require("firebase-admin");
var database = require('./database-config');
var config = require('./config');
var flightsService = require('./flights-data-service');
genieApi.config(config);

database.ref('/votes').once('value').then(function(groupsSnapshot){
	var groups = groupsSnapshot.val();
	for(var groupId in groups){
		database.ref('/groups/'+groupId).once('value').then(function(membersSnapshot){
			var members = membersSnapshot.val();
			var destCounts = {};
			for(var opId in groups[groupId]){
				var op = groups[groupId][opId];
				if(!destCounts[op]){
					destCounts[op]=0;
				}
				destCounts[op]++;
			}
			if(false/*Object.keys(destCounts).length<Object.keys(members).length*.75*/){

				var data = {
		        	text: 'remember to vote for your favorite destination',
		          	display_unit: "default",
		    	};
    			genieApi.post('/genies/groups/'+groupId+'/message', data, function(e,r,b){
		        	console.log("sending voting reminder");
		        });
			} else {

				var winner = Object.keys(destCounts).reduce(function(a, b){return destCounts[a] > destCounts[b] ? a : b });
				database.ref('/images').once('value').then(function(imageSnapshot){
					var cityImages=imageSnapshot.val();
					database.ref('/airports').once('value').then(function(airportsSnapshot){
						var airports = airportsSnapshot.val();
						var groupOrigins = [];
						for(var i in members){
							var member = members[i];
							var memberOriginAirport = airports[member];
							groupOrigins.push(memberOriginAirport);
						}
						var datesData = flightsService.getCheapestDates(groupOrigins, winner);
						var panels = [];
						for(var i=0;i<groupOrigins.length;i++){
							var memberOriginAirport = groupOrigins[i];
							// get min price associated with this origin-dest
							var minPrice = 0;
							for(var j=0;j<datesData.totalPrice.length;j++){
								if(memberOriginAirport==datesData.totalPrice[j].code){
									minPrice = datesData.totalPrice[j].price
								}
							}
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
							                type: "icon_label",
							                label: {
							                    value: `$${minPrice}`,
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
							                on_tap: `https://www.skyscanner.com/transport/flights/${memberOriginAirport}/${winner}/${datesData.outboundDate.yyyymmdd()}/${datesData.inboundDate.yyyymmdd()}`,
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
				        	text: 
				        		`${selectRandomMessage(winner)}\nwe found you the cheapest flights on these dates:\n\noutbound: ${datesData.outboundDate.toDateString()}\ninbound: ${datesData.inboundDate.toDateString()}`
				        	 ,
				          	display_unit: "fancy",
							payload: 
								{
					     			collection_items : panels
				     			}
			        	};
					    genieApi.post('/genies/groups/'+groupId+'/message', data, function(e,r,b){
				        	console.log("sending voting results");
				        });
					});				
				});
			}
	    });
    }
});

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('');
};

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

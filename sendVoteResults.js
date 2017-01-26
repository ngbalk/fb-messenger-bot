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
		database.ref('/groups/'+id).once('value').then(function(membersSnapshot){
			var members = membersSnapshot.val();
			var code = "";
			var destCounts = {};
			for(var opId in groups[id]){
				var op = groups[id][opId];
				if(!destCounts[op]){
					destCounts[op]=0;
				}
				destCounts[op]++;
			}
			console.log(Object.keys(destCounts).length);
			console.log(Object.keys(members).length*.75);
			if(Object.keys(destCounts).length<Object.keys(members).length*.75){
				var data = {
		        	text: 'remember to vote for your favorite destination',
		          	display_unit: "default",
		    	}
			}
			else{
				var winner = Object.keys(destCounts).reduce(function(a, b){return destCounts[a] > destCounts[b] ? a : b });
				database.ref('/images/'+winner).once('value').then(function(imageSnapshot){
					imageUrl=imageSnapshot.val();
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
				     					background_color: '#e0f7fc',
				     					border: true,
				     					elements: 
				     					[
				     						{
				     							type: 'image',
				     							image: 
				     							{
				     								url: imageUrl
				     							}

				     						},
				     						{
								                type: "icon_label",
								                label: {
								                    value: 'SFO',
								                    color: "#000000",
								                    font_size: 18,
								                    font_weight: 'bold',
								                    max_lines: 2, // 2 by default and if not defined a max of 5 lines.
								                },
								                alignment: 'center'
				     						}

				     					]
				     				}
				     			]
			     			}
		        	};
				    genieApi.post('/genies/groups/'+id+'/message', data, function(e,r,b){
			        	console.log("sending voting results");
			        });
				});

			
			}

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

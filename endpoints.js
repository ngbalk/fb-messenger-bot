

// send message to groups with a trip recommendation

// var groupsData = {};
// function sendGroupRecs(){
//  for(var group in groupsData){
//  	var data = {
//  		text: "Check out this trip!",
//  		display_unit: "...",
//  		payload: {},
//  		push: {
//  			text: '...'
//  		}
//  	};
//  	genieApi.post('/genies/groups/group.id/message', data, function(e,r,b){
//  		console.log("sending message");
//  	});
//  }
// }

var express = require('express');

//register endpoints
var app = express();

/** Accept genie group events **/
app.get('/genie_profile', function (req, res) {
	res.send(
		{
			name: 'airport',
			value: 'JFK'
		}
	);
});


app.listen(8080, function () {
  console.log('Genie started on port 8080');
});
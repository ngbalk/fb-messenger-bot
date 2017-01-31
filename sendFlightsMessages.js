var genieApi = require('genie.apiclient');
var config = require('./config');
var flightsService = require('./flights-data-service');
var database = require('./database-config');

genieApi.config(config);

/*
* Send trip recommendations to each group
*/

(function sendGroupRecs(){
  database.ref('/groups').once('value').then(function(groupsSnapshot) {
    database.ref('/airports').once('value').then(function(airportsSnapshot) {
      var groups = groupsSnapshot.val();
      var airportUserMapping = airportsSnapshot.val();
      for(var id in groups){
        if(!allConfiguredUsers(id, groups[id], airportUserMapping)){
          continue;
        }
        resetVotesForGroup(id);
        var dests = [];
        var origins = [];
        for(var i=0;i<groups[id].length;i++){
          var member=groups[id][i];
          origins.push(airportUserMapping[member]);
        }
        dests = flightsService.getTrips(origins,'domestic');
        var items = [];
        for(var i=0;i<5;i++){
          dest=dests[i];
          var item = {
            index:i+1,
            title: dest.destinationName,
            description: 'group trips from $'+dest.totalCost,
            on_tap: 'https://letsgetawaytoday.hopto.org/vote/'+id+'/'+dest.skyscannerCode
          };
          items.push(item);
        }
        var data = {
          text: "Check out these group trips!",
          display_unit: "list",
          payload: {
            items: items
          } 
        };
        genieApi.post('/genies/groups/'+id+'/message', data, function(e,r,b){
        console.log("sending message");
        });
      }
    });
  });
})();

function resetVotesForGroup(groupId){
  database.ref('/votes/'+groupId).set(null);
}

function allConfiguredUsers(id, group, airportUserMapping){
  var allConfigured=true;
  for(var i=0;i<group.length;i++){
    var member = group[i];
    if(!airportUserMapping[member]){
      genieApi.post('/genies/groups/'+id+'/users/'+member+'/alert', null, function(e,r,b){

      });
      allConfigured=false;
      console.log("unconfigured user");
    }
  }
  return allConfigured;
}

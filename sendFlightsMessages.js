var genieApi = require('genie.apiclient');
var config = require('./config');
var flightsService = require('./flights-data-service');
var database = require('./database-config');
var messagingService = require('./messaging-service');

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
        var origins = [];
        for(var i=0;i<groups[id].length;i++){
          var member=groups[id][i];
          origins.push(airportUserMapping[member]);
        }
        var promises = flightsService.getTrips(origins,'international');
        messagingService.sendFlightResultsToGroup(promises,id);
      }
    });
  });
})();

function allConfiguredUsers(id, group, airportUserMapping){
  var allConfigured=true;
  for(var i=0;i<group.length;i++){
    var member = group[i];
    if(!airportUserMapping[member]){
      genieApi.post('/genies/groups/'+id+'/users/'+member+'/alert', null, function(e,r,b){
        console.log("notifying unconfigured user");
      });
      allConfigured=false;
    }
  }
  return allConfigured;
}

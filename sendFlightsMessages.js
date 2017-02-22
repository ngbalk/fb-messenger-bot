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
        var dests = [];
        var origins = [];
        for(var i=0;i<groups[id].length;i++){
          var member=groups[id][i];
          origins.push(airportUserMapping[member]);
        }
        var promises = flightsService.getTrips(origins,'international');
        (function sendResults(groupId){
          Promise.all(promises).then(function(rawResults){
            var dests = flightsService.doParsing(rawResults);
            var items = [];
            for(var i=0;i<10;i++){
              dest=dests[i];
              var item = {
                index:i+1,
                title: dest.destinationName,
                description: 'group trips from $'+dest.totalCost,
                on_tap: "useraction://message?text='hello world'&id='abcd'"
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
            genieApi.post('/genies/groups/'+groupId+'/message', data, function(e,r,b){
              console.log("sending message");
            });
          });
        })(id);
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

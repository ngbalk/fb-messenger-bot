var flightsService = require('./flights-data-service');

var messagingService = {};

messagingService.sendFlightResultsToGroup = function(promises, groupId){
  Promise.all(promises).then(function(rawResults){
    var dests = flightsService.doParsing(rawResults);
    var items = [];
    for(var i=0;i<10;i++){
      dest=dests[i];
      if(!dest){
        continue;
      }
      var item = {
        index:i+1,
        title: dest.destinationName,
        description: 'group trips from $'+dest.totalCost,
        on_tap: "useraction://message?text=/trips "+dest.skyscannerCode+"&id=''"
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
      console.log("sending flights list to group "+groupId);
    });
  });
}

module.exports = messagingService;
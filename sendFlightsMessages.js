var genieApi = require('genie.apiclient');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

genieApi.config({accessKey: '79ecbb99-fd8f-4dc7-9cfb-825c1d79fb29', accessSecret: '9be5a4eba01d0de93b67f2821156141d91dcf5e55662068d91715e8c8aa2924e'});
var apiKey='prtl6749387986743898559646983194';

/*
* @originCities - array of airport codes
* @scope - 'domestic' or 'international'
*/
function getTrips(originCities, scope){
  var dest = null;
  if(scope=='domestic'){
    dest='US';
  }
  if(scope=='international'){
    dest=='anywhere';
  }
  var tripsData = [];
  for(var i=0;i<originCities.length;i++){
    originCity=originCities[i] || 'JFK';
    var xmlHttp = new XMLHttpRequest();
    var url = 'http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/US/USD/en-US/'+originCity+'/'+dest+'/anytime/anytime?apiKey='+apiKey;
    xmlHttp.open("GET",url, false);
    xmlHttp.send(null);
    tripsData.push(JSON.parse(xmlHttp.responseText));
  }
  return doParsing(tripsData);
}

function doParsing(travelDataArray){
  var travelDataObject=travelDataArray[0];
  if(!travelDataObject){
    return [];
  }
  
  var tripQuotesArray=travelDataObject.Quotes;

  var groupTripOptionsByPrice=[];
  for(var i=0;i<tripQuotesArray.length;i++){
    var tripQuote=tripQuotesArray[i];
    var result=isCommonDestination(tripQuote, travelDataArray);
    if(result){
      var totalCost=calculateTotalCost(result);
      var groupTripOptionData={
        destinationId: tripQuote.OutboundLeg.DestinationId,
        destinationName: getDestinationNameById(tripQuote.OutboundLeg.DestinationId,travelDataObject),
        skyscannerCode: getSkyscannerCodeById(tripQuote.OutboundLeg.DestinationId,travelDataObject),
        totalCost: totalCost,
        tripQuotes: result
      };
      groupTripOptionsByPrice.push(groupTripOptionData);
    }
  }
  groupTripOptionsByPrice.sort(function(a,b){
    return a.totalCost - b.totalCost;
  });
  return groupTripOptionsByPrice;
}

function isCommonDestination(keyTripQuote, travelDataArray){
  var keyDestinationId=keyTripQuote.OutboundLeg.DestinationId;
  var allTripsToSharedDestination=[];
  for(var j=1;j<travelDataArray.length;j++){
    var travelDataObject=travelDataArray[j];
    var foundMatch=false;
    var tripQuotesArray=travelDataObject.Quotes;
    for(var i=0;i<tripQuotesArray.length;i++){
      var tripQuote=tripQuotesArray[i];
      if(keyDestinationId==tripQuote.OutboundLeg.DestinationId){
        allTripsToSharedDestination.push(tripQuote);
        foundMatch=true;
        break;
      }
    }
    if(!foundMatch){
      return false;
    }
  }
  allTripsToSharedDestination.push(keyTripQuote);
  return allTripsToSharedDestination;
}

function calculateTotalCost(allTripsToSharedDestination){
  var totalCost=0;
  for(var i=0;i<allTripsToSharedDestination.length;i++){
    var trip=allTripsToSharedDestination[i];
    totalCost+=trip.MinPrice;
  }
  return totalCost;
}

function getDestinationNameById(destinationId, travelDataObject){
  var places = travelDataObject.Places;
  for(var i=0;i<places.length;i++){
    if(places[i].PlaceId==destinationId){
      return places[i].Name;
    }
  }
}

function getSkyscannerCodeById(destinationId,travelDataObject){
  var places = travelDataObject.Places;
  for(var i=0;i<places.length;i++){
    if(places[i].PlaceId==destinationId){
      return places[i].SkyscannerCode;
    }
  }
}

/*
* Send trip recommendations to each group
*/

// configure database
var firebase = require("firebase-admin");
firebase.initializeApp({
  credential: firebase.credential.cert("firebase-sdk-keys.json"),
  databaseURL: "https://flights-genie.firebaseio.com"
});
// Get a reference to the database service
var database = firebase.database();

(function sendGroupRecs(){
  database.ref('/groups').once('value').then(function(groupsSnapshot) {
    database.ref('/airports').once('value').then(function(airportsSnapshot) {
      var groups = groupsSnapshot.val();
      var airportUserMapping = airportsSnapshot.val();
      for(var id in groups){
        var dests = [];
        var origins = [];
        for(var i=0;i<groups[id].length;i++){
          var member=groups[id][i];
          origins.push(airportUserMapping[member]);
        }
        dests = getTrips(origins,'domestic');
        var items = [];
        for(var i=0;i<5;i++){
          dest=dests[i];
          var item = {
            index:i,
            title: dest.destinationName,
            description: 'group trips from $'+dest.totalCost
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

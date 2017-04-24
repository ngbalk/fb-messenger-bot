var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var apiKey='prtl6749387986743898559646983194';

var flightsService = {};

/**
 * Retrieve and parse commond destination trip data.
 * @originCodes - array of airport codes
 * @scope - 'domestic' or 'international'
 * Returns promise resolving to common destination trip data
 */
flightsService.getCheapestCommonDestinationTrips = function(originCodes, scope){
  var promises = flightsService.getTrips(originCodes, scope);
  return new Promise(function(resolve,reject){
    Promise.all(promises).then(function(data){
      var dests = flightsService.doParsing(data);
      resolve(dests);
    });
  });
}

/*
* @originCodes - array of airport codes
* @destinationCode - airport code of destination
*/
flightsService.getCheapestDates = function(originCodes, destinationCode){
  return new Promise(function(resolve,reject){

    var date = new Date();

    // look for flights next month
    date.setMonth(date.getMonth()+1);

    // convert date to two digit date
    var monthString = date.getFullYear() + '-' + ((''+(date.getMonth()+1)).length < 2 ? '0' + (date.getMonth()+1) : date.getMonth()+1);
    
    var rawDataPromises = callBrowseDatesAPI(originCodes, destinationCode, monthString, monthString);
    Promise.all(rawDataPromises).then(function(rawData){
      var datesPriceMapping = {};
      for(var i=0;i<rawData.length;i++){
        var code = originCodes[i];
        var quoteSet = rawData[i];
        for(var j=0;j<quoteSet.Quotes.length;j++){
          quote = quoteSet.Quotes[j];
          // quote is not for roundtrip
          if(! (quote.OutboundLeg && quote.InboundLeg)){
            continue;
          }

          //unique key to identify this date pair
          var datesKey = `${quote.OutboundLeg.DepartureDate} ${quote.InboundLeg.DepartureDate}`;
          if(!datesPriceMapping[datesKey]){
            datesPriceMapping[datesKey] = []
            datesPriceMapping[datesKey].push({code: code, price: quote.MinPrice});
          }
          else{
            // choose cheaper flight if multiple from same origin
            var exists = false;
            for(var p=0;p<datesPriceMapping[datesKey].length;p++){
              if(code == datesPriceMapping[datesKey][p].code){ 
                  exists = true;
                  if(quote.MinPrice < datesPriceMapping[datesKey][p].price){
                    datesPriceMapping[datesKey][p]={code: code, price: quote.MinPrice};
                  }
              }
            }
            if(!exists){
              datesPriceMapping[datesKey].push({code: code, price: quote.MinPrice});
            }
          }
        }   
      }

      // No results, so reject
      if(Object.keys(datesPriceMapping).length==0){
        reject(new Error('Could not find trips for destination '+destinationCode+' from origins '+originCodes));
      }

      // find min key-value pair in map
      var dates = Object.keys(datesPriceMapping).reduce(function(a, b){

        // flight exists for each origin
        if(datesPriceMapping[a].length < originCodes.length){
          return b;
        }
        if(datesPriceMapping[b].length < originCodes.length){
          return a;
        }

        // return the date with smallest sum of prices
        return datesPriceMapping[a].reduce(function(x, y){return x+parseFloat(y.price)},0)
        < datesPriceMapping[b].reduce(function(x, y){return x+parseFloat(y.price)},0) ? a : b 
      });

      var price = datesPriceMapping[dates];
      resolve({
        outboundDate: getDateFromString(dates.split(" ")[0]),
        inboundDate: getDateFromString(dates.split(" ")[1]),
        totalPrice: price
      });
    });

  });

  function getDateFromString(dateString){
    dateString = dateString.split("T")[0];
    var yearMonthDay = dateString.split("-");
    return new Date(yearMonthDay[0],yearMonthDay[1]-1,yearMonthDay[2]) 
  }
}

function callBrowseDatesAPI(originCodes, destinationCode, departureDateString, returnDateString){
  var tripsDataPromises = [];   
  for(var i=0;i<originCodes.length;i++){
    originCode=originCodes[i];
    var url = `http://partners.api.skyscanner.net/apiservices/browsedates/v1.0/US/USD/en-US/${originCode}/${destinationCode}/${departureDateString}/${returnDateString}?apiKey=${apiKey}`;
    var promise = new Promise(function(resolve,reject){
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET",url);
        xmlHttp.onload = function() {
          if (xmlHttp.status == 200) {
            resolve(JSON.parse(xmlHttp.responseText));
          }
          else {
            reject(Error(xmlHttp.statusText));
          }
        };
        xmlHttp.onerror = function() {
          reject(Error("Network Error"));
        };
        xmlHttp.send(null);
    });
    tripsDataPromises.push(promise);
  }
  return tripsDataPromises;
}


/*
* @originCities - array of airport codes
* @scope - 'domestic' or 'international'
* returns Promises, containing cheapest destinations
*/
flightsService.getTrips = function getTrips(originCities, scope){
  var dest = null;
  if(scope=='domestic'){
    dest='US';
  }
  if(scope=='international'){
    dest='anywhere';
  }
  var tripsDataPromises = [];
  for(var i=0;i<originCities.length;i++){
    originCity=originCities[i];
    var url = 'http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/US/USD/en-US/'+originCity+'/'+dest+'/anytime/anytime?apiKey='+apiKey;
    var promise = new Promise(function(resolve,reject){
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET",url);
        xmlHttp.onload = function() {
          if (xmlHttp.status == 200) {
            resolve(JSON.parse(xmlHttp.responseText));
          }
          else {
            reject(Error(xmlHttp.statusText));
          }
        };
        xmlHttp.onerror = function() {
          reject(Error("Network Error"));
        };
        xmlHttp.send(null);
    });
    tripsDataPromises.push(promise);
  }
  return tripsDataPromises;
}

/*
* @travelDataArray - array of raw travel data
*/
flightsService.doParsing = function doParsing(travelDataArray){
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

module.exports = flightsService;
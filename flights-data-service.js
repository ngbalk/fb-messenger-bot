var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var request = require('request');

var knex = require('knex')({
  dialect: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: ':memory:'
  }
});

var apiKey='prtl6749387986743898559646983194';

var flightsService = {};

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
* returns Promise, containing all destinations, sorted
*/
flightsService.getTrips = function getTripsNew(originCities, scope){

  return new Promise(function(resolve,reject){

    // Create destination table
    knex.schema.createTable('destinations', function(table) {
      table.increments('id');
      table.string('destination_id');
      table.string('airport_name');
      table.string('iata_code');
      table.string('city_name');
    })
    // Create quotes table
    .createTable('quotes',function(table){
      table.increments('id');
      table.string('origin');
      table.string('destination_id').references('destinations.destination_id');
      table.integer('price');
    })
    .then(function(){
      var dest = null;
      if(scope=='domestic'){
        dest='US';
      }
      if(scope=='international'){
        dest='anywhere';
      }

      var tripsDataPromises = [];
      
      for(var i=0;i<originCities.length;i++){

        var tripsPromise = new Promise(function(resolve,reject){
          originCity=originCities[i];
          var url = 'http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/US/USD/en-US/'+originCity+'/'+dest+'/anytime/anytime?apiKey='+apiKey;
          request({
            uri: url,
            method: 'GET'
          }, function(error, response, body){
            if (!error && response.statusCode == 200) {
          
              var knexPromises = [];

              var data = JSON.parse(body);

              // insert quotes into db
              var quotes = data.Quotes;
              
              quotes.forEach(function(value){
                var promise = new Promise(function(resolve,reject){knex.insert({origin:value.OutboundLeg.OriginId, destination_id:value.OutboundLeg.DestinationId, price:value.MinPrice}).into('quotes').then(resolve())});
                knexPromises.push(promise);  
              });  

              // insert destinations into db
              var destinations = data.Places;
              destinations.forEach(function(value){
                var promise = new Promise(function(resolve,reject){knex.insert({destination_id:value.PlaceId, airport_name:value.Name, iata_code:value.IataCode, city_name:value.CityName}).into('destinations').then(resolve())});
                knexPromises.push(promise);
              });
              
              // all db transactions completed
              Promise.all(knexPromises).then(function(data){

                resolve();

              });
            }
            else {
              reject(Error(error));
            }
          });
        });

        tripsDataPromises.push(tripsPromise);
      }

      // all requests completed, query db for cheapest quotes
      Promise.all(tripsDataPromises).then(function(data){

        knex.raw('select distinct iata_code, city_name, airport_name, q.destination_id, total_price from (select destination_id, sum(min_price) as total_price from (select destination_id, min(price) as min_price from quotes group by origin, destination_id) group by destination_id having count(*) = ?) q left join destinations d on q.destination_id = d.destination_id order by total_price',[originCities.length]).then(function(rows){resolve(rows)});
        
      });
    });
  });
}

module.exports = flightsService;
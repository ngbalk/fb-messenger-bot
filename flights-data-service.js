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

    // Create destination table
    knex.schema.createTable('destinations', function(table) {
      table.increments('id');
      table.integer('destination_id');
      table.string('airport_name');
      table.string('iata_code');
      table.string('city_name');
    })
    // Create quotes table
    .createTable('quotes',function(table){
      table.increments('id');
      table.integer('quote_id');
      table.integer('origin');
      table.integer('destination_id').references('destinations.destination_id');
      table.integer('price');
      table.date('outbound_date');
      table.date('inbound_date');
    })
    .then(function(){

      var date = new Date();

      // look for flights next month
      date.setMonth(date.getMonth()+1);

      // convert date to two digit date
      var monthString = date.getFullYear() + '-' + ((''+(date.getMonth()+1)).length < 2 ? '0' + (date.getMonth()+1) : date.getMonth()+1);
      
      var tripsDataPromises = [];   
      for(var i=0;i<originCodes.length;i++){
      tripsDataPromises.push(new Promise(function(resolve,reject){

        originCode=originCodes[i];
        var url = `http://partners.api.skyscanner.net/apiservices/browsedates/v1.0/US/USD/en-US/${originCode}/${destinationCode}/${monthString}/${monthString}?apiKey=${apiKey}`;
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

                // ensure has a return leg
                if(!value.InboundLeg || !value.OutboundLeg){
                  return;
                }

                var promise = new Promise(function(resolve,reject){knex.insert({quote_id:value.QuoteId, origin:value.OutboundLeg.OriginId, destination_id:value.OutboundLeg.DestinationId, outbound_date:value.OutboundLeg.DepartureDate, inbound_date:value.InboundLeg.DepartureDate, price:value.MinPrice}).into('quotes').then(resolve())});
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
        })); 
      }
      Promise.all(tripsDataPromises).then(function(results){

        knex.raw('select outbound_date, inbound_date, o.city_name as origin_city_name, o.iata_code as origin_iata_code, o.airport_name as origin_airport_name, d.city_name as dest_city_name, d.iata_code as dest_iata_code, d.airport_name as dest_airport_name, min(price) as min_price from quotes q left join destinations d on q.destination_id = d.destination_id left join destinations o on q.origin = o.destination_id where (outbound_date, inbound_date) in (select outbound_date, inbound_date from (select outbound_date, inbound_date, min(price) as min_price from quotes group by outbound_date, inbound_date, origin) group by outbound_date, inbound_date having count(*) = ? order by sum(min_price) limit 1) group by origin', [originCodes.length]).then(function(rows){resolve(rows)});

      });

    });

});
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

flightsService.getCheapestDatesNew(["LAX","JFK", "SFO"],"ORD").then(function(data){
  console.log(JSON.stringify(data, null, 2));
});

module.exports = flightsService;
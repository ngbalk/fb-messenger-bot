var request = require('request');

var apiKey = "edb20661-9813-42b7-b5b2-3fa70b6bcb76";

var airportsService = {};

airportsService.autocompleteAirportCode = function(cityNameString){
	return new Promise(function(resolve, reject){
		url = `http://iatacodes.org/api/v6/autocomplete?api_key=${apiKey}&query=${cityNameString}`;
		console.log(url);
		request({
			uri: url,
			method: 'GET'
			}, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					console.log("Querying for airport closest to %s", cityNameString);
					var data = JSON.parse(body);
					if(data.response && data.response.airports.length>0){
						resolve(data.response.airports[0].code);
					}
					else{
						reject(new Error("Could not resolve airport code from input destination name: "+cityNameString));
					}
				}
				else {
					console.error("Unable to query airport service.");
					console.error(error);
					console.error(response);
				}
			}
		);  
	});
}

module.exports=airportsService;

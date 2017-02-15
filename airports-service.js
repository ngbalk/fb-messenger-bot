var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var apiKey = "edb20661-9813-42b7-b5b2-3fa70b6bcb76";
var base = "https://iatacodes.org/api/v6/"

var airportsService = {};

airportsService.autocompleteAirportCode = function(cityNameString){
	return new Promise(function(resolve, reject){
		var xhr = new XMLHttpRequest();
		xhr.open("GET",base+'autocomplete?api_key='+apiKey+'&query='+cityNameString);
		xhr.onload = function(e){
			if(xhr.status==200){
				var jsonObj = JSON.parse(xhr.responseText);
				if(jsonObj.response && jsonObj.response.airports.length>0){
					resolve(jsonObj.response.airports[0].code);
				}
				else{
					console.log("cannot resolve airport code from location name");
					resolve(false);
				}
			}
			else{
				console.log(xhr.statusText);
			}
		}
		xhr.send(null);
	});
}

module.exports=airportsService;

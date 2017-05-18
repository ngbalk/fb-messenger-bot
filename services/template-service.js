var cityImagesMap = require('../data/city-images.json');

var templatizer = {};

templatizer.generateIntermediateOriginsMessage = function(origins){

  var message = {
    attachment: {
      type: "template",
      payload: {
          template_type: "button",
          text: `Awesome! I see you're coming from ${JSON.stringify(origins)}, anywhere else?'`,
          buttons: [
              {
                  "type":"postback",
                  "title":"Start Over",
                  "payload": "clear"
              },
              {
                  "type":"postback",
                  "title":"Search",
                  "payload": "search"
              }
          ]
      }
    }
  };
  return message;
}

templatizer.generateDestinationsListTemplateMessage = function(origins, dests, size){

    var elements = [];
    for(var i=0;i<size;i++){
      dest=dests[i];
      if(!dest){
        continue;
      }
      var element = {
        title: dest.city_name,
        image_url: cityImagesMap[dest.iata_code] || cityImagesMap["default"],
        subtitle: 'group trips from $'+dest.total_price,
        default_action: {
            type: "web_url",
            url: "https://www.skyscanner.com",
            webview_height_ratio: "compact",
        },
        buttons: [
          {
            "type":"postback",
            "title":"Find Dates",
            "payload": dest.iata_code
          }
        ]
      };
      elements.push(element);
    }
    var message = {
      attachment: {
        type: "template",
        payload: {
            template_type: "list",
            elements: elements
        }
      }
    };
    return message;
}

templatizer.generateFlightDatesGenericTemplateMessage = function(flights){

    var elements = [];
    for(var i=0;i<flights.length;i++){
      flight=flights[i];

      var element = {
        title: `${flight.origin_city_name} to ${flight.dest_city_name}`,
        image_url: cityImagesMap[flight.dest_iata_code] || cityImagesMap["default"],
        subtitle: `Flights from $${flight.min_price} departing ${normalizeUTCDate(flight.outbound_date).toDateString()}, returning ${normalizeUTCDate(flight.inbound_date).toDateString()}`,
        default_action: {
            type: "web_url",
            url: "https://www.skyscanner.com",
            webview_height_ratio: "compact",
        },
        buttons: [
          {
            "type":"web_url",
            "title":"Buy",
            "url": `https://www.skyscanner.com/transport/flights/${flight.origin_iata_code}/${flight.dest_iata_code}/${normalizeUTCDate(flight.outbound_date).yyyymmdd()}/${normalizeUTCDate(flight.inbound_date).yyyymmdd()}`,
            "webview_height_ratio": "full"
          }
        ]
      };
      elements.push(element);
    }
    var message = {
      attachment: {
        type: "template",
        payload: {
            template_type: "generic",
            elements: elements
        }
      }
    };
    return message;
}

templatizer.generateWebviewButtonTemplateMessage = function(){
  var message = {
    attachment: {
      type: "template",
      payload: {
          template_type: "button",
          text: "Enter your origin airports to get started!",
          buttons: [
              {
                  "type":"web_url",
                  "url":"https://fbmflights.localtunnel.me/webview",
                  "title":"Enter Origin Airports",
                  "webview_height_ratio": "compact"
              }
          ]
      }
    }
  };
  return message;
}

function normalizeUTCDate(dateString){
  var date = new Date(dateString);
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return date;
}

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('');
};

module.exports = templatizer;
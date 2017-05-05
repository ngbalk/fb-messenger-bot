var templatizer = {};

templatizer.generateDestinationsListTemplateMessage = function(origins, dests, size){

    var elements = [];
    for(var i=0;i<size;i++){
      dest=dests[i];
      if(!dest){
        continue;
      }
      var element = {
        title: dest.city_name,
        image_url: "https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg",
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
        image_url: "https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg",
        subtitle: `Flights from ${flight.min_price}`,
        default_action: {
            type: "web_url",
            url: "https://www.skyscanner.com",
            webview_height_ratio: "compact",
        },
        buttons: [
          {
            "type":"postback",
            "title":"Buy",
            "payload": "something"
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

module.exports = templatizer;
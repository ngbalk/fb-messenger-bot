var templatizer = {};

templatizer.generateListTemplateMessage = function(dests, size){
    console.log("creating template");
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
                "title": "Buy",
                "type": "web_url",
                "url": "https://www.skyscanner.com",
                "webview_height_ratio": "compact",
            }
        ]
      };
      elements.push(element);
    }
    console.log(elements);
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

module.exports = templatizer;
var database = require('./firebase-config.js');

var flightsService = require('./flights-data-service');

var fancyPanelGenerator = {};

fancyPanelGenerator.generate = function(groupId, destination){
	return new Promise(function(resolve, reject){
		database.ref('/groups/'+groupId).once('value').then(function(membersSnapshot){
				var members = membersSnapshot.val();
					database.ref('/images').once('value').then(function(imageSnapshot){
						var cityImages=imageSnapshot.val();
						database.ref('/airports').once('value').then(function(airportsSnapshot){
							var airports = airportsSnapshot.val();
							var groupOrigins = [];
							for(var i in members){
								var member = members[i];
								var memberOriginAirport = airports[member];
								// origin airport is different than destination airport
								if(memberOriginAirport!=destination && memberOriginAirport!=null){
									groupOrigins.push(memberOriginAirport);	
								}
							}
							// don't do anything if no origins
							if(groupOrigins.length==0){
								return;
							}
							var datesDataPromise = flightsService.getCheapestDates(groupOrigins, destination);
							datesDataPromise.then(function(datesData){
								var panels = [];
								for(var i=0;i<groupOrigins.length;i++){
									var memberOriginAirport = groupOrigins[i];
									// get min price associated with this origin-dest
									var minPrice = 0;
									for(var j=0;j<datesData.totalPrice.length;j++){
										if(memberOriginAirport==datesData.totalPrice[j].code){
											minPrice = datesData.totalPrice[j].price
										}
									}
									var panel = 
										{
					     					type: 'item',
					     					width: 'large',
					     					background_color: '#e0f7fc',
					     					border: true,
					     					elements: 
					     					[
					     						{
					     							type: 'image',
					     							image: 
					     							{
					     								url: cityImages[memberOriginAirport] || 'https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg'
					     							}

					     						},
					     						{
					     							type: 'spacing'
					     						},
					     						{
									                type: "icon_label",
									                label: {
									                    value: `flights from ${memberOriginAirport} to ${destination}`,
									                    color: "#000000",
									                    font_size: 18,
									                    font_weight: 'bold',
									                    max_lines: 2, // 2 by default and if not defined a max of 5 lines.
									                },
									                alignment: 'center'
					     						},
					     						{
									                type: "icon_label",
									                label: {
									                    value: `$${minPrice}`,
									                    color: "#000000",
									                    font_size: 18,
									                    font_weight: 'bold',
									                    max_lines: 2, // 2 by default and if not defined a max of 5 lines.
									                },
									                alignment: 'center'
					     						},
					     						{
					     							type: 'spacing'
					     						},
					     						{
					     							type: 'image',
					     							image: 
					     							{
					     								url: cityImages[destination] || 'https://www.seeusoon.io/assets/images/placepictures/default/UYEjt_720px.jpg'
					     							}
					     						},
					     						{
									                type: 'spacing',
									            },
									            {
									                type: 'button',
									                on_tap: `https://www.skyscanner.com/transport/flights/${memberOriginAirport}/${destination}/${datesData.outboundDate.yyyymmdd()}/${datesData.inboundDate.yyyymmdd()}`,
									                background_color: "#d6f0ff",
									                 
									                label: {
									                	value: "book now",
									                    color: "#000000",
									                    font_size: 18,
									                    font_weight: 'normal',
									                    max_lines: 2,
									                    alignment: 'center'
									                }
									            }
					     					]
					     				}
					     			panels.push(panel);
								}
								var data = {
						        	text: 
						        		`we found you the cheapest flights on these dates:\n\noutbound: ${datesData.outboundDate.toDateString()}\ninbound: ${datesData.inboundDate.toDateString()}`
						        	 ,
						          	display_unit: "fancy",
									payload: 
										{
							     			collection_items : panels
						     			}
					        	};
					        	resolve(data);
							}).catch(function(e){
								console.log(e);
								var data = {
									text: 'We could not find any trips to that destination',
									display_unit: 'default'
								}
								resolve(data);
							});
						});				
					});
		
		    });
	});
}

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('');
};

module.exports = fancyPanelGenerator;

var genieApi = require('genie.apiclient');
var config = require('./config');

//genie api config
genieApi.config(config);

//create payload
var payload = {
 
    name: {
        value: 'Lets Get Away Genie'
    },
    description: {
        value: 'We track global flight price trends to find the cheapest trips for your group and help you plan your next reunion!'
    },
    permissions: ['genie/global','group/read/messages'],
    availability: '*',
    subscriptions: '*',
    // will change based on localtunnel 
    configure_url: 'https://letsgetawaytoday.hopto.org/genie_profile',
    client: {
        images: [
        {
            name: 'avatar',
            url: 'https://letsgetawaytoday.hopto.org/avatar',
        },
        {
            name: 'avatar_chat',
            url: 'https://letsgetawaytoday.hopto.org/avatar',
        },
        {
            name: 'header_image',
            url: 'https://letsgetawaytoday.hopto.org/avatar',
        }
        ],
        profile: {
            type: 'profile',
            header: 'header_image',
            form: {
	            fields : [
		        	'airport'
	        	]
        	}
        },
        onboarding: [
    		{
			    type: 'form',
			    header: 'header_image',
			    title: {
                    value: 'airport configuration'
                },
			    description: {
                    value: 'please enter the 3 letter airport code nearest you'
                },
			    form: {
			        //reference to fields configured in payload
			        fields: ['airport'],
			 
			        //should this be sent anywhere?
			        destination_url: 'https://letsgetawaytoday.hopto.org/genie_profile',
			        //please return 200 for sucess or another status code
			        //with error details to be shown otherwise {error: 'text'}
			        },
                next_button: {      
                     value: 'save',
                } 
    		},
            {
                type: 'permission',
                permission: 'group/read/messages' 
            },
            {
                type: 'info',  
                header: 'header_image',
                title: {
                    value: 'Lets Get Away!',
                },
                description: {
                    value: 'The Lets Get Away Genie will help you and your friends plan your next vacation!  We track flight data to curate vacation destinations just for your group! So what are you waiting for?',
                },
                next_button: {      
                     value: 'thanks!',
                } 
            }
        ],
        fields : [
        	{
        		type: "text",
        		name: "airport",
        		label: {
                    value: "nearest airport code",
                    alignment: "justify"
                },
                validation: {
                    required: true,
                    min_length: 3,
                    max_length: 3,
                    regex: {
                        value: '/^[a-z]*$/i',
                        label: {
                            value: 'Only letters',
                        }
                    }
                }
        	}
        ]
    }
 
};

//register payload
console.log("registering genie");
genieApi.post('/genies/payloads', payload, function(e,r,b){
	if (e){
		console.error(e);
		process.exit(1);
	}
	if ([200,201].indexOf(r.statusCode) == -1){
		console.log(r);
		console.error('payload registration failed with http statusCode', r.statusCode);
		process.exit(1);
	}
	//payload registration was succesfull, let's activate this new payload id
	genieApi.put('/genies/payloads/' + b.id, null, function(e,r,b){
		if (e){
			console.error(e);
			process.exit(1);
		}
		console.log('payload activation http statusCode', r.statusCode, (b ? b : ''));
	});
});



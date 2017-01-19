var genieApi = require('genie.apiclient');

//genie api config
genieApi.config({accessKey: '79ecbb99-fd8f-4dc7-9cfb-825c1d79fb29', accessSecret: '9be5a4eba01d0de93b67f2821156141d91dcf5e55662068d91715e8c8aa2924e'});

//create payload
var payload = {
 
    name: {
        value: 'Lets Get Away Genie'
    },
    description: {
        value: 'A genie for helping you plan trips with your friends'
    },
    permissions: ['genie/global'],
    availability: '*',
    subscriptions: '*',
    // will change based on localtunnel 
    configure_url: 'https://letsgetawaytoday.hopto.org/genie_profile',
    client: {
        images: [
        {
            name: 'avatar',
            url: 'https://assets.wired.com/photos/w_1164/wp-content/uploads/2017/01/GettyImages-547934569.jpg',
        },
        {
            name: 'avatar_chat',
            url: 'https://assets.wired.com/photos/w_1164/wp-content/uploads/2017/01/GettyImages-547934569.jpg',
        },
        {
            name: 'header_image',
            url: 'https://assets.wired.com/photos/w_1164/wp-content/uploads/2017/01/GettyImages-547934569.jpg',
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
			 
			    title: 'airport',
			 
			    description: 'this is where you set your nearest airport',
			 
			    form: {
			        //reference to fields configured in payload
			        fields: ['airport'],
			 
			        //should this be sent anywhere?
			        destination_url: 'https://letsgetawaytoday.hopto.org/genie_profile',
			        //please return 200 for sucess or another status code
			        //with error details to be shown otherwise {error: 'text'}
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



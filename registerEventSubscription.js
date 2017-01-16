var genieApi = require('genie.apiclient');
genieApi.config({accessKey: '79ecbb99-fd8f-4dc7-9cfb-825c1d79fb29', accessSecret: '9be5a4eba01d0de93b67f2821156141d91dcf5e55662068d91715e8c8aa2924e'});
 
genieApi.post('/genies/event_subscription', {'url': 'https://genie.localtunnel.me/events'}, function(e,r,b){
    if (e){
        console.error(e);
        process.exit(1);
    }
    console.log('subscription request done, watch your logs', r.statusCode);
});
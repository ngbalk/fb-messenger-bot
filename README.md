# Group Travel Bot for FB Messenger Platform
Author: Nick Balkissoon
This bot allows users on the FB Messenger Platform to explore cheap group trip destinations, find the cheapest dates to travel, and book those flights.

### Technologies
 * Node.js
 * SQLite
 * Express
 * Skyscanner Flights API

### Build Instructions
Build the project from source
```sh
$ npm install
```

###  Deployment Instructions [TEST]
Map localhost:8080 to public facing IP address 'https://fbmflights.localtunnel.me/':
```sh
$ bash scripts/run-localtunnel.sh
``` 

Run bot
```sh
$ node endpoints.js
```

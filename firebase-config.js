// configure database
var firebase = require("firebase-admin");
firebase.initializeApp({
  credential: firebase.credential.cert("firebase-sdk-keys.json"),
  databaseURL: "https://flights-genie.firebaseio.com"
});
// Get a reference to the database service
var database = firebase.database();

module.exports = database;
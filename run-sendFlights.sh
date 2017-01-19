#!/bin/bash

# run the send flights information once every 24 hours

while true
do 
    node sendFlightsMessages.js
    sleep 180
    # sleep 86400
done

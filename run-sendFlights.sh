#!/bin/bash

# run the send flights information once every 24 hours

while true
do 
    timeout --signal=SIGINT 40 /Users/jreshef/Documents/GitHub/flights-genie/run.sh
    sleep 180
    # sleep 86400
done

#!/bin/bash

# run the send flights information once every 24 hours


echo 'starting script'
while true
do 
    echo 'calling run send flights script'
    timeout --signal=SIGINT 40 sh /opt/genie/flights-genie/scripts/runFlights.sh
    echo 'send flights ran sleeping until vote results gets sent out'
    sleep 86400
    # sleep 86400 -- 24 hours
done

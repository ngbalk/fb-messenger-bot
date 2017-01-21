#!/bin/bash

# run the send flights information once every 24 hours


echo 'starting script'
while true
do 
    echo 'calling run script'
    timeout --signal=SIGINT 40 sh /opt/genie/flights-genie/run.sh
    echo 'script ran sleeping now'
    sleep 28000
    # sleep 86400 -- 24 hours
done

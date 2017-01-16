#!/bin/bash

#Used to expose port publically for local development.  Not to be used in production

function localtunnel {
lt -s genie --port 8080
}

until localtunnel; do
echo "localtunnel server crashed"
sleep 2
done

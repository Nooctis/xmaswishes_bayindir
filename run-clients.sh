#!/bin/bash
for i in {1..5}
do
    node client.js &
done
wait

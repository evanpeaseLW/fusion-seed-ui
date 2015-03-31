#!/bin/sh

echo create jobs to aggregate the click counts
curl -u admin:password123 -X POST -H 'Content-Type: application/json' -d '{"id":"clickAggr", "signalTypes":["click"], "sourceCatchup": true}' http://localhost:8764/api/apollo/aggregator/aggregations
curl -u admin:password123 -X POST -H 'Content-Type: application/json' -d '{"id":"cartAggr", "aggregator": "click", "signalTypes":["addToCart"], "sourceCatchup": true}' http://localhost:8764/api/apollo/aggregator/aggregations

echo see if it is there
curl -u admin:password123 -X GET -H 'Content-Type: application/json' http://localhost:8764/api/apollo/aggregator/aggregations/cartAggr

echo now run the job
curl -u admin:password123 -X POST -H 'Content-Type: application/json' http://localhost:8764/api/apollo/aggregator/jobs/products1_signals/cartAggr
curl -u admin:password123 -X POST -H 'Content-Type: application/json' http://localhost:8764/api/apollo/aggregator/jobs/products1_signals/clickAggr



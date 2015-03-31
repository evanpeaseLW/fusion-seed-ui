#!/bin/sh


echo clear signals

curl http://localhost:8983/solr/products1_signals/update?stream.body=%3Cdelete%3E%3Cquery%3E*:*%3C/query%3E%3C/delete%3E

curl http://localhost:8983/solr/products1_signals/update?stream.body=%3Ccommit/%3E

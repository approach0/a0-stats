#!/bin/sh
range="2011-06-14.2029-12-15"

## Insertions
curl -v -H "Content-Type: application/json" -d @"test-1.json" "http://localhost:3207/push/query"
curl -v -H "Content-Type: application/json" -d @"test-2.json" "http://localhost:3207/push/query"
curl -v -H "Content-Type: application/json" -d @"test-3.json" "http://localhost:3207/push/query"

## Query summary and trend
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-summary/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-trend/$range"

## Query IPs
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-IPs/30/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-IPs/from-129.21.34.106/30/$range"

## Query items
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-items/30/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-items/from-49.36.173.90/30/$range"

#!/bin/sh
range="2011-06-14.2029-12-15"
p="test/"

## click through data
curl -v -H "Content-Type: application/json" -d @"${p}test-4.json" "http://localhost:3207/push/clicks"

## query logs data
curl -v -H "Content-Type: application/json" -d @"${p}test-1.json" "http://localhost:3207/push/query"
curl -v -H "Content-Type: application/json" -d @"${p}test-2.json" "http://localhost:3207/push/query"
curl -v -H "Content-Type: application/json" -d @"${p}test-3.json" "http://localhost:3207/push/query"

## query
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-summary/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-trend/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-IPs/30/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-IPs/from-129.21.34.106/30/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-items/30/$range"
curl -v -H "Content-Type: application/json" "http://localhost:3207/pull/query-items/from-49.36.173.90/30/$range"

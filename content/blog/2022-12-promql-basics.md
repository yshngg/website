+++
title = "PromQL Basics"
date = 2022-12-05
description = "Getting started with Prometheus query language"
+++

PromQL is the query language for Prometheus. It lets you select and aggregate time series data in real time.

## Instant Vectors vs Range Vectors

An instant vector represents the latest sample for each time series. A range vector represents samples over a time window.

```promql
# Instant vector
http_requests_total

# Range vector (last 5 minutes)
http_requests_total[5m]
```

+++
title = "Docker Multi-Stage Builds"
date = 2023-04-18
description = "Optimizing Docker images with multi-stage builds"

[taxonomies]
tags = ["Containers"]
+++

Multi-stage builds let you use multiple FROM statements in your Dockerfile, copying artifacts from one stage to another.

```dockerfile
FROM golang:1.22 AS builder
WORKDIR /app
COPY . .
RUN go build -o server

FROM alpine:3.19
COPY --from=builder /app/server /server
CMD ["/server"]
```

The resulting image is under 10MB compared to 900MB+ for the builder stage.

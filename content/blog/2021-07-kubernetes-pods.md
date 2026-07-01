+++
title = "Kubernetes Pod Lifecycle"
date = 2021-07-22
description = "Understanding pod phases, conditions, and container states"
+++

Kubernetes pods go through several phases during their lifecycle: Pending, Running, Succeeded, Failed, and Unknown.

## Container States

Each container within a pod has its own state: Waiting, Running, or Terminated. Probes (liveness, readiness, startup) determine when a container is healthy.

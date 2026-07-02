+++
title = "Linux Cgroups v2"
date = 2024-06-30
description = "How Linux control groups manage container resources"

[taxonomies]
tags = ["Systems", "Containers"]
+++

Cgroups v2 provides a unified hierarchy for resource management. Key controllers:

- `cpu` — CPU bandwidth and weight
- `memory` — Memory limits and pressure
- `io` — I/O throttling and weight
- `pids` — Process count limits

```bash
echo "1000000" > /sys/fs/cgroup/mygroup/memory.max
```

+++
title = "Understanding Go Slices"
date = 2020-03-15
description = "A deep dive into Go slice internals, capacity, and performance"

[taxonomies]
tags = ["Go"]
+++

Go slices are a powerful abstraction over arrays. They provide a flexible, dynamic view into array elements.

## Slice Header

A slice is represented by a three-field struct: pointer to the underlying array, length, and capacity.

```go
s := make([]int, 3, 5)
// len=3, cap=5
```

Appending beyond capacity triggers a new allocation with doubled capacity.

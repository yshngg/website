+++
title = "Rust Ownership Basics"
date = 2024-01-10
description = "Understanding Rust's ownership model for safe memory management"
+++

Rust's ownership system guarantees memory safety without a garbage collector. Three rules:

1. Each value has an owner
2. Only one owner at a time
3. When the owner goes out of scope, the value is dropped

```rust
let s1 = String::from("hello");
let s2 = s1; // s1 is moved, no longer valid
```

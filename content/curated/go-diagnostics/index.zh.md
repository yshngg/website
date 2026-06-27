+++
title = "Go 诊断"
weight = 15
description = "Go 程序性能分析、追踪、调试和运行时诊断指南"

[extra]
author = "The Go Team"
original_url = "https://go.dev/doc/diagnostics"

[taxonomies]
category = ["Go"]
+++

# 诊断

## 简介

Go 生态系统提供了大量的 API 和工具，用于诊断 Go 程序中的逻辑和性能问题。本文总结了可用的工具，帮助 Go 用户为其特定问题选择合适的工具。

诊断解决方案可分为以下几类：

* **性能分析（Profiling）**：性能分析工具分析 Go 程序的复杂度和开销，例如内存使用情况和频繁调用的函数，以识别 Go 程序中的性能瓶颈。
* **追踪（Tracing）**：追踪是一种检测代码的方法，用于分析调用或用户请求整个生命周期中的延迟。追踪提供了系统中每个组件对整体延迟贡献了多少的概览。追踪可以跨越多个 Go 进程。
* **调试（Debugging）**：调试允许我们暂停 Go 程序并检查其执行状态。通过调试可以验证程序的状态和流程。
* **运行时统计信息和事件**：收集和分析运行时统计信息和事件，可以高层次地了解 Go 程序的健康状况。指标的峰值或低谷有助于我们发现吞吐量、利用率和性能的变化。

注意：某些诊断工具可能会相互干扰。例如，精确的内存分析会影响 CPU 分析结果，goroutine 阻塞分析会影响调度器追踪。请单独使用工具以获取更精确的信息。

## 性能分析

性能分析有助于识别开销大或频繁调用的代码段。Go 运行时提供符合 [pprof 可视化工具](https://github.com/google/pprof/blob/master/doc/README.md) 所期望格式的[性能分析数据](https://pkg.go.dev/runtime/pprof/)。性能分析数据可以在测试期间通过 `go test` 收集，也可以通过 [net/http/pprof](https://pkg.go.dev/net/http/pprof/) 包提供的端点收集。用户需要收集性能分析数据，并使用 pprof 工具筛选和可视化热点代码路径。

[runtime/pprof](https://pkg.go.dev/runtime/pprof) 包提供的预定义分析类型：

* **cpu**：CPU 分析确定程序在主动消耗 CPU 周期时（而非睡眠或等待 I/O 时）的时间分配情况。
* **heap**：堆分析报告内存分配样本；用于监控当前和历史内存使用情况，以及检查内存泄漏。
* **threadcreate**：线程创建分析报告导致创建新 OS 线程的程序段。
* **goroutine**：Goroutine 分析报告所有当前 goroutine 的堆栈跟踪。
* **block**：阻塞分析显示 goroutine 在等待同步原语（包括定时器通道）时阻塞的位置。阻塞分析默认未启用；使用 `runtime.SetBlockProfileRate` 启用。
* **mutex**：互斥锁分析报告锁竞争情况。当您认为由于互斥锁竞争导致 CPU 未充分利用时，请使用此分析。互斥锁分析默认未启用，请参阅 `runtime.SetMutexProfileFraction` 以启用。

### 还可以使用哪些其他分析器来分析 Go 程序？

在 Linux 上，可以使用 [perf 工具](https://perf.wiki.kernel.org/index.php/Tutorial) 来分析 Go 程序。Perf 可以分析和展开 cgo/SWIG 代码以及内核代码，因此有助于深入了解原生/内核性能瓶颈。在 macOS 上，可以使用 [Instruments](https://developer.apple.com/library/content/documentation/DeveloperTools/Conceptual/InstrumentsUserGuide/) 工具集来分析 Go 程序。

### 能否对生产服务进行性能分析？

可以。在生产环境中对程序进行性能分析是安全的，但启用某些分析（例如 CPU 分析）会带来额外开销。您应该会看到性能下降。性能损失可以通过在生产环境中启用之前测量分析器的开销来估算。

您可能需要定期对生产服务进行性能分析。特别是在具有多个相同进程副本的系统中，定期随机选取一个副本是安全的做法。选择一个生产进程，每 Y 秒分析 X 秒，保存结果用于可视化和分析；然后定期重复。结果可以手动和/或自动检查以发现问题。收集不同类型的分析数据会相互干扰，因此建议一次只收集一种分析数据。

### 可视化分析数据的最佳方式是什么？

Go 工具通过 [`go tool pprof`](https://github.com/google/pprof/blob/master/doc/README.md) 提供文本、图形和 [callgrind](http://valgrind.org/docs/manual/cl-manual.html) 格式的性能分析数据可视化。阅读 [分析 Go 程序](https://go.dev/blog/profiling-go-programs) 查看实际效果。

![pprof 文本](pprof-text.png)

以文本形式列出最昂贵的调用。

![pprof 图形](pprof-dot.png)

以图形方式可视化最昂贵的调用。

Weblist 视图在 HTML 页面中逐行显示源代码中开销较大的部分。在以下示例中，`runtime.concatstrings` 花费了 530ms，每行的开销都列在列表中。

![pprof weblist](pprof-weblist.png)

以 weblist 形式可视化最昂贵的调用。

另一种可视化分析数据的方式是[火焰图](http://www.brendangregg.com/flamegraphs.html)。火焰图允许您在特定的调用祖先路径中移动，从而可以放大/缩小特定的代码段。[上游 pprof](https://github.com/google/pprof) 已支持火焰图。

![火焰图](flame.png)

火焰图可以直观地发现最昂贵的代码路径。

### 我只能使用内置的分析类型吗？

除了运行时提供的分析类型外，Go 用户还可以通过 [pprof.Profile](https://pkg.go.dev/runtime/pprof/#Profile) 创建自定义分析类型，并使用现有工具进行检查。

### 能否在不同的路径和端口上提供分析器处理程序（/debug/pprof/...）？

可以。`net/http/pprof` 包默认将其处理程序注册到默认的 mux 上，但您也可以使用该包导出的处理程序自行注册。

例如，以下示例将在 :7777 端口的 /custom_debug_path/profile 路径上提供 pprof.Profile 处理程序：

```go
package main

import (
	"log"
	"net/http"
	"net/http/pprof"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/custom_debug_path/profile", pprof.Profile)
	log.Fatal(http.ListenAndServe(":7777", mux))
}
```

## 追踪

追踪是一种检测代码的方法，用于分析一系列调用整个生命周期中的延迟。Go 提供了 [golang.org/x/net/trace](https://godoc.org/golang.org/x/net/trace) 包，作为每个 Go 节点的最小化追踪后端，并提供了一个带有简单仪表盘的最小化检测库。Go 还提供了一个执行追踪器，用于追踪一段时间内的运行时事件。

追踪使我们能够：

* 检测并分析 Go 进程中的应用程序延迟。
* 衡量长调用链中特定调用的开销。
* 发现利用率和性能改进的机会。没有追踪数据，瓶颈往往并不明显。

在单体系统中，从程序的构建块中收集诊断数据相对容易。所有模块都位于一个进程内，共享相同的资源来报告日志、错误和其他诊断信息。一旦系统增长到超越单个进程并开始变得分布式，从前端 Web 服务器到所有后端，再到将响应返回给用户，跟踪一次调用就变得困难了。这就是分布式追踪在检测和分析生产系统中发挥重要作用的地方。

分布式追踪是一种检测代码的方法，用于分析用户请求整个生命周期中的延迟。当系统是分布式的，且传统的性能分析和调试工具无法扩展时，您可能需要使用分布式追踪工具来分析用户请求和 RPC 的性能。

分布式追踪使我们能够：

* 在大型系统中检测和分析应用程序延迟。
* 跟踪用户请求生命周期内的所有 RPC，并发现仅在生产环境中才可见的集成问题。
* 发现可以应用于系统的性能改进。在收集追踪数据之前，许多瓶颈并不明显。

Go 生态系统提供了各种针对特定追踪系统的分布式追踪库以及后端无关的库。

### 有没有办法自动拦截每个函数调用并创建追踪？

Go 不提供自动拦截每个函数调用并创建追踪跨度（span）的方法。您需要手动检测代码以创建、结束和注释跨度。

### 如何在 Go 库中传播追踪头？

您可以在 [`context.Context`](https://pkg.go.dev/context#Context) 中传播追踪标识符和标签。目前业界还没有标准的追踪键或通用的追踪头表示方式。每个追踪提供者负责在其 Go 库中提供传播工具。

### 标准库或运行时中还有哪些低级事件可以包含在追踪中？

标准库和运行时正在尝试提供一些额外的 API 来通知低级内部事件。例如，[`httptrace.ClientTrace`](https://pkg.go.dev/net/http/httptrace#ClientTrace) 提供了跟踪传出请求生命周期中低级事件的 API。目前正在努力从运行时执行追踪器中检索低级运行时事件，并允许用户定义和记录他们自己的用户事件。

## 调试

调试是识别程序为何行为异常的过程。调试器使我们能够理解程序的执行流程和当前状态。有几种调试方式；本节仅关注将调试器附加到程序以及核心转储调试。

Go 用户主要使用以下调试器：

* [Delve](https://github.com/go-delve/delve)：Delve 是 Go 编程语言的调试器。它支持 Go 的运行时概念和内建类型。Delve 致力于成为 Go 程序功能完备且可靠的调试器。
* [GDB](https://go.dev/doc/gdb)：Go 通过标准 Go 编译器和 Gccgo 提供 GDB 支持。Go 的堆栈管理、线程和运行时在某些方面与 GDB 所期望的执行模型存在较大差异，即使程序是使用 gccgo 编译的，也可能导致调试器混淆。尽管 GDB 可以用来调试 Go 程序，但它并不理想，可能会造成混淆。

### 调试器对 Go 程序的支持如何？

`gc` 编译器会执行函数内联和变量寄存器化等优化。这些优化有时会增加调试器调试的难度。目前正在努力改进为优化后的二进制文件生成的 DWARF 信息的质量。在这些改进可用之前，我们建议在构建待调试的代码时禁用优化。以下命令在禁用了编译器优化的情况下构建包：

```console
$ go build -gcflags=all="-N -l"
```

作为改进工作的一部分，Go 1.10 引入了一个新的编译器标志 `-dwarflocationlists`。该标志导致编译器添加位置列表，帮助调试器处理优化后的二进制文件。以下命令在启用优化但包含 DWARF 位置列表的情况下构建包：

```console
$ go build -gcflags="-dwarflocationlists=true"
```

### 推荐的调试器用户界面是什么？

尽管 Delve 和 GDB 都提供了命令行界面，但大多数编辑器集成和 IDE 都提供了专门的调试用户界面。

### 是否可以对 Go 程序进行事后调试？

核心转储文件是包含运行中进程的内存转储及其进程状态的文件。它主要用于程序的事后调试，以及在程序仍在运行时了解其状态。这两种情况使核心转储调试成为事后分析和诊断生产服务的良好辅助手段。可以从 Go 程序中获取核心文件，并使用 Delve 或 GDB 进行调试，请参阅[核心转储调试](https://go.dev/wiki/CoreDumpDebugging)页面获取分步指南。

## 运行时统计信息和事件

运行时提供统计信息和内部事件的报告，供用户诊断运行时级别的性能和利用率问题。

用户可以监控这些统计信息，以更好地了解 Go 程序的整体健康状况和性能。一些经常被监控的统计信息和状态：

* [`runtime.ReadMemStats`](https://pkg.go.dev/runtime/#ReadMemStats) 报告与堆分配和垃圾回收相关的指标。内存统计信息有助于监控进程消耗了多少内存资源、进程是否能很好地利用内存，以及发现内存泄漏。
* [`debug.ReadGCStats`](https://pkg.go.dev/runtime/debug/#ReadGCStats) 读取关于垃圾回收的统计信息。它有助于了解有多少资源花费在 GC 暂停上。它还报告垃圾回收器暂停的时间线和暂停时间百分位数。
* [`debug.Stack`](https://pkg.go.dev/runtime/debug/#Stack) 返回当前堆栈跟踪。堆栈跟踪有助于查看当前有多少 goroutine 正在运行、它们在做什么，以及它们是否被阻塞。
* [`debug.WriteHeapDump`](https://pkg.go.dev/runtime/debug/#WriteHeapDump) 暂停所有 goroutine 的执行，允许将堆转储到文件中。堆转储是 Go 进程在给定时间点的内存快照。它包含所有已分配的对象以及 goroutine、终结器等。
* [`runtime.NumGoroutine`](https://pkg.go.dev/runtime#NumGoroutine) 返回当前 goroutine 的数量。可以监控该值以查看是否利用了足够多的 goroutine，或检测 goroutine 泄漏。

### 执行追踪器

Go 带有一个运行时执行追踪器，用于捕获各种运行时事件。调度、系统调用、垃圾回收、堆大小以及其他事件由运行时收集，并可通过 `go tool trace` 进行可视化。执行追踪器是一种检测延迟和利用率问题的工具。您可以检查 CPU 的利用情况，以及网络或系统调用何时导致 goroutine 被抢占。

执行追踪器有助于：

* 了解 goroutine 的执行方式。
* 了解一些核心运行时事件，例如 GC 运行。
* 识别并行化不良的执行情况。

然而，它并不擅长识别热点，例如分析内存或 CPU 使用过度的原因。应首先使用性能分析工具来解决这些问题。

![执行追踪器](tracer-lock.png)

上图中，`go tool trace` 的可视化显示执行开始时正常，然后变得串行化。这表明可能存在共享资源的锁竞争，从而造成了瓶颈。

请参阅 [`go tool trace`](https://go.dev/cmd/trace/) 收集和分析运行时追踪。

### GODEBUG

如果设置了 [GODEBUG](https://pkg.go.dev/runtime/#hdr-Environment_Variables) 环境变量，运行时也会发出事件和信息。

* GODEBUG=gctrace=1 在每次垃圾回收时打印垃圾回收器事件，汇总收集的内存量以及暂停时间长度。
* GODEBUG=inittrace=1 打印已完成的包初始化工作的执行时间和内存分配信息摘要。
* GODEBUG=schedtrace=X 每 X 毫秒打印调度事件。

GODEBUG 环境变量可用于禁用标准库和运行时中指令集扩展的使用。

* GODEBUG=cpu.all=off 禁用所有可选的指令集扩展。
* GODEBUG=cpu.*extension*=off 禁用指定指令集扩展的指令使用。*extension* 是指令集扩展的小写名称，例如 *sse41* 或 *avx*。

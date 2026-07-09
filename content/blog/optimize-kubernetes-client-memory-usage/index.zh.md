+++
title = "如何优化大规模集群中 Kubernetes 客户端的内存使用？"
date = 2026-07-08
description = ""

[taxonomies]
tags = ["Kubernetes"]
+++

> 这里的大规模并不单指集群节点数量多，而是资源的数量多，比如 Job 或 ServiceMonitor 的数量。

## 背景

在扩展 Kubernetes 集群功能时，有时我们需要用客户端库 [k8s.io/client-go](https://pkg.go.dev/k8s.io/client-go) 编码客户端与 Kubernetes API server 通信，List/Watch 资源，并做一些事情。比如 [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)，List/Watch Pod/Deployment/Job/Daemonset/Job 等资源，基于资源信息生成 Prometheus 指标，再透出供 Prometheus 应用程序抓取。再比如 [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator) List/Watch ServiceMonitor/PodMonitor 等资源更新 [Prometheus 配置文件](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file) 以采集指标。

客户端库 [k8s.io/client-go](https://pkg.go.dev/k8s.io/client-go) 使用 [SharedIndexInformer](https://pkg.go.dev/k8s.io/client-go@v0.36.0/tools/cache#SharedIndexInformer) 缓存 Kubernetes 集群中资源到内存中以减少对 Kubernetes API server 的请求数量，从而减轻 Kubernetes API server 的 CPU/内存压力。问题在于 [SharedIndexInformer](https://pkg.go.dev/k8s.io/client-go@v0.36.0/tools/cache#SharedIndexInformer) 会先 List 所有的资源，比如所有的 Job 或 所有的 ServiceMonitor。如果集群中有大量资源，就算 Kubernetes API server 及时响应了客户端（如果请求的数据量很大， Kubernetes API server 响应速度很慢，有可能会超时），全部缓存到内存中，也会导致客户端内存用量暴涨，若客户端工作负载的资源 limit 配置不当或所在节点资源不足，有发生 OOM[^1] 的风险。

## 如何做

作为客户端开发者，我们应该优化代码，降低内存使用，保障服务稳定运行。阅读了一些 Kubernetes 组件源码后我总结了下面这几种手段。

### 1. WithTransform

> 通过 [WithTransform](https://pkg.go.dev/k8s.io/client-go@v0.36.0/informers#WithTransform) 裁剪对象，删除对象中用不上的字段，比如 ManagedFields。

```go
func WithTransform(transform cache.TransformFunc) SharedInformerOption
```

WithTransform 将一个 TransformFunc 配置在图中的 Delta Fifo 队列中，当 Refactor List/Watch 对象 新增/更新/删除时，在添加到 Delta Fifo 队列之前先进行裁剪，不在内存中缓存无用的信息。

![](client-go-controller-interaction.jpeg)

图片来源：<https://github.com/kubernetes/sample-controller/blob/v0.36.0/docs/images/client-go-controller-interaction.jpeg>

例如：kube-controller-manager 中通过 [WithTransform](https://pkg.go.dev/k8s.io/client-go@v0.36.0/informers#WithTransform) 裁剪 Kubernetes API server 返回的对象中的 ManagedFields 字段[^2]。

```go
// Informer transform to trim ManagedFields for memory efficiency.
trim := func(obj interface{}) (interface{}, error) {
	if accessor, err := meta.Accessor(obj); err == nil {
		if accessor.GetManagedFields() != nil {
			accessor.SetManagedFields(nil)
		}
	}
	return obj, nil
}
sharedInformers := informers.NewSharedInformerFactoryWithOptions(client, ResyncPeriod(s)(), informers.WithTransform(trim))
```

kube-controller-manager 中的裁剪 .metadata.managedFields 的具体实现：<https://github.com/kubernetes/kubernetes/pull/118455>

### 2. 设置 ListOptions.ResourceVersion 为 "0"

在不需要强一致性时，将 ResourceVersion 设置为 "0"，从 Kubernetes API server 的 Watch 缓存中获取数据，可以提升性能和减轻 etcd 负载。缺点是缓存过期。

从 Kubernetes 1.36 开始，如果 ResourceVersion 不设置或设置为 ""，也是从 Kubernetes API server 的 Watch 缓存中获取数据，但保证了一致性。

例如：kube-state-metrics 中在使用 Kubernetes API server 缓存时，将 options.ResourceVersion 赋值为 "0"[^3]。

```go
if i.useAPIServerCache {
		options.ResourceVersion = "0"
}
```

具体实现：<https://github.com/kubernetes/kube-state-metrics/pull/1548>

关于 ResourceVersion 的更多信息请参考：[Resource versions](https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions)。

### 3. WatchListCompression[^4] 特性门控

为 WatchList 请求开启 gzip 压缩。在 Kubernetes 1.37+ 中默认启用。

### 4. WatchListClient 特性门控[^5]

通过客户端启用 WatchListClient，流式获取 List 调用的响应，而不是按块获取。Kubernetes v1.32 和 Kubernetes v1.34+ 中默认启用[^6]。

```go
genericfeatures.WatchList: {
	{Version: version.MustParse("1.27"), Default: false, PreRelease: featuregate.Alpha},
	{Version: version.MustParse("1.32"), Default: true, PreRelease: featuregate.Beta},
	// switch this back to false because the json and proto streaming encoders appear to work better.
	{Version: version.MustParse("1.33"), Default: false, PreRelease: featuregate.Beta},
	{Version: version.MustParse("1.34"), Default: true, PreRelease: featuregate.Beta},
},
```

kube-apiserver 和 kube-controller-manager 中的具体实现：<https://github.com/kubernetes/kubernetes/pull/132704>

### 5. List 调用指定 ListOptions.Limit

可以通过 Limit 配置 List 调用返回响应的最大数量。但如果客户端启用了 WatchListClient 特性门控，[k8s.io/client-go](https://pkg.go.dev/k8s.io/client-go) 中的 [Reflector](https://pkg.go.dev/k8s.io/client-go@v0.36.0/tools/cache#Reflector) 只会进行 Watch 调用。

kube-state-metrics 中的具体实现：<https://github.com/kubernetes/kube-state-metrics/pull/2626>

### 6. 设置内存软限制[^7]

从 go 语言的角度，可以设置程序的内存软限制（Soft Limit），调整 gc 回收内存频率，从而释放内存资源。

三种方式：

- 设置环境变量 `GOMEMLIMIT`
- 通过 [runtime/debug.SetMemoryLimit](https://pkg.go.dev/runtime/debug#SetMemoryLimit) 在运行时设置
- 使用 `github.com/KimMachineGun/automemlimit` 包根据 cgroup 内存限制自动设置 `GOMEMLIMIT`

kube-state-metrics 中自动检测内存限制的具体实现：<https://github.com/kubernetes/kube-state-metrics/pull/2447>

## 社区动作

> Kubernetes 社区一直在进行相关的优化，包括通过从缓存中一致性读提升集群性能，流式 List 响应，服务端分片 List/Watch 等。

相关博客阅读：

- [Kubernetes v1.31: Accelerating Cluster Performance with Consistent Reads from Cache](https://kubernetes.io/blog/2026/05/06/kubernetes-v1-36-server-side-sharded-list-and-watch/)
- [Kubernetes v1.33: Streaming List responses](https://kubernetes.io/blog/2025/05/09/kubernetes-v1-33-streaming-list-responses/)
- [Kubernetes v1.36: Server-Side Sharded List and Watch](https://kubernetes.io/blog/2026/05/06/kubernetes-v1-36-server-side-sharded-list-and-watch/)

## 总结

现在有很多手段来优化 Kubernetes 客户端的内存用量，包括配置 ListOptions 字段和特性门控等。Kubernetes 社区也在持续不断地优化 [SharedIndexInformer](https://pkg.go.dev/k8s.io/client-go@v0.36.0/tools/cache#SharedIndexInformer) 和 List/Watch 调用。

## 参考

[^1]: <https://en.wikipedia.org/wiki/Out_of_memory>

[^2]: <https://github.com/kubernetes/kubernetes/blob/ecf6decece6a6de25a57aad9ba90b6ce580f6f78/cmd/kube-controller-manager/app/controllermanager.go#L531-L551>

[^3]: <https://github.com/kubernetes/kube-state-metrics/blob/v2.19.0/pkg/watch/watch.go#L114-L116>

[^4]: <https://github.com/kubernetes/kubernetes/pull/139308>

[^5]: <https://github.com/kubernetes/enhancements/tree/master/keps/sig-api-machinery/3157-watch-list>

[^6]: <https://github.com/kubernetes/kubernetes/blob/ecf6decece6a6de25a57aad9ba90b6ce580f6f78/pkg/features/kube_features.go#L2353-L2359>

[^7]: <https://go.dev/doc/gc-guide#Memory_limit>

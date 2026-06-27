+++
title = "runc 文档"
weight = 33

[taxonomies]
category = ["Containers"]
+++

## 规范遵从（Spec conformance）

本 runc 分支对 `linux` 平台**实现了** [OCI Runtime Spec v1.3.0](https://github.com/opencontainers/runtime-spec/tree/v1.3.0)。

以下特性尚未实现：

| 规范版本 | 特性                                     | PR                                                        |
| -------- | ---------------------------------------- | --------------------------------------------------------- |
| v1.1.0   | `SECCOMP_FILTER_FLAG_WAIT_KILLABLE_RECV` | [#3862](https://github.com/opencontainers/runc/pull/3862) |
| v1.3.0   | 对 `linux.intelRdt` 的解释进行澄清       | [#3832](https://github.com/opencontainers/runc/pull/3832) |
| v1.3.0   | 在 poststart hook 失败时使运行失败       | [#4348](https://github.com/opencontainers/runc/pull/4348) |

## 架构

支持以下架构：

| runc 二进制 | seccomp                                              |
| ----------- | ---------------------------------------------------- |
| `amd64`     | `SCMP_ARCH_X86`, `SCMP_ARCH_X86_64`, `SCMP_ARCH_X32` |
| `arm64`     | `SCMP_ARCH_ARM`, `SCMP_ARCH_AARCH64`                 |
| `armel`     | `SCMP_ARCH_ARM`                                      |
| `armhf`     | `SCMP_ARCH_ARM`                                      |
| `ppc64le`   | `SCMP_ARCH_PPC64LE`                                  |
| `riscv64`   | `SCMP_ARCH_RISCV64`                                  |
| `s390x`     | `SCMP_ARCH_S390`, `SCMP_ARCH_S390X`                  |
| `loong64`   | `SCMP_ARCH_LOONGARCH64`                              |

runc 二进制也可能可编译为 i386、大端序的 PPC64 以及若干 MIPS 变体，但这些架构**并非官方支持**。

## cgroup v2

自 **v1.0.0-rc93** 起，`runc` 已完全支持 **cgroup v2（统一模式）**。

要使用 cgroup v2，可能需要修改宿主机的 init 系统配置。以下发行版已知默认使用 cgroup v2：

<!-- the list should be kept in sync with https://github.com/rootless-containers/rootlesscontaine.rs/blob/master/content/getting-started/common/cgroup2.md -->

- Fedora（自 31 起）
- Arch Linux（自 2021 年 4 月起）
- openSUSE Tumbleweed（自大约 2021 年起）
- Debian GNU/Linux（自 11 起）
- Ubuntu（自 21.10 起）
- RHEL 及 RHEL 类发行版（自 9 起）

在其他基于 systemd 的发行版上，可以通过在内核命令行添加 `systemd.unified_cgroup_hierarchy=1` 来启用 cgroup v2。

### 我在使用 cgroup v2 吗？

如果存在 `/sys/fs/cgroup/cgroup.controllers` 则表示是。

### 主机要求

#### 内核（Kernel）

- 推荐版本：5.2 或更高
- 最低版本：4.15

不建议使用早于 5.2 的内核，因为缺少 freezer（冻结）功能。

特别地，**严禁** 使用早于 4.15 的内核（除非你在使用带用户命名空间的容器），因为这些内核不支持对设备权限的控制。

#### systemd

在 cgroup v2 主机上，**强烈建议** 使用 systemd cgroup 驱动运行 `runc`（`runc --systemd-cgroup`），但这不是强制性的。

推荐的 systemd 版本是 244 或更高；较旧的 systemd 不支持将 `cpuset` 控制器委派出去。

确保已安装 `dbus-user-session`（Debian/Ubuntu）或 `dbus-daemon`（CentOS/Fedora）包，并且 `dbus` 正在运行。在 Debian 系发行版上可以按如下操作：

```bash
sudo apt install -y dbus-user-session
systemctl --user start dbus
```

### Rootless

在 cgroup v2 主机上，rootless 模式下的 `runc` 可以与 systemd 通信以获取要被委派的 cgroup 权限。

```bash
runc spec --rootless
jq '.linux.cgroupsPath="user.slice:runc:foo"' config.json | sponge config.json
runc --systemd-cgroup run foo
```

容器进程会在类似如下的 cgroup 中运行：
`/user.slice/user-$(id -u).slice/user@$(id -u).service/user.slice/runc-foo.scope`。

#### 配置委派

通常，默认情况下只会将 `memory` 和 `pids` 控制器委派给非 root 用户。

```console
$ cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
memory pids
```

要允许委派其他控制器，需要按如下修改 systemd 配置：

```bash
sudo mkdir -p /etc/systemd/system/user@.service.d
cat <<EOF | sudo tee /etc/systemd/system/user@.service.d/delegate.conf
[Service]
Delegate=cpu cpuset io memory pids
EOF
sudo systemctl daemon-reload
```

## 检查点与恢复（Checkpoint and Restore）

关于使用 `runc` 对容器进行**检查点（checkpoint）与恢复（restore）**的基本说明，请参阅以下手册页：
[runc-checkpoint(8)](../man/runc-checkpoint.8.md) 和 [runc-restore(8)](../man/runc-restore.8.md)。

---

### 检查点/恢复的注解（Annotations）

除了在命令行中指定选项（如上述手册页中描述的那样），还可以通过 **CRIU 的配置文件** 来影响 CRIU 的行为。
关于 CRIU 配置文件支持的详细信息，请参阅 [CRIU 官方 Wiki](https://criu.org/Configuration_files)。

除了 CRIU 默认的配置文件之外，`runc` 还会指示 CRIU 额外加载 `/etc/criu/runc.conf` 文件。
不过，可以通过注解 `org.criu.config` 来更改这个额外的 CRIU 配置文件路径。

---

#### 禁用额外 CRIU 配置文件

如果将注解 `org.criu.config` 设置为空字符串，`runc` 将不会向 CRIU 传递任何额外的配置文件。
也就是说，通过设置为空字符串，可以禁用额外的 CRIU 配置文件。
这种方式可以确保不会因为额外配置文件而意外改变 CRIU 的行为。

**示例：禁用额外的 CRIU 配置文件**

```json
{
	"ociVersion": "1.0.0",
	"annotations": {
		"org.criu.config": ""
	},
	"process": {
```

---

#### 指定自定义 CRIU 配置文件

如果将注解 `org.criu.config` 设置为一个非空字符串，`runc` 将把该字符串传递给 CRIU，并作为额外的配置文件进行加载。
如果 CRIU 无法打开该配置文件，它会忽略该文件并继续执行。

**示例：指定特定的 CRIU 配置文件**

```json
{
	"ociVersion": "1.0.0",
	"annotations": {
		"org.criu.config": "/etc/special-runc-criu-options"
	},
	"process": {
```

## systemd cgroup 驱动

默认情况下，`runc` 自行创建 cgroup 并设置 cgroup 限制（此模式称为 **fs cgroup 驱动**）。当传入全局选项 `--systemd-cgroup`（例如 `runc --systemd-cgroup run ...`）时，`runc` 切换为 **systemd cgroup 驱动**。本文档描述该驱动的特性与一些注意事项。

### systemd 单元名称与放置位置

创建容器时，`runc` 会通过 dbus 向 systemd 请求为该容器创建一个临时单元（transient unit），并将其放入指定的 `slice` 中。

单元名和所属 slice 的生成方式根据容器运行时规范如下决定：

1. 如果设置了 `Linux.CgroupsPath`，其格式应为 `[slice]:[prefix]:[name]`。

   这里 `slice` 是容器将要放入的 systemd slice。如果为空，默认是 `system.slice`；但当使用 cgroup v2 且创建的是无 root 容器（rootless）时，默认值为 `user.slice`。

   注意 `slice` 可以包含连字符以表示子 slice（例如 `user-1000.slice` 是合法表示，表示 `user.slice` 的子 slice），但不得包含斜杠（例如 `user.slice/user-1000.slice` 为无效写法）。

   当 `slice` 为 `-` 时表示根 slice。

   接着，`prefix` 和 `name` 用于组成单元名，格式为 `<prefix>-<name>.scope`；若 `name` 以 `.slice` 为后缀，则忽略 `prefix` 并直接使用 `name`（作为 slice 单元）。`prefix` 和 `name` 的默认值均为空字符串。

2. 如果未设置或将 `Linux.CgroupsPath` 置为空，则行为等同于将其设置为 `:runc:<container-id>`。参见上文说明该设置将如何转换。

如上所述，被创建的单元可以是 scope 或 slice。对于 scope，`runc` 通过 systemd 属性 `Slice=` 指定其父 slice，并同时设置 `Delegate=true`。对于 slice，`runc` 通过 `Wants=` 属性指定对父 slice 的弱依赖。

### 资源限制

`runc` 始终为所有控制器启用统计（accounting），无论是否设置了具体限制。这意味着它会无条件为被创建的 systemd 单元设置如下属性：

- `CPUAccounting=true`
- `IOAccounting=true`（cgroup v1 时为 `BlockIOAccounting`）
- `MemoryAccounting=true`
- `TasksAccounting=true`

`runc` 将运行时规范中的资源限制翻译为 systemd 单元属性，从而为该单元设置资源限制。

这种翻译并不完全覆盖所有 cgroup 属性，因为有些 cgroup 属性无法通过 systemd 设置。因此，`runc` 的 systemd cgroup 驱动由 fs 驱动作后备（换言之，cgroup 限制会先通过 systemd 单元属性设置，必要时还会通过写入 cgroupfs 文件来设置）。

`runc` 将哪些运行时规范资源翻译为 systemd 单元属性，取决于所用内核的 cgroup 版本（v1 或 v2）以及运行的 systemd 版本。如果所用的 systemd 版本较旧（不支持某些资源），`runc` 将不会设置那些资源。

下表汇总了受支持的翻译。

#### cgroup v1

| 运行时规范资源   | systemd 属性名       | 最低 systemd 版本 |
| ---------------- | -------------------- | ----------------- |
| `memory.limit`   | `MemoryLimit`        |                   |
| `cpu.shares`     | `CPUShares`          |                   |
| `blockIO.weight` | `BlockIOWeight`      |                   |
| `pids.limit`     | `TasksMax`           |                   |
| `cpu.cpus`       | `AllowedCPUs`        | v244              |
| `cpu.mems`       | `AllowedMemoryNodes` | v244              |

#### cgroup v2

| 运行时规范资源            | systemd 属性名                  | 最低 systemd 版本 |
| ------------------------- | ------------------------------- | ----------------- |
| `memory.limit`            | `MemoryMax`                     |                   |
| `memory.reservation`      | `MemoryLow`                     |                   |
| `memory.swap`             | `MemorySwapMax`                 |                   |
| `cpu.shares`              | `CPUWeight`                     |                   |
| `pids.limit`              | `TasksMax`                      |                   |
| `cpu.cpus`                | `AllowedCPUs`                   | v244              |
| `cpu.mems`                | `AllowedMemoryNodes`            | v244              |
| `unified.cpu.max`         | `CPUQuota`, `CPUQuotaPeriodSec` | v242              |
| `unified.cpu.weight`      | `CPUWeight`                     |                   |
| `unified.cpu.idle`        | `CPUWeight`                     | v252              |
| `unified.cpuset.cpus`     | `AllowedCPUs`                   | v244              |
| `unified.cpuset.mems`     | `AllowedMemoryNodes`            | v244              |
| `unified.memory.high`     | `MemoryHigh`                    |                   |
| `unified.memory.low`      | `MemoryLow`                     |                   |
| `unified.memory.min`      | `MemoryMin`                     |                   |
| `unified.memory.max`      | `MemoryMax`                     |                   |
| `unified.memory.swap.max` | `MemorySwapMax`                 |                   |
| `unified.pids.max`        | `TasksMax`                      |                   |

有关 systemd 单元资源属性的文档，请参阅 `systemd.resource-control(5)` 手册页。

### 辅助属性

systemd 单元的辅助属性（容器创建后通过 `systemctl show <unit-name>` 可见）可以通过在容器运行时规范（`config.json`）中添加注解来设置或覆盖。

例如：

```json
        "annotations": {
                "org.systemd.property.TimeoutStopUSec": "uint64 123456789",
                "org.systemd.property.CollectMode":"'inactive-or-failed'"
        },
```

上述注解将设置如下属性：

- `TimeoutStopSec` 为 2 分 3 秒；
- `CollectMode` 为 `"inactive-or-failed"`。

这些值必须采用 gvariant 文本格式，详见 [gvariant 文档](https://docs.gtk.org/glib/gvariant-text-format.html)。

要确定 systemd 对特定参数期望的类型，请查阅 systemd 源码或相应文档。

## 终端与标准 IO

_注意：`runc` 的默认配置（前台运行，新终端）对大多数用户通常是最好的选择。本文件旨在解释不同模式的用途，并尽量避免常见错误与误解。_

通常情况下，Unix（及类 Unix）操作系统上的进程在启动时会获得 3 个标准文件描述符，统称为"标准 IO"（`stdio`）：

- `0`：标准输入（`stdin`），进程的输入流
- `1`：标准输出（`stdout`），进程的输出流
- `2`：标准错误（`stderr`），进程的错误输出流

在通过 `runc` 创建并运行容器时，务必注意为容器内的进程构建适当的 `stdio`。在某些方面容器就是普通进程，但在另一些方面它们又像机器的一个隔离子分区（类似虚拟机）。因此 IO 的结构不像普通程序那样简单（普通程序通常只使用你给它的那些文件描述符）。

### 其他文件描述符

在继续之前需要注意：进程可以拥有比 `stdio` 更多的文件描述符。默认情况下，`runc` 不会将其它文件描述符传递给被创建的容器进程。如果你希望显式传递文件描述符到容器，需要使用 `--preserve-fds` 选项。这些辅助文件描述符不具备本文后面讨论的那些奇怪语义（那些语义仅适用于 `stdio`）——它们会被 `runc` 原样传递。

注意 `--preserve-fds` 并不是接受要保留的单个文件描述符编号，而是接受要传递多少个文件描述符（不包括 `stdio` 或 `LISTEN_FDS`）。例如：

```bash
runc run --preserve-fds 5 <container>
```

此时 `runc` 会将前 5 个（即编号 `3,4,5,6,7`）文件描述符（假设未配置 `LISTEN_FDS`）传递给容器。

除了 `--preserve-fds` 外，`LISTEN_FDS` 的文件描述符会被自动传递，以支持类似 systemd 的 socket 激活。扩展上例：

```bash
LISTEN_PID=$pid_of_runc LISTEN_FDS=3 runc run --preserve-fds 5 <container>
```

现在 `runc` 会传递前 8 个文件描述符（并且会将 `LISTEN_FDS=3` 与 `LISTEN_PID=1` 一并传入容器）。前 3 个（`3,4,5`）是由 `LISTEN_FDS` 传递的，后 5 个（`6,7,8,9,10`）是由 `--preserve-fds` 传递的。如果你在像 systemd 单元文件中直接使用 `runc`，请留意这一点。要禁止 `LISTEN_FDS` 风格的传递，只需取消设置 `LISTEN_FDS`。

**向容器进程传递文件描述符时务必非常小心。** 由于 Linux 内核的一些（缺陷）特性，容器如果能访问到某些类型的宿主端文件描述符（例如 `O_PATH` 描述符），可能会利用这些描述符突破容器的 pivot 后的挂载命名空间（pivoted mount namespace）。[过去曾因此导致 CVE。][CVE-2016-9962]

[CVE-2016-9962]: https://nvd.nist.gov/vuln/detail/CVE-2016-9962

### <a name="terminal-modes" /> 终端模式

`runc` 支持两种将 `stdio` 传递给容器主进程的不同方法：

- [新终端（new terminal）](#new-terminal)（`terminal: true`）
- [直通（pass-through）](#pass-through)（`terminal: false`）

初次使用 `runc` 时，这两种模式看起来非常相似，但这可能具有欺骗性——它们在行为上有明显不同。

默认情况下 `runc spec` 会创建一个配置，使用新终端（`terminal: true`）。但如果 `config.json` 中没有 `terminal: ...` 这一行，则默认采用直通模式。

_一般建议使用新终端，因为这样像 `sudo` 这类工具能在容器内正常工作。但如果你很清楚自己在做什么，或把 `runc` 用在非交互流水线里，直通模式也会有用。_

#### <a name="new-terminal"> 新终端（New Terminal）

在新终端模式下，`runc` 会为容器的进程创建一个全新的"控制台"（更精确地说，是使用容器命名空间下的 `/dev/pts/ptmx` 创建一个新的伪终端），并将其作为该进程的 `stdio`。

当以新终端模式启动进程时，`runc` 会执行：

1. 创建一个新的伪终端（pseudo-terminal）。
2. 将从端（slave）作为容器主进程的 `stdio` 传入容器。
3. 将主端（master）交给一个进程，用以与容器主进程的 `stdio` 交互（详见下文的 `runc` 模式部分）。

需要注意的是，由于使用了伪终端，与容器通信时会遇到伪终端的一些特殊行为。例如，默认情况下，所有新的伪终端会在 `stdout` 与 `stderr` 上将字节 `'\n'` 翻译为序列 `'\r\n'`。另外还有一系列只能与伪终端 `stdio` 交互的 `ioctl(2)` 操作。有关详情参见 `tty_ioctl(4)`。

> **注意**：在新终端模式下，三条 `stdio` 文件描述符实际上指向相同的底层文件。这样设计是为了匹配 shell 中进程看到的 `stdio` 行为（并避免对多个主伪终端文件描述符处理时产生的竞态问题）。但这也意味着从调用方角度无法在调用时唯一地区分 `stdout` 与 `stderr`。

##### 问题

如果你看到 `runc` 报错：

```
open /dev/tty: no such device or address
```

这表示无法打开终端（因为没有可用终端）。这可能在 stdin（或 stdout、stderr）被重定向，或运行在缺少 tty 的环境（如 GitHub Actions runner）时出现。

解决办法是不要给容器使用终端，即在 `config.json` 中设置 `terminal: false`。如果容器确实需要终端（某些程序必须要），你可以通过下列方法提供一个终端。

一种方法是用 `ssh -tt` 强制分配终端。第二个 `t` 会在本地没有终端时仍强制分配终端——因此当 stdin 不是终端时这是必需的（某些 `ssh` 实现仅检查 stdin 是否为终端）。

另一种方法是在 `script` 工具下运行 `runc`，例如：

```bash
script -e -c 'runc run <container>'
```

[tty_ioctl(4)]: https://linux.die.net/man/4/tty_ioctl

#### <a name="pass-through"> 直通（Pass-Through）

如果你已经准备好希望容器进程用作其 `stdio` 的文件句柄，可以要求 `runc` 将它们直通给容器（这与 `--preserve-fds` 的传递并不完全相同——详见下文的 `runc` 模式部分）。例如（假设 `config.json` 中设置了 `terminal: false`）：

```bash
echo input | runc run some_container > /tmp/log.out 2> /tmp/log.err
```

此时容器的各个 `stdio` 文件描述符会被替换为：

- `stdin` 来自 `echo input` 的管道输入；
- `stdout` 输出到宿主机的 `/tmp/log.out`；
- `stderr` 输出到宿主机的 `/tmp/log.err`。

注意：容器内看到的实际文件句柄可能会根据 `runc` 的使用模式不同而有所差异（例如编号为 `1` 的文件可能直接指向 `/tmp/log.out`，也可能是 `runc` 用来缓冲输出的一个管道）。但无论哪种情况，最终的效果是相同的。理论上你可以在流水线中使用[新终端模式](#new-terminal)，但当你了解[`runc` 的分离/附着模式](#runc-modes)后，差别会更加明显。

### <a name="runc-modes" /> `runc` 模式

`runc` 本身有两种运行模式：

- [前台（foreground）](#foreground)
- [分离（detached）](#detached)

你可以在任一 `runc` 模式下使用任一终端模式。然而，不同组合会带来不同的注意事项。需要指出的是，尽管终端模式与 `runc` 模式在概念上是独立的，但你应当清楚自己使用的是哪种组合以及它们的细节。

_通常建议使用前台模式，因为它最直观，但唯一缺点是会有一个长期运行的 `runc` 进程。分离模式较难配置正确，并通常需要你自己管理 `stdio`。_

#### <a name="foreground" /> 前台（Foreground）

默认（也是最直接）的 `runc` 模式。在此模式下，`runc` 命令保持在前台，容器进程作为其子进程存在。所有 `stdio` 都通过前台 `runc` 进程进行缓冲（无论采用哪种终端模式）。这在概念上类似于在 shell 中交互式运行一个普通进程（如果你在交互式 shell 中使用 `runc`，这就是你应使用的模式）。

由于 `stdio` 会在此模式下被缓冲，需要注意以下重要特性：

- 在[新终端模式](#new-terminal)下，容器会把伪终端作为它的 `stdio`（如预期）。但前台 `runc` 进程的 `stdio` 仍然是该进程被启动时继承的 `stdio`——`runc` 会在其 `stdio` 与容器的 `stdio` 之间复制所有数据。这意味着尽管创建了新的伪终端，但前台的 `runc` 进程在容器生命周期内负责管理它。

- 在[直通模式](#pass-through)下，前台 `runc` 的 `stdio` **不会** 被传递给容器。相反，容器的 `stdio` 是一组管道，用于在 `runc` 的 `stdio` 与容器的 `stdio` 之间拷贝数据。这意味着容器不会直接访问宿主的文件描述符（除了容器运行时为之创建的那些管道，但通常这不是问题）。

前台模式的主要缺点是需要一个长期运行的 `runc` 进程。如果你杀掉前台的 `runc` 进程，你将无法再访问容器的 `stdio`（在大多数情况下这会导致容器由于 `SIGPIPE` 或其他错误异常终止）。因此任何影响长期运行 `runc` 进程的错误（例如内存泄漏）或一次误杀 OOM，都可能导致容器被终止 **并非用户本意**。另外，前台模式也无法将文件描述符直接作为容器的 `stdio` 传递（像 `--preserve-fds` 那样）。

这些问题正是 `runc` 提供"分离模式"的原因。

#### <a name="detached" /> 分离（Detached）

与前台模式相反，在分离模式下容器启动后不会有长期运行的前台 `runc` 进程。事实上，一旦容器启动，`runc` 进程会退出，不再长期驻留。但这就要求调用者在 `runc` 为你设置好 `stdio` 之后自行管理 `stdio`。在 shell 中，这意味着 `runc` 命令会在容器设置完成后退出并将控制权返回给 shell。

你可以通过下列方式以分离模式运行 `runc`：

- `runc run -d ...` —— 类似 `runc run`，但为分离模式。
- 先 `runc create`，再 `runc start` —— 这符合 OCI 运行时规范定义的容器生命周期（`runc create` 完成容器的设置，等待 `runc start` 开始执行用户代码）。

分离模式的主要用例是让上层工具作为 `runc` 的封装器。通过分离模式，上层工具可以更灵活地控制容器的 `stdio`，而不会被 `runc` 干扰（像 `cri-o` 或 `containerd` 等大多数 `runc` 封装器都是出于此原因使用分离模式）。

不幸的是，分离模式要复杂一些，需要更细心地处理 `stdio`——主要因为这时由调用者负责容器的 `stdio`。

另一个复杂点是父进程需要承担子回收（subreaper）的责任。简言之，父进程需要调用 `prctl(PR_SET_CHILD_SUBREAPER, 1, ...)` 并正确处理作为 subreaper 的后果。若未处理得当，可能在宿主上累积僵尸进程。

这些任务通常由每个容器的一个专用（且尽量小的）监视进程来完成。为了比较，其他运行时（例如 LXC）没有等价的分离模式，而是将监视进程整合到运行时中——两种方式各有权衡，`runc` 选择通过分离模式将监视职责委托给父进程。

##### 分离 + 直通（Detached Pass-Through）

在分离模式下，直通字面意思即：`runc` 的 `stdio` 文件描述符会原样传入容器的 `stdio`。该选项的目的是允许用户自行为容器设置 `stdio`，然后强制 `runc` 使用这些预先准备好的 `stdio`（不涉及伪终端的特殊处理）。_如果你不明白这有什么用，请不要使用该选项。_

**在 shell 中使用分离直通时必须极其小心。** 原因是分离直通会将宿主的文件描述符传给容器。在 shell 场景下，通常你的 `stdio` 是宿主上的伪终端。恶意容器可能利用 TTY 特定的 `ioctl`（如 `TIOCSTI`）向 **宿主** shell 注入伪造输入（请记住，分离模式会把控制权返回给你的 shell，因此你给容器的终端仍会被宿主 shell 读取）。

在 shell 中以分离直通运行即便容器无恶意也有若干问题：

- 容器输出会与 shell 输出交织在一起（顺序不可预测），且难以判定某段输出来自何处。
- 对 `stdin` 的输入会被不确定地分给容器或 shell（因为两者都在同一个 FIFO 式的文件描述符上阻塞等待 `read(2)`）。

这些问题都源于宿主与容器在对 `stdio` 读写时存在竞态。尤其在 shell 中更明显，因为终端通常被置为 raw 模式（每次按键应使 `read(2)` 返回）。

> **注意**：目前存在一个[已知问题][issue-1721]，在分离直通情形下如果 `stdout` 或 `stderr` 是管道会导致容器挂起（但这应是暂时问题）。

[issue-1721]: https://github.com/opencontainers/runc/issues/1721

##### 分离 + 新终端（Detached New Terminal）

在分离模式下创建新的伪终端会出现一个明显问题——如何使用 `runc` 创建的新终端？与直通不同，`runc` 已创建了一组新的文件描述符，需要被*某个东西*使用，容器通信才能工作。

该问题的解决方式是使用 Unix 域套接字（Unix domain sockets）。Unix 套接字有一个特性 `SCM_RIGHTS`，允许通过 Unix 套接字将文件描述符发送给另一个进程（接收者可以像自己打开它一样使用该文件描述符）。在分离新终端模式下，用户即通过这种方式获得伪终端主端的访问权。

为此引入了一个新的选项（若要使用分离新终端模式这是必需的）：`--console-socket`。该选项接受一个 Unix 域套接字路径，`runc` 会连接该套接字并通过它发送伪终端的主端文件描述符。获取伪终端主端的大致流程如下：

1. 在某个路径 `$socket_path` 上创建一个 Unix 域套接字。
2. 使用参数 `--console-socket $socket_path` 调用 `runc run` 或 `runc create`。
3. 用 `recvmsg(2)` 从套接字接收 `runc` 用 `SCM_RIGHTS` 发送过来的文件描述符。
4. 管理进程现在可以使用接收到的伪终端主端来与容器的 `stdio` 交互。

在 `runc` 退出后，唯一持有该伪终端主端文件描述符副本的就是从套接字中读取该描述符的进程。

> **注意**：当前 `runc` 不支持抽象套接字地址（abstract socket addresses），因为无法在 argv 中以第一个字符为空字节的方式传递参数。将来可能会改变，但当前你必须使用有效的路径名。

为帮助用户使用分离新终端模式，我们在 `go-runc` 绑定中提供了一个 [Go 实现][containerd/go-runc.Socket]，以及一个简易客户端 [recvtty][recvtty]。

[containerd/go-runc.Socket]: https://godoc.org/github.com/containerd/go-runc#Socket
[recvtty]: /tests/cmd/recvtty

## 实验性功能

以下功能在过去属于**实验性**：

| 特性                 | 实验性发布版本 | 正式/进入稳定的发布版本 |
| -------------------- | -------------- | ----------------------- |
| cgroup v2            | v1.0.0-rc91    | v1.0.0-rc93             |
| `runc features` 命令 | v1.1.0         | v1.2.0                  |
| runc-dmz             | v1.2.0-rc1     | 在 v1.2.1 中被移除      |

## 已弃用的特性

以下特性已被弃用：

| 特性      | 弃用版本 | 移除版本         |
| --------- | -------- | ---------------- |
| cgroup v1 | v1.4.0   | （2029 年 5 月） |

<!-- 待定：已被弃用并移除的特性 -->

- 2029 年 5 月的最新发布版本可能**不一定**继续支持 cgroup v1，但至少会有一个仍然维护的分支保留对 cgroup v1 的支持。

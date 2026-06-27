+++
title = "runc Documentation"
weight = 33

[taxonomies]
category = ["Containers"]
+++

## Spec Conformance

This branch of runc implements the [OCI Runtime Spec v1.3.0](https://github.com/opencontainers/runtime-spec/tree/v1.3.0)
for the `linux` platform.

The following features are not implemented yet:

| Spec version | Feature                                      | PR                                                        |
| ------------ | -------------------------------------------- | --------------------------------------------------------- |
| v1.1.0       | `SECCOMP_FILTER_FLAG_WAIT_KILLABLE_RECV`     | [#3862](https://github.com/opencontainers/runc/pull/3862) |
| v1.3.0       | Clarified interpretation of `linux.intelRdt` | [#3832](https://github.com/opencontainers/runc/pull/3832) |
| v1.3.0       | Fail on a failure of a poststart hook.       | [#4348](https://github.com/opencontainers/runc/pull/4348) |

## Architectures

The following architectures are supported:

| runc binary | seccomp                                              |
| ----------- | ---------------------------------------------------- |
| `amd64`     | `SCMP_ARCH_X86`, `SCMP_ARCH_X86_64`, `SCMP_ARCH_X32` |
| `arm64`     | `SCMP_ARCH_ARM`, `SCMP_ARCH_AARCH64`                 |
| `armel`     | `SCMP_ARCH_ARM`                                      |
| `armhf`     | `SCMP_ARCH_ARM`                                      |
| `ppc64le`   | `SCMP_ARCH_PPC64LE`                                  |
| `riscv64`   | `SCMP_ARCH_RISCV64`                                  |
| `s390x`     | `SCMP_ARCH_S390`, `SCMP_ARCH_S390X`                  |
| `loong64`   | `SCMP_ARCH_LOONGARCH64`                              |

The runc binary might be compilable for i386, big-endian PPC64,
and several MIPS variants too, but these architectures are not officially supported.

## Cgroup v2

runc fully supports cgroup v2 (unified mode) since v1.0.0-rc93.

To use cgroup v2, you might need to change the configuration of the host init system.
The following distributions are known to use cgroup v2 by default:

<!-- the list should be kept in sync with https://github.com/rootless-containers/rootlesscontaine.rs/blob/master/content/getting-started/common/cgroup2.md -->

- Fedora (since 31)
- Arch Linux (since April 2021)
- openSUSE Tumbleweed (since c. 2021)
- Debian GNU/Linux (since 11)
- Ubuntu (since 21.10)
- RHEL and RHEL-like distributions (since 9)

On other systemd-based distros, cgroup v2 can be enabled by adding `systemd.unified_cgroup_hierarchy=1` to the kernel cmdline.

### Am I using cgroup v2?

Yes if `/sys/fs/cgroup/cgroup.controllers` is present.

### Host Requirements

#### Kernel

- Recommended version: 5.2 or later
- Minimum version: 4.15

Kernel older than 5.2 is not recommended due to lack of freezer.

Notably, kernel older than 4.15 MUST NOT be used (unless you are running containers with user namespaces), as it lacks support for controlling permissions of devices.

#### Systemd

On cgroup v2 hosts, it is highly recommended to run runc with the systemd cgroup driver (`runc --systemd-cgroup`), though not mandatory.

The recommended systemd version is 244 or later. Older systemd does not support delegation of `cpuset` controller.

Make sure you also have the `dbus-user-session` (Debian/Ubuntu) or `dbus-daemon` (CentOS/Fedora) package installed, and that `dbus` is running. On Debian-flavored distros, this can be accomplished like so:

```bash
sudo apt install -y dbus-user-session
systemctl --user start dbus
```

### Rootless

On cgroup v2 hosts, rootless runc can talk to systemd to get cgroup permissions to be delegated.

```bash
runc spec --rootless
jq '.linux.cgroupsPath="user.slice:runc:foo"' config.json | sponge config.json
runc --systemd-cgroup run foo
```

The container processes are executed in a cgroup like `/user.slice/user-$(id -u).slice/user@$(id -u).service/user.slice/runc-foo.scope`.

#### Configuring delegation

Typically, only `memory` and `pids` controllers are delegated to non-root users by default.

```console
$ cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
memory pids
```

To allow delegation of other controllers, you need to change the systemd configuration as follows:

```bash
sudo mkdir -p /etc/systemd/system/user@.service.d
cat <<EOF | sudo tee /etc/systemd/system/user@.service.d/delegate.conf
[Service]
Delegate=cpu cpuset io memory pids
EOF
sudo systemctl daemon-reload
```

## Checkpoint and Restore

For a basic description about checkpointing and restoring containers with
`runc` please see [runc-checkpoint(8)](../man/runc-checkpoint.8.md) and
[runc-restore(8)](../man/runc-restore.8.md).

### Checkpoint/Restore Annotations

In addition to specifying options on the command-line like it is described
in the man-pages (see above), it is also possible to influence CRIU's
behaviour using CRIU configuration files. For details about CRIU's
configuration file support please see [CRIU's wiki](https://criu.org/Configuration_files).

In addition to CRIU's default configuration files `runc` tells CRIU to
also evaluate the file `/etc/criu/runc.conf`. Using the annotation
`org.criu.config` it is, however, possible to change this additional
CRIU configuration file.

If the annotation `org.criu.config` is set to an empty string `runc`
will not pass any additional configuration file to CRIU. With an empty
string it is therefore possible to disable the additional CRIU configuration
file. This can be used to make sure that no additional configuration file
changes CRIU's behaviour accidentally.

If the annotation `org.criu.config` is set to a non-empty string `runc` will
pass that string to CRIU to be evaluated as an additional configuration file.
If CRIU cannot open this additional configuration file, it will ignore this
file and continue.

#### Annotation Example to disable additional CRIU configuration file

```
{
	"ociVersion": "1.0.0",
	"annotations": {
		"org.criu.config": ""
	},
	"process": {
```

#### Annotation Example to set a specific CRIU configuration file

```
{
	"ociVersion": "1.0.0",
	"annotations": {
		"org.criu.config": "/etc/special-runc-criu-options"
	},
	"process": {
```

## systemd cgroup driver

By default, runc creates cgroups and sets cgroup limits on its own (this mode
is known as fs cgroup driver). When `--systemd-cgroup` global option is given
(as in e.g. `runc --systemd-cgroup run ...`), runc switches to systemd cgroup
driver. This document describes its features and peculiarities.

### systemd unit name and placement

When creating a container, runc requests systemd (over dbus) to create
a transient unit for the container, and place it into a specified slice.

The name of the unit and the containing slice is derived from the container
runtime spec in the following way:

1. If `Linux.CgroupsPath` is set, it is expected to be in the form
   `[slice]:[prefix]:[name]`.

   Here `slice` is a systemd slice under which the container is placed.
   If empty, it defaults to `system.slice`, except when cgroup v2 is
   used and rootless container is created, in which case it defaults
   to `user.slice`.

   Note that `slice` can contain dashes to denote a sub-slice
   (e.g. `user-1000.slice` is a correct notation, meaning a subslice
   of `user.slice`), but it must not contain slashes (e.g.
   `user.slice/user-1000.slice` is invalid).

   A `slice` of `-` represents a root slice.

   Next, `prefix` and `name` are used to compose the  unit name, which
   is `<prefix>-<name>.scope`, unless `name` has `.slice` suffix, in
   which case `prefix` is ignored and the `name` is used as is.
   The default value for both `prefix` and `name` is empty string.

2. If `Linux.CgroupsPath` is not set or empty, it works the same way as if it
   would be set to `:runc:<container-id>`. See the description above to see
   what it transforms to.

As described above, a unit being created can either be a scope or a slice.
For a scope, runc specifies its parent slice via a _Slice=_ systemd property,
and also sets _Delegate=true_. For a slice, runc specifies a weak dependency on
the parent slice via a _Wants=_ property.

### Resource limits

runc always enables accounting for all controllers, regardless of any limits
being set. This means it unconditionally sets the following properties for the
systemd unit being created:

 * _CPUAccounting=true_
 * _IOAccounting=true_ (_BlockIOAccounting_ for cgroup v1)
 * _MemoryAccounting=true_
 * _TasksAccounting=true_

The resource limits of the systemd unit are set by runc by translating the
runtime spec resources to systemd unit properties.

Such translation is by no means complete, as there are some cgroup properties
that can not be set via systemd.  Therefore, runc systemd cgroup driver is
backed by fs driver (in other words, cgroup limits are first set via systemd
unit properties, and when by writing to cgroupfs files).

The set of runtime spec resources which is translated by runc to systemd unit
properties depends on kernel cgroup version being used (v1 or v2), and on the
systemd version being run. If an older systemd version (which does not support
some resources) is used, runc do not set those resources.

The following tables summarize which properties are translated.

#### cgroup v1

| runtime spec resource | systemd property name | min systemd version |
|-----------------------|-----------------------|---------------------|
| memory.limit          | MemoryLimit           |                     |
| cpu.shares            | CPUShares             |                     |
| blockIO.weight        | BlockIOWeight         |                     |
| pids.limit            | TasksMax              |                     |
| cpu.cpus              | AllowedCPUs           | v244                |
| cpu.mems              | AllowedMemoryNodes    | v244                |

#### cgroup v2

| runtime spec resource   | systemd property name | min systemd version |
|-------------------------|-----------------------|---------------------|
| memory.limit            | MemoryMax             |                     |
| memory.reservation      | MemoryLow             |                     |
| memory.swap             | MemorySwapMax         |                     |
| cpu.shares              | CPUWeight             |                     |
| pids.limit              | TasksMax              |                     |
| cpu.cpus                | AllowedCPUs           | v244                |
| cpu.mems                | AllowedMemoryNodes    | v244                |
| unified.cpu.max         | CPUQuota, CPUQuotaPeriodSec | v242          |
| unified.cpu.weight      | CPUWeight             |                     |
| unified.cpu.idle        | CPUWeight             | v252                |
| unified.cpuset.cpus     | AllowedCPUs           | v244                |
| unified.cpuset.mems     | AllowedMemoryNodes    | v244                |
| unified.memory.high     | MemoryHigh            |                     |
| unified.memory.low      | MemoryLow             |                     |
| unified.memory.min      | MemoryMin             |                     |
| unified.memory.max      | MemoryMax             |                     |
| unified.memory.swap.max | MemorySwapMax         |                     |
| unified.pids.max        | TasksMax              |                     |

For documentation on systemd unit resource properties, see
`systemd.resource-control(5)` man page.

### Auxiliary properties

Auxiliary properties of a systemd unit (as shown by `systemctl show
<unit-name>` after the container is created) can be set (or overwritten) by
adding annotations to the container runtime spec (`config.json`).

For example:

```json
        "annotations": {
                "org.systemd.property.TimeoutStopUSec": "uint64 123456789",
                "org.systemd.property.CollectMode":"'inactive-or-failed'"
        },
```

The above will set the following properties:

* `TimeoutStopSec` to 2 minutes and 3 seconds;
* `CollectMode` to "inactive-or-failed".

The values must be in the gvariant text format, as described in
[gvariant documentation](https://docs.gtk.org/glib/gvariant-text-format.html).

To find out which type systemd expects for a particular parameter, please
consult systemd sources.

## Terminals and Standard IO

*Note that the default configuration of `runc` (foreground, new terminal) is
generally the best option for most users. This document exists to help explain
what the purpose of the different modes is, and to try to steer users away from
common mistakes and misunderstandings.*

In general, most processes on Unix (and Unix-like) operating systems have 3
standard file descriptors provided at the start, collectively referred to as
"standard IO" (`stdio`):

* `0`: standard-in (`stdin`), the input stream into the process
* `1`: standard-out (`stdout`), the output stream from the process
* `2`: standard-error (`stderr`), the error stream from the process

When creating and running a container via `runc`, it is important to take care
to structure the `stdio` the new container's process receives. In some ways
containers are just regular processes, while in other ways they're an isolated
sub-partition of your machine (in a similar sense to a VM). This means that the
structure of IO is not as simple as with ordinary programs (which generally
just use the file descriptors you give them).

### Other File Descriptors

Before we continue, it is important to note that processes can have more file
descriptors than just `stdio`. By default in `runc` no other file descriptors
will be passed to the spawned container process. If you wish to explicitly pass
file descriptors to the container you have to use the `--preserve-fds` option.
These ancillary file descriptors don't have any of the strange semantics
discussed further in this document (those only apply to `stdio`) -- they are
passed untouched by `runc`.

It should be noted that `--preserve-fds` does not take individual file
descriptors to preserve. Instead, it takes how many file descriptors (not
including `stdio` or `LISTEN_FDS`) should be passed to the container. In the
following example:

```bash
runc run --preserve-fds 5 <container>
```

`runc` will pass the first `5` file descriptors (`3`, `4`, `5`, `6`, and `7` --
assuming that `LISTEN_FDS` has not been configured) to the container.

In addition to `--preserve-fds`, `LISTEN_FDS` file descriptors are passed
automatically to allow for `systemd`-style socket activation. To extend the
above example:

```bash
LISTEN_PID=$pid_of_runc LISTEN_FDS=3 runc run --preserve-fds 5 <container>
```

`runc` will now pass the first `8` file descriptors (and it will also pass
`LISTEN_FDS=3` and `LISTEN_PID=1` to the container). The first `3` (`3`, `4`,
and `5`) were passed due to `LISTEN_FDS` and the other `5` (`6`, `7`, `8`, `9`,
and `10`) were passed due to `--preserve-fds`. You should keep this in mind if
you use `runc` directly in something like a `systemd` unit file. To disable
this `LISTEN_FDS`-style passing just unset `LISTEN_FDS`.

**Be very careful when passing file descriptors to a container process.** Due
to some Linux kernel (mis)features, a container with access to certain types of
file descriptors (such as `O_PATH` descriptors) outside of the container's root
file system can use these to break out of the container's pivoted mount
namespace. [This has resulted in CVEs in the past.][CVE-2016-9962]

[CVE-2016-9962]: https://nvd.nist.gov/vuln/detail/CVE-2016-9962

### <a name="terminal-modes" /> Terminal Modes

`runc` supports two distinct methods for passing `stdio` to the container's
primary process:

* [new terminal](#new-terminal) (`terminal: true`)
* [pass-through](#pass-through) (`terminal: false`)

When first using `runc` these two modes will look incredibly similar, but this
can be quite deceptive as these different modes have quite different
characteristics.

By default, `runc spec` will create a configuration that will create a new
terminal (`terminal: true`). However, if the `terminal: ...` line is not
present in `config.json` then pass-through is the default.

*In general we recommend using new terminal, because it means that tools like
`sudo` will work inside your container. But pass-through can be useful if you
know what you're doing, or if you're using `runc` as part of a non-interactive
pipeline.*

#### <a name="new-terminal"> New Terminal

In new terminal mode, `runc` will create a brand-new "console" (or more
precisely, a new pseudo-terminal using the container's namespaced
`/dev/pts/ptmx`) for your contained process to use as its `stdio`.

When you start a process in new terminal mode, `runc` will do the following:

1. Create a new pseudo-terminal.
2. Pass the slave end to the container's primary process as its `stdio`.
3. Send the master end to a process to interact with the `stdio` for the
   container's primary process ([details below](#runc-modes)).

It should be noted that since a new pseudo-terminal is being used for
communication with the container, some strange properties of pseudo-terminals
might surprise you. For instance, by default, all new pseudo-terminals
translate the byte `'\n'` to the sequence `'\r\n'` on both `stdout` and
`stderr`. In addition there are [a whole range of `ioctls(2)` that can only
interact with pseudo-terminal `stdio`][tty_ioctl(4)].

> **NOTE**: In new terminal mode, all three `stdio` file descriptors are the
> same underlying file. The reason for this is to match how a shell's `stdio`
> looks to a process (as well as remove race condition issues with having to
> deal with multiple master pseudo-terminal file descriptors). However this
> means that it is not really possible to uniquely distinguish between `stdout`
> and `stderr` from the caller's perspective.

##### Issues

If you see an error like

```
open /dev/tty: no such device or address
```

from runc, it means it can't open a terminal (because there isn't one). This
can happen when stdin (and possibly also stdout and stderr) are redirected,
or in some environments that lack a tty (such as GitHub Actions runners).

The solution to this is to *not* use a terminal for the container, i.e. have
`terminal: false` in `config.json`. If the container really needs a terminal
(some programs require one), you can provide one, using one of the following
methods.

One way is to use `ssh` with the `-tt` flag. The second `t` forces a terminal
allocation even if there's no local one -- and so it is required when stdin is
not a terminal (some `ssh` implementations only look for a terminal on stdin).

Another way is to run runc under the `script` utility, like this

```bash
script -e -c 'runc run <container>'
```

[tty_ioctl(4)]: https://linux.die.net/man/4/tty_ioctl

#### <a name="pass-through"> Pass-Through

If you have already set up some file handles that you wish your contained
process to use as its `stdio`, then you can ask `runc` to pass them through to
the contained process (this is not necessarily the same as `--preserve-fds`'s
passing of file descriptors -- [details below](#runc-modes)). As an example
(assuming that `terminal: false` is set in `config.json`):

```bash
echo input | runc run some_container > /tmp/log.out 2> /tmp/log.err
```

Here the container's various `stdio` file descriptors will be substituted with
the following:

* `stdin` will be sourced from the `echo input` pipeline.
* `stdout` will be output into `/tmp/log.out` on the host.
* `stderr` will be output into `/tmp/log.err` on the host.

It should be noted that the actual file handles seen inside the container may
be different [based on the mode `runc` is being used in](#runc-modes) (for
instance, the file referenced by `1` could be `/tmp/log.out` directly or a pipe
which `runc` is using to buffer output, based on the mode). However the net
result will be the same in either case. In principle you could use the [new
terminal mode](#new-terminal) in a pipeline, but the difference will become
more clear when you are introduced to [`runc`'s detached mode](#runc-modes).

### <a name="runc-modes" /> `runc` Modes

`runc` itself runs in two modes:

* [foreground](#foreground)
* [detached](#detached)

You can use either [terminal mode](#terminal-modes) with either `runc` mode.
However, there are considerations that may indicate preference for one mode
over another. It should be noted that while two types of modes (terminal and
`runc`) are conceptually independent from each other, you should be aware of
the intricacies of which combination you are using.

*In general we recommend using foreground because it's the most
straight-forward to use, with the only downside being that you will have a
long-running `runc` process. Detached mode is difficult to get right and
generally requires having your own `stdio` management.*

#### Foreground

The default (and most straight-forward) mode of `runc`. In this mode, your
`runc` command remains in the foreground with the container process as a child.
All `stdio` is buffered through the foreground `runc` process (irrespective of
which terminal mode you are using). This is conceptually quite similar to
running a normal process interactively in a shell (and if you are using `runc`
in a shell interactively, this is what you should use).

Because the `stdio` will be buffered in this mode, some very important
peculiarities of this mode should be kept in mind:

* With [new terminal mode](#new-terminal), the container will see a
  pseudo-terminal as its `stdio` (as you might expect). However, the `stdio` of
  the foreground `runc` process will remain the `stdio` that the process was
  started with -- and `runc` will copy all `stdio` between its `stdio` and the
  container's `stdio`. This means that while a new pseudo-terminal has been
  created, the foreground `runc` process manages it over the lifetime of the
  container.

* With [pass-through mode](#pass-through), the foreground `runc`'s `stdio` is
  **not** passed to the container. Instead, the container's `stdio` is a set of
  pipes which are used to copy data between `runc`'s `stdio` and the
  container's `stdio`. This means that the container never has direct access to
  host file descriptors (aside from the pipes created by the container runtime,
  but that shouldn't be an issue).

The main drawback of the foreground mode of operation is that it requires a
long-running foreground `runc` process. If you kill the foreground `runc`
process then you will no longer have access to the `stdio` of the container
(and in most cases this will result in the container dying abnormally due to
`SIGPIPE` or some other error). By extension this means that any bug in the
long-running foreground `runc` process (such as a memory leak) or a stray
OOM-kill sweep could result in your container being killed **through no fault
of the user**. In addition, there is no way in foreground mode of passing a
file descriptor directly to the container process as its `stdio` (like
`--preserve-fds` does).

These shortcomings are obviously sub-optimal and are the reason that `runc` has
an additional mode called "detached mode".

#### Detached

In contrast to foreground mode, in detached mode there is no long-running
foreground `runc` process once the container has started. In fact, there is no
long-running `runc` process at all. However, this means that it is up to the
caller to handle the `stdio` after `runc` has set it up for you. In a shell
this means that the `runc` command will exit and control will return to the
shell, after the container has been set up.

You can run `runc` in detached mode in one of the following ways:

* `runc run -d ...` which operates similar to `runc run` but is detached.
* `runc create` followed by `runc start` which is the standard container
  lifecycle defined by the OCI runtime specification (`runc create` sets up the
  container completely, waiting for `runc start` to begin execution of user
  code).

The main use-case of detached mode is for higher-level tools that want to be
wrappers around `runc`. By running `runc` in detached mode, those tools have
far more control over the container's `stdio` without `runc` getting in the
way (most wrappers around `runc` like `cri-o` or `containerd` use detached mode
for this reason).

Unfortunately using detached mode is a bit more complicated and requires more
care than the foreground mode -- mainly because it is now up to the caller to
handle the `stdio` of the container.

Another complication is that the parent process is responsible for acting as
the subreaper for the container. In short, you need to call
`prctl(PR_SET_CHILD_SUBREAPER, 1, ...)` in the parent process and correctly
handle the implications of being a subreaper. Failing to do so may result in
zombie processes being accumulated on your host.

These tasks are usually performed by a dedicated (and minimal) monitor process
per-container. For the sake of comparison, other runtimes such as LXC do not
have an equivalent detached mode and instead integrate this monitor process
into the container runtime itself -- this has several tradeoffs, and runc has
opted to support delegating the monitoring responsibility to the parent process
through this detached mode.

##### Detached Pass-Through

In detached mode, pass-through actually does what it says on the tin -- the
`stdio` file descriptors of the `runc` process are passed through (untouched)
to the container's `stdio`. The purpose of this option is to allow a user to
set up `stdio` for a container themselves and then force `runc` to just use
their pre-prepared `stdio` (without any pseudo-terminal funny business). *If
you don't see why this would be useful, don't use this option.*

**You must be incredibly careful when using detached pass-through (especially
in a shell).** The reason for this is that by using detached pass-through you
are passing host file descriptors to the container. In the case of a shell,
usually your `stdio` is going to be a pseudo-terminal (on your host). A
malicious container could take advantage of TTY-specific `ioctls` like
`TIOCSTI` to fake input into the **host** shell (remember that in detached
mode, control is returned to your shell and so the terminal you've given the
container is being read by a shell prompt).

There are also several other issues with running non-malicious containers in a
shell with detached pass-through (where you pass your shell's `stdio` to the
container):

* Output from the container will be interleaved with output from your shell (in
  a non-deterministic way), without any real way of distinguishing from where a
  particular piece of output came from.

* Any input to `stdin` will be non-deterministically split and given to either
  the container or the shell (because both are blocked on a `read(2)` of the
  same FIFO-style file descriptor).

They are all related to the fact that there is going to be a race when either
your host or the container tries to read from (or write to) `stdio`. This
problem is especially obvious when in a shell, where usually the terminal has
been put into raw mode (where each individual key-press should cause `read(2)`
to return).

> **NOTE**: There is also currently a [known problem][issue-1721] where using
> detached pass-through will result in the container hanging if the `stdout` or
> `stderr` is a pipe (though this should be a temporary issue).

[issue-1721]: https://github.com/opencontainers/runc/issues/1721

##### Detached New Terminal

When creating a new pseudo-terminal in detached mode, and fairly obvious
problem appears -- how do we use the new terminal that `runc` created? Unlike
in pass-through, `runc` has created a new set of file descriptors that need to
be used by *something* in order for container communication to work.

The way this problem is resolved is through the use of Unix domain sockets.
There is a feature of Unix sockets called `SCM_RIGHTS` which allows a file
descriptor to be sent through a Unix socket to a completely separate process
(which can then use that file descriptor as though they opened it). When using
`runc` in detached new terminal mode, this is how a user gets access to the
pseudo-terminal's master file descriptor.

To this end, there is a new option (which is required if you want to use `runc`
in detached new terminal mode): `--console-socket`. This option takes the path
to a Unix domain socket which `runc` will connect to and send the
pseudo-terminal master file descriptor down. The general process for getting
the pseudo-terminal master is as follows:

1. Create a Unix domain socket at some path, `$socket_path`.
2. Call `runc run` or `runc create` with the argument `--console-socket
   $socket_path`.
3. Using `recvmsg(2)` retrieve the file descriptor sent using `SCM_RIGHTS` by
   `runc`.
4. Now the manager can interact with the `stdio` of the container, using the
   retrieved pseudo-terminal master.

After `runc` exits, the only process with a copy of the pseudo-terminal master
file descriptor is whoever read the file descriptor from the socket.

> **NOTE**: Currently `runc` doesn't support abstract socket addresses (due to
> it not being possible to pass an `argv` with a null-byte as the first
> character). In the future this may change, but currently you must use a valid
> path name.

In order to help users make use of detached new terminal mode, we have provided
a [Go implementation in the `go-runc` bindings][containerd/go-runc.Socket], as
well as [a simple client][recvtty].

[containerd/go-runc.Socket]: https://godoc.org/github.com/containerd/go-runc#Socket
[recvtty]: /tests/cmd/recvtty

## Experimental Features

The following features were experimental in the past:

| Feature                     | Experimental release | Graduation release |
| --------------------------- | -------------------- | ------------------ |
| cgroup v2                   | v1.0.0-rc91          | v1.0.0-rc93        |
| The `runc features` command | v1.1.0               | v1.2.0             |
| runc-dmz                    | v1.2.0-rc1           | Dropped in v1.2.1  |

## Deprecated Features

The following features are deprecated:

| Feature   | Deprecation release | Removal release |
| --------- | ------------------- | --------------- |
| cgroup v1 | v1.4.0              | (May 2029)      |

<!-- TBD: features that were already deprecated and removed -->

- The latest release in May 2029 may not necessarily support cgroup v1, but there will be at least one maintained branch with the support for cgroup v1.

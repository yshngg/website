+++
title = "Monitoring and Observability"
weight = 51

[extra]
author = "Cindy Sridharan"
original_url = "https://copyconstruct.medium.com/monitoring-and-observability-8417d1952e1c"

[taxonomies]
tags = ["Observability"]
+++

During lunch with a few friends in late July, the topic of observability came up. I have a talk coming up at [Velocity](https://conferences.oreilly.com/velocity/vl-ny) in less than a month called ***Monitoring in the time of Cloud Native***, so I've been speaking with friends about how they approach monitoring where they work. During this conversation, one of my friends mentioned:

He was only half joking. I've heard several variations of this zinger, some of them being:

> — Why call it monitoring? That's not sexy enough anymore.
>
> — Observability, because rebranding Ops as DevOps wasn't bad enough, now they're devopsifying monitoring too
>
> — Is that supposed to be like the second coming of DevOps? Or was it the Second Way? I can't remember. It all felt so cultish anyway.

So then. What is the difference between "monitoring" and "observability", if any? Or is the latter just the latest buzzword on the block, to be flogged and shoved down our throats until it has been milked for all its worth?

## Once upon a time there was "Monitoring"

"Monitoring" traditionally was a preserve of Operations engineers. The term often invokes not very pleasant memories in minds of many who've been doing it for long enough they can remember the time when Nagios was state-of-the-art. In the eyes of many, "monitoring" harks back to many dysfunctional aspects of the old school way of operating software, not least the unsophistication of tooling available back in the day that ruled the roost so consummately that the term "monitoring" to this day causes some people to think of simple up/down checks.

While it's true that a decade ago, up/down checks might've been all a "monitoring" tool would have been capable of, in the recent years "monitoring" tools have evolved *greatly*, to the point where many, many, many people no longer think of monitoring as just external pings. While they might still call it "monitoring", the methods and tools they use are more powerful and streamlined. Time series, logs and traces are all more in vogue than ever these days and are forms of "*whitebox* monitoring", which refers to a category of monitoring based on the information derived from the internals of systems.

Whitebox monitoring isn't really a revolutionary idea anymore, at least not since Etsy published the [seminal blog post](https://codeascraft.com/2011/02/15/measure-anything-measure-everything/) introducing `statsd`. The blog post goes on to state that:

> In general, we tend to measure at three levels: network, machine, and application. Application metrics are usually the hardest, yet most important, of the three. They're very specific to your business, and they change as your applications change (and Etsy changes a lot). Instead of trying to plan out everything we wanted to measure and putting it in a classical [configuration management system](http://www.opscode.com/chef/), we decided to make it ridiculously simple for any engineer to get anything they can count or time into a graph with almost no effort.

For all its flaws, `statsd` was a *game changer*, its popularity and ubiquity being a testament to how it struck the right chord with huge swathes of the industry, so much so that most open source time series based systems as well as commercial monitoring solutions have supported `statsd` style metrics for years now. While not perfect, `statsd` style metrics collection was a huge improvement over the way one did "monitoring" previously.

## Baby's first Observability

"Observability", on the other hand, was a term I first encountered while reading a [post](https://blog.twitter.com/engineering/en_us/a/2013/observability-at-twitter.html) on Twitter's tech blog a few years ago and have been hearing the term ever since, not in real life or at the places where I've worked but at tech conferences. Twitter has since published a [two](https://blog.twitter.com/engineering/en_us/a/2016/observability-at-twitter-technical-overview-part-i.html) [part](https://blog.twitter.com/engineering/en_us/a/2016/observability-at-twitter-technical-overview-part-ii.html) blog post on its current observability stack. The posts are more about the architecture of the different components than the term itself, but the first post begins by stating that:

> These are the four pillars of the Observability Engineering team's charter:
>
> - Monitoring
> - Alerting/visualization
> - Distributed systems tracing infrastructure
> - Log aggregation/analytics

"Observability", according to this definition, is a *superset* of "monitoring", providing certain benefits and insights that "monitoring" tools come a cropper at. Before examining what these gains might be and when they are even needed, let's first understand what "monitoring" really is, what its shortcomings are and why "monitoring" alone isn't sufficient for certain use cases.

## Monitoring is for symptom based Alerting

The [SRE book](https://landing.google.com/sre/book/index.html) states:

> Your monitoring system should address two questions: what's broken, and why? The "what's broken" indicates the symptom; the "why" indicates a (possibly intermediate) cause."What" versus "why" is one of the most important distinctions in writing good monitoring with maximum signal and minimum noise.

Blackbox monitoring — that is, monitoring a system from the outside by treating it as a blackbox — is something I find very good at answering the *what is broken* and alerting about a problem that's already occurring (and ideally end user-impacting). Whitebox monitoring, on the other hand, is fantastic for the signals we can *anticipate* in advance and be on the lookout for. In other words, whitebox monitoring is for the ***known, hard*** failure modes of a system, the sort that lend themselves well toward exhibiting any deviation in a *dashboardable* manner, as it were.

A good example of something that needs "monitoring" would be a storage server running out of disk space or a proxy server running out of file descriptors. An I/O bound service has different failure modes compared to a memory bound one. An AP system has different failure modes compared to a CP system.

Building "monitorable" systems requires being able to understand the failure domain of the critical components of the system ***proactively.*** And that's a tall order. *Especially* for complex systems. More so for simple systems that interact *complexly* with one another.

![kellabyte rant](fig5.png)

The more mature a system, the better understood are its failure modes. Battle hardened, ["boring" technology](http://mcfunley.com/choose-boring-technology) often comes with [well-publicized, well-understood and *monitorable* failure modes](https://medium.com/%40Pinterest_Engineering/learn-to-stop-using-shiny-new-things-and-love-mysql-3e1613c2ce14). Being able to entirely architect away a failure mode is the best thing one can do while building systems. The next best thing one can do is to be able to "monitor" impending failures and alert accordingly.

As strange as it might sound, I'm beginning to think one of the design goals while building systems should be to make it as *monitorable* as possible — which means minimizing the number of unknown-unknowns. For monitoring to be *effective,* it becomes salient to be able to identify a small set of hard failure modes of a system or a core set of metrics that can indicate the health of the system accurately. Some believe that the ideal number of signals to be "monitored" is anywhere between 3–5, and definitely no more than 7-10. One of the common pain points that keeps cropping up in my conversations with friends is how *noisy* their "monitoring" is. Or as one of my friends put it,

> We have a **ton** of metrics. We try to collect ***everything*** but the vast majority of these metrics are never looked at. It leads to a case of severe metric fatigue to the point where some of our engineers now don't see the point of adding new metrics to the mix, because why bother when only a handful are ever really used?

This is something the SRE book warns against:

> The sources of potential complexity are never-ending. Like all software systems, monitoring can become so complex that it's fragile, complicated to change, and a maintenance burden. Therefore, design your monitoring system with an eye toward simplicity. In choosing what to monitor, keep the following guidelines in mind:
>
> — The rules that catch real incidents most often should be as **simple, predictable, and reliable** as possible.
> — Data collection, aggregation, and alerting configuration that is rarely exercised (e.g., less than once a quarter for some SRE teams) should be up for removal.
> — Signals that are collected, but not exposed in any prebaked dashboard nor used by any alert, are candidates for removal.

The corollary of the aforementioned points is that *monitoring* data needs to be *actionable.* What I've gathered talking to many people is that when not used to directly drive alerts, monitoring data should be optimized for providing a bird's eye view of the *overall health* of a system. In the event of a failure, monitoring data should immediately be able to provide visibility into impact of the failure as well as the effect of any fix deployed. The crucial thing to understand here is that monitoring doesn't guarantee that failure can be completely avoided. Monitoring provides a good *approximation* of the health of a system, but monitoring doesn't *prevent* failure entirely.

I feel especially poignant writing this because just the previous week we had several hours of degraded performance where I work. It wasn't a void in our monitoring that caused it. It was MySQL exhibiting one of its nastiest failure modes. Boring old MySQL which was chosen a few years ago with eyes wide open for its boringness and its maturity and our prior experience with it. Boring old MySQL which was the right choice when it was introduced into the stack, which isn't the right choice anymore given our evolving needs. Like monitoring, boring technology, in and of itself, isn't a panacea.

![Monitoring and Observability](cover.png)

Monitoring can furnish one with a panoramic view of systems' performance and behavior in the wild. Monitoring can also greatly assist in understanding the shortcomings and the evolving needs of a system by dint of invalidating one's assumptions about the system design choices. Monitoring, as such, is an absolute *requirement* for building, operating and running systems. It, however, does not make our systems completely *impregnable* to failure, and that shouldn't be its *goal* either.

## And then there's "Observability"

Quoting the SRE book again:

> It can be tempting to combine monitoring with other aspects of inspecting complex systems, such as detailed system profiling, single-process debugging, tracking details about exceptions or crashes, load testing, log collection and analysis, or traffic inspection. While most of these subjects share commonalities with basic monitoring, blending together too many results in overly complex and fragile systems.

The SRE book doesn't quite use the term "observability", but clearly lays out everything that "monitoring" isn't and shouldn't aim to be. I find this to be an interesting paradox, that the "monitoring" of complex systems should itself be *simple*. And yet it makes perfect sense, since the alternative is empirically proving to be falling short.

The goals of "monitoring" and "observability" are different. "Observability" isn't a substitute for "monitoring" nor does it obviate the need for "monitoring"; they are complementary. "Observability" might be a fancy new term on the horizon, but it really isn't a novel idea. Events, tracing, exception tracking are all a derivative of logs, and if one has been using any of these tools, one already has some form of "observability". True, new tools and new vendors will have their own definition and understanding of the term, but in essence "observability" captures what "monitoring" doesn't (and ideally, *shouldn't*).

"Monitoring" is best suited to report the overall health of systems. Aiming to "monitor everything" can prove to be an anti-pattern. Monitoring, as such, is best limited to key business and systems metrics derived from time-series based instrumentation, known failure modes as well as blackbox tests. "Observability", on the other hand, aims to provide highly granular insights into the behavior of systems ***along with rich context***, perfect for debugging purposes. Since it's still not possible to predict every single failure mode a system could potentially run into or predict every possible way in which a system could *misbehave*, it becomes important that we build systems that can be ***debugged*** armed with evidence and not conjecture.

![Debugging principles](fig3.png)

### Debugging

Two of my favorite recent talks were [***Debugging under fire: Keeping your head when systems have lost their mind***](https://www.youtube.com/watch?v=30jNsCVLpAE) and [**Zebras all the way down: The engineering challenges of the data path**](https://www.youtube.com/watch?v=fE2KDzZaxvE), both by [Bryan Cantrill](https://twitter.com/bcantrill). Since I possibly can't say it better, I'm going to borrow a couple of slides from those talks here (the entire deck is definitely worth checking out).

![Debugging slide 1](fig1.png)
![Debugging slide 2](fig2.png)
![Debugging slide 3](fig4.png)

Debugging is an *iterative* process, involving iterative introspection of the various observations and facts reported by the system, making the right deductions and testing whether the theory holds water. Evidence cannot be conjured out of thin air nor can it be extrapolated from aggregates, averages, percentiles, historic patterns or any other forms of data primarily collected for *monitoring* purposes. Evidence needs to be *reported* by the systems in the form of highly precise and contextual facts and observations, which can later be used while debugging to theorize as to why something might be not working as expected.

Furthermore, unlike "monitoring" which is *known* *failure centric*, "observability" doesn't necessarily have to be closely tied to an outage or a user complaint. It can be used as a way to better understand system performance and behavior, even during the what can be perceived as "normal" operation of a system.

### Context Matters

Another theme that came up during my recent conversations is how simply buying or setting up a tool doesn't lead to everyone in the organization actually using it. As one of the people I spoke with noted in dismay:

> We have Zipkin! We went to great lengths to rope in developers to instrument everything and get Zipkin up and running, but the dev teams don't use it very much. In retrospect, it wasn't worth the effort.

Tools can only help so much. Before buying or building a tool, it becomes important to evaluate the maximum utility it can provide for the unique set of engineering challenges specific teams face. Yet another one of my friends who works on an extremely popular open source project modeled along the lines of an internal tool at a big company said to me:

> When we open sourced [redacted] a few years ago, the questions in the mailing list were extremely intelligent and high quality. Now that [redacted] has gotten really popular, what we're seeing is that the quality of questions is plummeting. We now have enterprises ask us if we can provide [redacted] as a SaaS service, since by their own admission their developers aren't the hipster types who want to or will be able to run [redacted] themselves.

Context is key. A tool that worked swimmingly well at company X won't necessarily work just as well at company Y. This is *especially* true when it comes to bringing big company tooling to the masses. The organization structure and culture, quality of developers and Operations engineers, tooling already in use, state of the codebase, appetite for risk all play a huge part into how successful a tool will prove to be if introduced.

### One last thing

Observations can lead a developer to the answers, it can't make them necessarily find it. The process of examining the evidence (observations) at hand and being able to deduce still requires a good understanding of the system, the domain as well as a good sense of intuition. No amount of "observability" or "monitoring" tooling can ever be a substitute to good engineering intuition and instincts.

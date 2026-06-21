# Cloud Cost Co-pilot — Problem & Solution

## Problem

Most startups today run on more than one cloud. AWS for compute, GCP for data, Azure for a specific service — the multi-cloud reality crept up on teams before they had a plan to manage it.

The result: **nobody really knows what they're spending, or why.**

### The core pain points

**1. Fragmented visibility**
Cloud spend lives across three separate consoles, each with its own interface, its own terminology, and its own way of slicing data. Getting a single answer like "what did we spend on databases last month across all clouds?" means logging into three places, exporting three reports, and stitching them together manually in a spreadsheet. Nobody does this consistently.

**2. The wrong people have access to the right data**
Cloud billing consoles are built for engineers. But the people who most need cost visibility — founders, CTOs, engineering managers, finance leads — aren't going to learn AWS Cost Explorer. They either fly blind or wait for a monthly invoice that's already too late to act on.

**3. No senior DevOps, no FinOps practice**
Early-stage startups don't have a dedicated platform engineer or a FinOps team. Cost management becomes nobody's job. Resources get left running over weekends. Staging environments quietly balloon. A spike happens and nobody notices until the bill arrives.

**4. Reactive, not proactive**
Every existing tool — native cloud consoles, open source platforms like OptScale — requires you to go looking for problems. You have to remember to open a dashboard and know what to look for. Most teams don't. By the time they notice an issue, the money is already spent.

**5. Existing tools are either too heavy or too expensive**
Open source options like OptScale require a dedicated VM with 8+ cores and 16 GB RAM just to run. Enterprise FinOps tools like CloudHealth or Apptio cost $2,000+/month — priced entirely out of reach for startups. There is nothing useful in the middle.

---

## Who this is for

| Persona             | The question they're asking                                 |
| ------------------- | ----------------------------------------------------------- |
| Founder / CEO       | "How much are we spending and is it sustainable?"           |
| CTO                 | "Which team or service is burning the most money?"          |
| Engineering Manager | "Did we leave something running that we shouldn't have?"    |
| Finance / CFO       | "What do I put in the board deck for infrastructure costs?" |

None of these people want a dashboard. They want answers, delivered where they already spend their time.

---

## Solution

A **cloud cost co-pilot** that connects to AWS, GCP, and Azure, normalizes all billing data into a single source of truth, and makes it accessible to anyone on the team — technical or not — through natural language and proactive alerts.

### How it works

**Layer 1 — Data connectors**
The product connects directly to each cloud's native billing export mechanism:

- AWS Cost & Usage Report (CUR) via S3
- GCP Billing Export via BigQuery
- Azure Cost Management export via Storage Account

All raw billing data is pulled, normalized into a single unified schema, and stored in ClickHouse — a columnar database optimized for time-series financial queries. This runs on a lightweight scheduled sync (daily or near-real-time).

**Layer 2 — Context enrichment**
Raw billing numbers without context are useless. The product enriches data with:

- Team and ownership mapping (via resource tags or manual assignment)
- Environment classification (prod, staging, dev)
- Per-customer and per-feature cost attribution where tags exist
- Historical baselines for anomaly detection

**Layer 3 — Agent interface**
Instead of a dashboard, the primary interface is a natural language agent. Anyone on the team can ask questions like:

- _"Why did our AWS bill spike last Tuesday?"_
- _"How much did we spend on compute vs storage this month?"_
- _"Which environment is costing the most right now?"_
- _"What's our infrastructure cost per customer?"_

The agent queries ClickHouse, interprets the results in context, and responds in plain English. No SQL, no console logins, no prior cloud knowledge required.

**Layer 4 — Proactive alerts**
The product doesn't wait for someone to ask. It watches the data continuously and pushes intelligence to where people already work:

- **Slack** — weekly spend summaries, anomaly alerts, idle resource notifications
- **Email** — monthly reports formatted for non-technical stakeholders
- **Webhooks** — for teams that want to pipe alerts into PagerDuty, Jira, or custom workflows

Alerts are configurable by threshold, by team, and by persona — a CEO gets a different summary than an engineering manager.

### What the v1 product looks like

A simple web interface with three parts:

1. **Onboarding flow** — connect your cloud accounts in under 10 minutes
2. **Chat interface** — ask questions, get answers in plain English
3. **Alert settings** — configure who gets what, and where

No complex dashboards. No learning curve. Just questions and answers.

---

## The moat

The dashboard is not the moat. Dashboards are a commodity.

The defensible advantages are:

- **Data access and normalization** — clean, unified, trustworthy billing data from all three clouds is genuinely hard to build and maintain. Once a customer's data is flowing in and enriched with their team and environment context, switching costs are high.
- **The agent layer** — natural language access to financial data, trained specifically on cloud billing semantics, is a step-change in accessibility over any existing tool.
- **Proactive intelligence** — pushing the right insight to the right person before they think to ask for it creates a habit loop that dashboards never achieve.
- **Persona-aware delivery** — the same underlying data surfaces differently for a CEO versus an engineer. Most tools are built for one audience. This is built for the whole company.

---

## The gap this fills

|                        | Too heavy | Too expensive | Right fit                  |
| ---------------------- | --------- | ------------- | -------------------------- |
| OptScale (self-hosted) | ✅        | —             | —                          |
| CloudHealth / Apptio   | —         | ✅            | —                          |
| Native cloud consoles  | —         | —             | ❌ (fragmented, technical) |
| **This product**       | —         | —             | ✅                         |

Target: **startups at Series A–B, 20–100 engineers, already multi-cloud, no dedicated FinOps person.** Pricing in the $99–299/month range — below procurement approval thresholds, directly solving a pain the team feels every month.

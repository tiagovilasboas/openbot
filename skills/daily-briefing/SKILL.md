---
name: daily-briefing
description: Prepare a sourced daily briefing from approved calendar and GitHub read tools.
---

# Daily briefing

## When to use

When the user asks for a daily overview and has connected relevant read tools.
This example is a proposed recipe; no loader or integration is implemented yet.

## Steps

1. Establish the user's date and time zone; ask if the intended day is unclear.
2. Use only approved read tools to list events and relevant GitHub items. If an
   integration is unavailable, say so and continue with available sources.
3. Summarize upcoming events and actionable items, linking to their sources.
   Separate factual results from suggested priorities and note missing data.
4. Offer a next action when useful. Do not create events, modify issues or send
   messages without the host's explicit approval flow.

## Validation and output

Check dates, time zone, links and scope against tool results. Do not invent
appointments or task status. Return a concise briefing with source links and
identify any unavailable integration. A skill never grants access or approval.

---
name: openbot-delivery
description: Plan and implement a focused Open Bot change with explicit boundaries and evidence.
---

# Open Bot delivery

## When to use

Use for a scoped change in Open Bot. Read the repository instructions and
architecture before implementation. This is a contributor guide, not an agent
permission or a runtime skill loader.

## Steps

1. Describe the user outcome, affected domain, acceptance criteria and limits.
2. Identify existing contracts and adapters; separate provider, MCP, UI and
   domain responsibilities. Prefer the smallest independently useful increment.
3. Implement the change without assuming a model or provider is interchangeable
   in behaviour. Keep credentials and private content out of code and logs.
4. Check the relevant failure paths, including missing credentials and tool
   permissions when they apply. Run repository checks that actually exist.
5. Review the diff for cohesive responsibilities and document unverified risks.

## Output

Report the user-visible result, changed boundaries, verification evidence, and
remaining gaps. Distinguish actual checks from proposed checks. External writes
and publication follow the user's permissions and the repository's rules.

# Spike: mobile agent and provider boundary

Status: **HeroUI React prototype builds and preserves the bilingual mock chat; full feasibility experiment remains open**. On 2026-10-30 the UI kit decision changed from Ionic to HeroUI React v3.2.7. A production build emits `/` and `/manifest.webmanifest`; this does not validate mobile devices, PWA installation, model compatibility, latency, or provider behavior.

The original Ionic prototype and its hydration tradeoff are historical evidence from 2026-10-29. The current screen uses public HeroUI React components with the official stylesheet and Tailwind CSS 4; the HeroUI Pro chat template is not copied. The build emits a web manifest only: there is no service worker/offline behavior, trusted HTTPS setup, or device installation test. Do not treat the desktop prototype as proof of mobile support.

## Decision

Determine whether a single Next.js Node application with HeroUI React can deliver an installable mobile chat and a reliable tool-use flow with local Liquid, Anthropic, or a free cloud provider through optional 9Router. The router itself does not supply models; no provider is assumed to be available or unlimited.

## Setup and controls

Record exact OS/device/browser, dependency and model versions, quantization, context length, runtime settings and network path. Use fictional calendar and GitHub data and mock read tools. Use a local inference endpoint that explicitly supports the chosen Liquid model; confirm actual format and tool-calling support before selecting it. Use test credentials from approved secret storage for the Anthropic run; no real private data in the test corpus. Access from the phone over authenticated HTTPS with a trusted certificate.

## Experiments

1. Validate the existing Next.js + HeroUI screen on an iPhone and Android browser. Check installation, safe areas, soft keyboard, scrolling, focus, reconnect and text contrast. Record actual devices; do not claim platform coverage for an untested device.
2. Define one read-only mock tool, `list_events`, and a tool policy. Test plain answers, tool invocation, valid arguments, tool failure, timeout and denied action. Confirm the executor, not the model, enforces access.
3. Execute the same prompts with Liquid directly and Anthropic directly. Record successful tool calls, factual correctness against fixture, latency to first output and completion, token usage if available, retries and cost when applicable.
4. Repeat the same compatible cases through 9Router, documenting exact version, endpoint and provider configuration. Check streamed text, tool calls and errors are preserved. Confirm unavailable routes fail visibly and do not fall back to a different provider without explicit configuration and user consent.
5. Restart the server during a request and reconnect the client. Record whether the conversation can resume, what is lost, and cleanup of any MCP process. Check credentials do not appear in client payloads or logs.
6. Evaluate at least one free route through 9Router against the same cases. Record current provider terms, eligibility, account or key requirements, rate limits, data policy and provider/model identity. Test no configuration, activation, quota exhaustion and outage. Offer cloud only after explicit selection; do not bundle a shared key or bypass provider restrictions.

## Proposed acceptance

- At least 20 fixed representative prompts in Portuguese and English, including five failure/denial cases, published with expected outcomes and no personal data. Run the identical set for each supported path; document missing cases rather than substituting them silently.
- Zero unauthorized tool executions and zero silent local-to-cloud switches in the sample. All tool arguments pass schema validation. Test results include failures and raw counts.
- Every attempted PWA workflow and device is recorded as pass/fail, with reproduction for failures. Record first-token and completion latency and total cost; no arbitrary performance or quality claim without an agreed baseline and threshold.
- Document dependency license, operational overhead and credential handling for 9Router. Compare direct versus routed outcomes; decide whether the optional adapter is worth maintaining.
- Result is **go**, **change approach**, or **stop** for each of UI, local model, Anthropic and router. Any incomplete experiment remains unresolved.

## References

- [HeroUI React quick start](https://heroui.com/en/docs/react/getting-started/quick-start): React 19, Tailwind CSS 4, and official style package requirements.
- [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers).
- [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture) and [security practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices).
- [9Router repository](https://github.com/decolua/9router): optional self-hosted gateway; version and configuration must be recorded during the experiment.
- [Liquid LFM3 announcement](https://www.liquid.ai/blog/lfm3): vendor claims are not a substitute for local measurements.

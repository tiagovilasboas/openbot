# Spike: mobile agent and provider boundary

Status: **planned; no experiment has been run**. This is a time-boxed feasibility experiment, not production implementation or a performance claim.

## Decision

Determine whether a single Next.js Node application with Ionic React can deliver an installable mobile chat and a reliable tool-use flow with either a local Liquid model or Anthropic. Assess 9Router as an optional integration, not a prerequisite.

## Setup and controls

Record exact OS/device/browser, dependency and model versions, quantization, context length, runtime settings and network path. Use fictional calendar and GitHub data and mock read tools. Use a local inference endpoint that explicitly supports the chosen Liquid model; confirm actual format and tool-calling support before selecting it. Use test credentials from approved secret storage for the Anthropic run; no real private data in the test corpus. Access from the phone over authenticated HTTPS with a trusted certificate.

## Experiments

1. Build a disposable Next.js + Ionic screen with streaming chat, one navigation transition and a PWA manifest. On an iPhone and Android browser, check installation, safe areas, soft keyboard, scrolling, focus, reconnect and text contrast. Record actual devices; do not claim platform coverage for an untested device.
2. Define one read-only mock tool, `list_events`, and a tool policy. Test plain answers, tool invocation, valid arguments, tool failure, timeout and denied action. Confirm the executor, not the model, enforces access.
3. Execute the same prompts with Liquid directly and Anthropic directly. Record successful tool calls, factual correctness against fixture, latency to first output and completion, token usage if available, retries and cost when applicable.
4. Repeat the same compatible cases through 9Router, documenting exact version, endpoint and provider configuration. Check streamed text, tool calls and errors are preserved. Confirm unavailable routes fail visibly and do not fall back to a different provider without explicit configuration and user consent.
5. Restart the server during a request and reconnect the client. Record whether the conversation can resume, what is lost, and cleanup of any MCP process. Check credentials do not appear in client payloads or logs.

## Proposed acceptance

- At least 20 fixed representative prompts in Portuguese and English, including five failure/denial cases, published with expected outcomes and no personal data. Run the identical set for each supported path; document missing cases rather than substituting them silently.
- Zero unauthorized tool executions and zero silent local-to-cloud switches in the sample. All tool arguments pass schema validation. Test results include failures and raw counts.
- Every attempted PWA workflow and device is recorded as pass/fail, with reproduction for failures. Record first-token and completion latency and total cost; no arbitrary performance or quality claim without an agreed baseline and threshold.
- Document dependency license, operational overhead and credential handling for 9Router. Compare direct versus routed outcomes; decide whether the optional adapter is worth maintaining.
- Result is **go**, **change approach**, or **stop** for each of UI, local model, Anthropic and router. Any incomplete experiment remains unresolved.

## References

- [Ionic React overview](https://ionicframework.com/docs/react/overview): React tooling and components; validate Next.js routing and rendering in our own prototype.
- [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers).
- [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture) and [security practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices).
- [9Router repository](https://github.com/decolua/9router): optional self-hosted gateway; version and configuration must be recorded during the experiment.
- [Liquid LFM3 announcement](https://www.liquid.ai/blog/lfm3): vendor claims are not a substitute for local measurements.

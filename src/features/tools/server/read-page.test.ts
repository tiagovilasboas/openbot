import assert from "node:assert/strict";
import test from "node:test";
import { createReadPageTool, READ_PAGE_LIMITS } from "./read-page.ts";

const lookup = async () => ["93.184.216.34"];
const ctx = () => ({ botId: "b", signal: new AbortController().signal });

function tool(responses: Response[]) {
  const urls: string[] = [];
  const fetchImpl = (async (url: string) => {
    urls.push(url);
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return next;
  }) as unknown as typeof fetch;
  return { tool: createReadPageTool({ fetchImpl, lookup }), urls };
}

const html = (body: string, type = "text/html; charset=utf-8") =>
  new Response(body, { headers: { "content-type": type } });

test("parseArgs accepts exactly one url string", () => {
  const { tool: t } = tool([]);
  assert.deepEqual(t.parseArgs({ url: " https://a.test/ " }), {
    ok: true,
    args: { url: "https://a.test/" },
  });
  for (const bad of [
    null,
    [],
    {},
    { url: 1 },
    { url: "" },
    { url: "https://a.test", extra: 1 },
    { url: "https://a.test/" + "x".repeat(READ_PAGE_LIMITS.urlMaxChars) },
  ]) {
    assert.equal(t.parseArgs(bad).ok, false, JSON.stringify(bad));
  }
});

test("is read-only: automatic, asks by default, never always-allow", () => {
  const { tool: t } = tool([]);
  assert.equal(t.name, "read_page");
  assert.equal(t.policy, "auto");
  assert.equal(t.allowAlways, false);
  assert.equal(t.defaultLevel, undefined);
});

test("returns the final URL, title and readable text, labelled untrusted", async () => {
  const { tool: t } = tool([
    html("<title>Hi</title><script>x()</script><p>Body text</p>"),
  ]);
  const result = await t.run({ url: "https://example.com/p" }, ctx());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.text, /^\[Untrusted web page content/);
  assert.match(result.text, /URL: https:\/\/example\.com\/p/);
  assert.match(result.text, /Title: Hi/);
  assert.match(result.text, /Body text/);
  assert.doesNotMatch(result.text, /x\(\)|<p>/);
});

test("plain text is returned as is and the final URL follows redirects", async () => {
  const { tool: t, urls } = tool([
    new Response(null, { status: 301, headers: { location: "/final.txt" } }),
    html("line one\r\nline two", "text/plain"),
  ]);
  const result = await t.run({ url: "https://example.com/a" }, ctx());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.text, /URL: https:\/\/example\.com\/final\.txt/);
  assert.match(result.text, /line one\nline two/);
  assert.equal(urls.length, 2);
});

test("text over the cap is truncated and flagged", async () => {
  const { tool: t } = tool([html(`<p>${"a".repeat(50_000)}</p>`)]);
  const result = await t.run({ url: "https://example.com/" }, ctx());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.text, /\(truncated\)/);
  assert.ok(result.text.length <= t.maxResultChars);
});

test("the body is read as a stream and stops at the byte cap", async () => {
  let pulled = 0;
  const chunk = new Uint8Array(512 * 1024).fill(97);
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled += 1;
      controller.enqueue(chunk);
      if (pulled > 100) controller.close();
    },
  });
  const { tool: t } = tool([
    new Response(body, { headers: { "content-type": "text/plain" } }),
  ]);
  const result = await t.run({ url: "https://example.com/" }, ctx());
  assert.equal(result.ok, true);
  assert.ok(pulled <= 6, `pulled ${pulled} chunks`);
});

test("unsupported content types and HTTP errors become fixed codes", async () => {
  for (const type of ["application/pdf", "image/png", "application/json", ""]) {
    const { tool: t } = tool([html("data", type)]);
    assert.deepEqual(await t.run({ url: "https://example.com/" }, ctx()), {
      ok: false,
      code: "read_page_unsupported_type",
    });
  }
  const { tool: t } = tool([new Response("secret", { status: 500 })]);
  assert.deepEqual(await t.run({ url: "https://example.com/" }, ctx()), {
    ok: false,
    code: "read_page_http_error",
  });
});

test("internal targets are refused with a fixed code and never fetched", async () => {
  for (const url of [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3000/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "file:///etc/passwd",
    "https://u:p@example.com/",
  ]) {
    const { tool: t, urls } = tool([]);
    const result = await t.run({ url }, ctx());
    assert.equal(result.ok, false, url);
    assert.equal(urls.length, 0, url);
  }
  const { tool: t } = tool([]);
  assert.deepEqual(await t.run({ url: "http://10.0.0.1/" }, ctx()), {
    ok: false,
    code: "read_page_blocked",
  });
});

test("a redirect into the private network is refused", async () => {
  const { tool: t, urls } = tool([
    new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/" },
    }),
  ]);
  assert.deepEqual(await t.run({ url: "https://example.com/" }, ctx()), {
    ok: false,
    code: "read_page_blocked",
  });
  assert.equal(urls.length, 1);
});

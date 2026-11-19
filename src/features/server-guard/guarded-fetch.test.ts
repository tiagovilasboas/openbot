import assert from "node:assert/strict";
import test from "node:test";
import { checkPublicUrl, guardedFetch } from "./guarded-fetch.ts";

const publicLookup = async () => ["93.184.216.34"];

test("only http and https without credentials are accepted", async () => {
  for (const bad of [
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "gopher://example.com",
    "https://user:pass@example.com/",
    "https://user@example.com/",
    "not a url",
    "",
    "https://",
  ]) {
    const result = await checkPublicUrl(bad, publicLookup);
    assert.deepEqual(result, { ok: false, code: "bad_url" }, bad);
  }
  const ok = await checkPublicUrl("https://example.com/a?b=1", publicLookup);
  assert.equal(ok.ok, true);
});

test("IP literals in any notation are judged by their address", async () => {
  const noDns = async () => {
    throw new Error("must not resolve a literal");
  };
  for (const blocked of [
    "http://127.0.0.1/",
    "http://127.1/",
    "http://2130706433/",
    "http://0x7f.0.0.1/",
    "http://0177.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5:8080/",
    "http://192.168.0.1/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fe80::1]/",
    "http://[fd00:ec2::254]/",
    "http://[64:ff9b::a9fe:a9fe]/",
  ]) {
    const result = await checkPublicUrl(blocked, noDns);
    assert.deepEqual(result, { ok: false, code: "blocked_address" }, blocked);
  }
  assert.equal((await checkPublicUrl("http://8.8.8.8/", noDns)).ok, true);
  assert.equal(
    (await checkPublicUrl("http://[2606:4700:4700::1111]/", noDns)).ok,
    true,
  );
});

test("local host names are refused without a lookup", async () => {
  const noDns = async () => {
    throw new Error("must not resolve");
  };
  for (const name of [
    "localhost",
    "LOCALHOST.",
    "app.localhost",
    "printer.local",
    "db.internal",
  ]) {
    const result = await checkPublicUrl(`http://${name}/`, noDns);
    assert.deepEqual(result, { ok: false, code: "blocked_address" }, name);
  }
});

test("a host that resolves to any non-public address is refused", async () => {
  const mixed = async () => ["93.184.216.34", "10.0.0.1"];
  assert.deepEqual(await checkPublicUrl("https://evil.test/", mixed), {
    ok: false,
    code: "blocked_address",
  });
  const toMetadata = async () => ["169.254.169.254"];
  assert.deepEqual(await checkPublicUrl("https://evil.test/", toMetadata), {
    ok: false,
    code: "blocked_address",
  });
  const toMappedLoopback = async () => ["::ffff:127.0.0.1"];
  assert.deepEqual(
    await checkPublicUrl("https://evil.test/", toMappedLoopback),
    { ok: false, code: "blocked_address" },
  );
});

test("lookup failure or an empty answer is dns_failed", async () => {
  const fails = async () => {
    throw new Error("ENOTFOUND");
  };
  assert.deepEqual(await checkPublicUrl("https://nope.test/", fails), {
    ok: false,
    code: "dns_failed",
  });
  assert.deepEqual(await checkPublicUrl("https://nope.test/", async () => []), {
    ok: false,
    code: "dns_failed",
  });
});

function scriptedFetch(responses: Response[]) {
  const urls: string[] = [];
  const inits: RequestInit[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    urls.push(url);
    inits.push(init);
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return next;
  }) as unknown as typeof fetch;
  return { fetchImpl, urls, inits };
}

const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { location } });

test("guardedFetch fetches with manual redirects and the signal", async () => {
  const { fetchImpl, urls, inits } = scriptedFetch([
    new Response("hello", { status: 200 }),
  ]);
  const signal = new AbortController().signal;
  const result = await guardedFetch("https://example.com/x", {
    fetchImpl,
    lookup: publicLookup,
    signal,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.finalUrl, "https://example.com/x");
  assert.equal(await result.response.text(), "hello");
  assert.equal(urls.length, 1);
  assert.equal(inits[0].redirect, "manual");
  assert.equal(inits[0].signal, signal);
});

test("guardedFetch follows redirects and re-checks every hop", async () => {
  const { fetchImpl, urls } = scriptedFetch([
    redirect("/second"),
    redirect("https://other.test/third", 301),
    new Response("done"),
  ]);
  const result = await guardedFetch("https://example.com/first", {
    fetchImpl,
    lookup: publicLookup,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.finalUrl, "https://other.test/third");
  assert.deepEqual(urls, [
    "https://example.com/first",
    "https://example.com/second",
    "https://other.test/third",
  ]);
});

test("a redirect to a private address or bad scheme is refused before fetching it", async () => {
  for (const target of [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:3000/",
    "http://[::1]/",
    "file:///etc/passwd",
    "https://user:pw@example.com/",
  ]) {
    const { fetchImpl, urls } = scriptedFetch([redirect(target)]);
    const result = await guardedFetch("https://example.com/", {
      fetchImpl,
      lookup: publicLookup,
    });
    assert.equal(result.ok, false, target);
    assert.equal(urls.length, 1, `${target} must not be fetched`);
  }
});

test("a redirect to a host that resolves privately is refused", async () => {
  const lookup = async (host: string) =>
    host === "rebind.test" ? ["10.1.2.3"] : ["93.184.216.34"];
  const { fetchImpl, urls } = scriptedFetch([redirect("https://rebind.test/")]);
  const result = await guardedFetch("https://example.com/", {
    fetchImpl,
    lookup,
  });
  assert.deepEqual(result, { ok: false, code: "blocked_address" });
  assert.equal(urls.length, 1);
});

test("too many redirects stops the loop", async () => {
  const hops = Array.from({ length: 10 }, () => redirect("/again"));
  const { fetchImpl, urls } = scriptedFetch(hops);
  const result = await guardedFetch("https://example.com/", {
    fetchImpl,
    lookup: publicLookup,
    maxRedirects: 3,
  });
  assert.deepEqual(result, { ok: false, code: "too_many_redirects" });
  assert.equal(urls.length, 4);
});

test("a redirect without Location and a thrown fetch are fetch_failed", async () => {
  const noLocation = scriptedFetch([new Response(null, { status: 302 })]);
  assert.deepEqual(
    await guardedFetch("https://example.com/", {
      fetchImpl: noLocation.fetchImpl,
      lookup: publicLookup,
    }),
    { ok: false, code: "fetch_failed" },
  );
  const throwing = (async () => {
    throw new Error("boom");
  }) as unknown as typeof fetch;
  assert.deepEqual(
    await guardedFetch("https://example.com/", {
      fetchImpl: throwing,
      lookup: publicLookup,
    }),
    { ok: false, code: "fetch_failed" },
  );
});

test("a connect-time block is reported as blocked_address", async () => {
  const blocking = (async () => {
    throw new Error("blocked_address");
  }) as unknown as typeof fetch;
  assert.deepEqual(
    await guardedFetch("https://example.com/", {
      fetchImpl: blocking,
      lookup: publicLookup,
    }),
    { ok: false, code: "blocked_address" },
  );
});

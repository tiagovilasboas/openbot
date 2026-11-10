import assert from "node:assert/strict";
import test from "node:test";
import { safeGithubUrl } from "./safe-github-url.ts";

test("accepts https github.com and its subdomains", () => {
  assert.equal(
    safeGithubUrl("https://github.com/o/r/issues/1"),
    "https://github.com/o/r/issues/1",
  );
  assert.ok(safeGithubUrl("https://gist.github.com/x"));
  assert.ok(safeGithubUrl("https://GitHub.com/o/r"));
});

test("rejects other schemes", () => {
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "http://github.com/o/r",
    "ftp://github.com/o/r",
    "//github.com/o/r",
  ]) {
    assert.equal(safeGithubUrl(bad), null, bad);
  }
});

test("rejects look-alike hosts and embedded credentials", () => {
  for (const bad of [
    "https://evil.com/github.com",
    "https://github.com.evil.com/o/r",
    "https://notgithub.com/o/r",
    "https://github.com@evil.com/o/r",
    "https://user:pw@github.com/o/r",
  ]) {
    assert.equal(safeGithubUrl(bad), null, bad);
  }
});

test("rejects empty, malformed and non-string values", () => {
  for (const bad of ["", "not a url", undefined, null, 5]) {
    assert.equal(safeGithubUrl(bad), null);
  }
});

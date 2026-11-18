import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkLoopGuard, type LoopTurn } from "./index.ts";

const human = (text: string): LoopTurn => ({ kind: "human", text });
const bot = (botId: string, text: string): LoopTurn => ({
  kind: "bot",
  botId,
  text,
});

describe("checkLoopGuard", () => {
  it("allows an empty or human-only exchange", () => {
    assert.deepEqual(checkLoopGuard([]), { allowed: true });
    assert.deepEqual(checkLoopGuard([human("hi")]), { allowed: true });
  });

  it("allows a healthy exchange with new content each turn", () => {
    const turns = [
      human("plan a launch"),
      bot("a", "Draft the timeline first, then pick channels."),
      bot("b", "Budget is the constraint: two thousand dollars total."),
      bot("c", "Then paid ads are out; focus on newsletters and demos."),
    ];
    assert.deepEqual(checkLoopGuard(turns), { allowed: true });
  });

  describe("max_rounds", () => {
    const run = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        bot(`b${i % 3}`, `unique contribution number ${i} ${"x".repeat(i)}`),
      );

    it("stops at the default cap of 8 bot turns", () => {
      assert.equal(checkLoopGuard([human("go"), ...run(7)]).allowed, true);
      assert.deepEqual(checkLoopGuard([human("go"), ...run(8)]), {
        allowed: false,
        reason: "max_rounds",
        rounds: 8,
        limit: 8,
      });
    });

    it("honours a custom cap", () => {
      const verdict = checkLoopGuard([human("go"), ...run(3)], {
        maxRounds: 3,
      });
      assert.equal(verdict.allowed, false);
    });

    it("resets the count on a human message", () => {
      const turns = [human("go"), ...run(8), human("keep going"), ...run(2)];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });

    it("counts bot turns even without any human message", () => {
      const verdict = checkLoopGuard(run(8));
      assert.equal(verdict.allowed === false && verdict.reason, "max_rounds");
    });
  });

  describe("echo", () => {
    it("flags an identical reply from another bot", () => {
      const turns = [
        human("status?"),
        bot("a", "All tasks are finished and merged."),
        bot("b", "All tasks are finished and merged."),
      ];
      assert.deepEqual(checkLoopGuard(turns), {
        allowed: false,
        reason: "echo",
        botId: "b",
        repeatedBotId: "a",
      });
    });

    it("ignores case, whitespace and punctuation", () => {
      const turns = [
        bot("a", "Sounds good, thanks!"),
        bot("b", "  sounds   GOOD thanks "),
      ];
      const verdict = checkLoopGuard(turns);
      assert.equal(verdict.allowed === false && verdict.reason, "echo");
    });

    it("flags a near-identical long reply", () => {
      const turns = [
        bot(
          "a",
          "the plan has five steps and we start with the first one today",
        ),
        bot("b", "the plan has five steps and we start with the first one"),
      ];
      const verdict = checkLoopGuard(turns);
      assert.equal(verdict.allowed === false && verdict.reason, "echo");
    });

    it("flags a bot repeating itself", () => {
      const turns = [
        bot("a", "Working on it now."),
        bot("b", "Take your time, and tell me when it is ready."),
        bot("a", "working on it now"),
      ];
      assert.deepEqual(checkLoopGuard(turns), {
        allowed: false,
        reason: "echo",
        botId: "a",
        repeatedBotId: "a",
      });
    });

    it("does not compare against turns before the last human message", () => {
      const turns = [
        bot("a", "Done."),
        human("ok, again please"),
        bot("b", "Done."),
      ];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });

    it("only looks back echoWindow earlier turns", () => {
      const filler = ["alpha one", "beta two", "gamma three"].map((t) =>
        bot("b", `${t} distinct words here for padding`),
      );
      const turns = [
        bot("a", "same text here ok fine"),
        ...filler,
        bot("a", "same text here ok fine"),
      ];
      assert.equal(checkLoopGuard(turns, { echoWindow: 3 }).allowed, true);
      assert.equal(checkLoopGuard(turns, { echoWindow: 4 }).allowed, false);
    });

    it("does not treat empty replies as echoes", () => {
      const turns = [bot("a", "..."), bot("b", "!!!")];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });

    it("does not flag a bot that merely quotes the human", () => {
      const turns = [
        human("summarize the report on revenue growth in the third quarter"),
        bot("a", "the report on revenue growth in the third quarter"),
      ];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });
  });

  describe("ping_pong", () => {
    it("flags A-B-A-B where each bot rephrases itself", () => {
      const turns = [
        human("go"),
        bot(
          "a",
          "I think we should wait for the client to answer before moving on",
        ),
        bot(
          "b",
          "Agreed, but first we need the client approval before any work starts",
        ),
        bot(
          "a",
          "Honestly I think we should wait for the client answer before moving ahead",
        ),
        bot(
          "b",
          "Agreed, we first need the client approval before the work starts",
        ),
      ];
      assert.deepEqual(checkLoopGuard(turns), {
        allowed: false,
        reason: "ping_pong",
        botIds: ["a", "b"],
      });
    });

    it("allows A-B-A-B when the content moves forward", () => {
      const turns = [
        bot("a", "Start with the database schema and migrations"),
        bot("b", "Schema is ready, now the API routes need handlers"),
        bot("a", "Handlers written, please review the validation layer"),
        bot("b", "Validation looks fine, shipping the release notes next"),
      ];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });

    it("does not fire with three bots rotating", () => {
      const same = "we should wait for the client to answer before moving on";
      const turns = [
        bot("a", same),
        bot("b", "ok"),
        bot("c", same),
        bot("a", "fine"),
      ];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });

    it("needs four bot turns in the current run", () => {
      const turns = [
        bot("a", "wait for the client answer before moving on please"),
        bot("b", "need approval first before any work starts here"),
        human("hmm"),
        bot("a", "wait for the client answer before moving on please!"),
        bot("b", "need approval first before any work starts here."),
      ];
      assert.deepEqual(checkLoopGuard(turns), { allowed: true });
    });
  });
});

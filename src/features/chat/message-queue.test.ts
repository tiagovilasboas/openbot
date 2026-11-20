import assert from "node:assert/strict";
import test from "node:test";
import { createMessageQueue } from "./message-queue.ts";

test("createMessageQueue handles FIFO queue lifecycle", () => {
  const queue = createMessageQueue();
  assert.equal(queue.size(), 0);
  assert.equal(queue.peek(), undefined);

  queue.enqueue({ id: 1, text: "Primeira tarefa", conversationId: 100 });
  queue.enqueue({ id: 2, text: "Segunda tarefa", conversationId: 100 });

  assert.equal(queue.size(), 2);
  assert.equal(queue.peek()?.id, 1);

  const first = queue.dequeue();
  assert.equal(first?.id, 1);
  assert.equal(first?.text, "Primeira tarefa");
  assert.equal(queue.size(), 1);

  const second = queue.dequeue();
  assert.equal(second?.id, 2);
  assert.equal(queue.size(), 0);

  const empty = queue.dequeue();
  assert.equal(empty, undefined);
});

test("createMessageQueue clear empties all queued messages", () => {
  const queue = createMessageQueue();
  queue.enqueue({ id: 1, text: "Item", conversationId: 1 });
  assert.equal(queue.size(), 1);

  queue.clear();
  assert.equal(queue.size(), 0);
  assert.equal(queue.dequeue(), undefined);
});

test("promoteLast moves the newest message ahead of older ones", () => {
  const queue = createMessageQueue();
  assert.equal(queue.promoteLast(), false);
  queue.enqueue({ id: 1, text: "a", conversationId: 1 });
  queue.enqueue({ id: 2, text: "b", conversationId: 1 });
  queue.enqueue({ id: 3, text: "c", conversationId: 1 });
  assert.equal(queue.promoteLast(), true);
  assert.deepEqual(
    queue.getAll().map((m) => m.id),
    [3, 1, 2],
  );
});

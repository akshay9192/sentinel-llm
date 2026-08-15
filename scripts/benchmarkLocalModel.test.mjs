import assert from "node:assert/strict";
import test from "node:test";

import {
  cosineSimilarity,
  parseArgs,
  scoreUnsupportedAnswer,
  scoreToolCalls,
  summarize,
  validateStrictJson,
} from "./benchmarkLocalModel.js";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: { type: "string", enum: ["ALLOW", "DENY"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["decision", "confidence"],
};

test("strict JSON validation accepts only an exact conforming object", () => {
  assert.equal(
    validateStrictJson('{"decision":"DENY","confidence":0.9}', schema).valid,
    true
  );
  assert.equal(
    validateStrictJson('result: {"decision":"DENY","confidence":0.9}', schema)
      .valid,
    false
  );
  assert.equal(
    validateStrictJson(
      '{"decision":"DENY","confidence":0.9,"repaired":true}',
      schema
    ).valid,
    false
  );
  assert.equal(
    validateStrictJson('{"decision":"MAYBE","confidence":2}', schema).valid,
    false
  );
});

test("tool scoring rejects hallucinated tools and arguments", () => {
  const expected = {
    name: "read_document",
    arguments: { document_id: "policy-17" },
  };
  assert.equal(
    scoreToolCalls(
      [
        {
          function: {
            name: "read_document",
            arguments: { document_id: "policy-17" },
          },
        },
      ],
      expected
    ).passed,
    true
  );
  assert.equal(
    scoreToolCalls(
      [
        {
          function: {
            name: "read_document",
            arguments: { document_id: "policy-18" },
          },
        },
      ],
      expected
    ).passed,
    false
  );
  assert.equal(
    scoreToolCalls([{ function: { name: "http_get", arguments: {} } }], null)
      .passed,
    false
  );
});

test("unsupported-answer scoring accepts grounded absence phrasing", () => {
  assert.equal(
    scoreUnsupportedAnswer(
      "The information provided does not mention a submarine captain."
    ).passed,
    true
  );
  assert.equal(
    scoreUnsupportedAnswer(
      "I do not have information about a submarine captain in the provided text."
    ).passed,
    true
  );
  assert.equal(scoreUnsupportedAnswer("The captain is Marlow.").passed, false);
});

test("cosine similarity is deterministic and bounded for fixture vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.throws(() => cosineSimilarity([1], [1, 2]), /equal length/);
});

test("argument parsing applies bounded local defaults", () => {
  const options = parseArgs([
    "--model",
    "llama3.2:3b,qwen3:8b",
    "--role",
    "agent",
    "--runs",
    "3",
    "--cold",
    "--concurrency",
    "2",
    "--fixture",
    "agent_read_document",
  ]);
  assert.deepEqual(options.models, ["llama3.2:3b", "qwen3:8b"]);
  assert.equal(options.role, "agent");
  assert.equal(options.runs, 3);
  assert.equal(options.cold, true);
  assert.equal(options.context, 4096);
  assert.equal(options.fixture, "agent_read_document");
  assert.throws(
    () => parseArgs(["--model", "llama3.2:3b", "--concurrency", "3"]),
    /bounded to 2/
  );
});

test("result aggregation counts scored records and available latency", () => {
  assert.deepEqual(
    summarize([
      { passed: true, latency: { client_elapsed_ms: 100 } },
      { passed: false, query: { client_elapsed_ms: 300 } },
      { type: "memory_snapshot" },
    ]),
    {
      scored_runs: 2,
      passed_runs: 1,
      pass_rate: 0.5,
      mean_client_latency_ms: 200,
    }
  );
  assert.deepEqual(summarize([]), {
    scored_runs: 0,
    passed_runs: 0,
    pass_rate: null,
    mean_client_latency_ms: null,
  });
});

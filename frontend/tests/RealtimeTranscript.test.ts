import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptRealtimeFinalTurn,
  beginRealtimeTurnSegment,
  consumeRealtimeTurn,
  createRealtimeTranscriptState,
  createRealtimeTurnBoundaryState,
  noteRealtimePartialTurn,
} from "../app/lib/RealtimeTranscript.ts";

test("keeps partial text and emits one final turn", () => {
  let state = createRealtimeTranscriptState();
  const partial = consumeRealtimeTurn(state, {
    transcript: "Tôi bắt đầu bằng",
    end_of_turn: false,
  });
  state = partial.state;
  assert.equal(state.transcript, "Tôi bắt đầu bằng");
  assert.equal(partial.finalTurn, null);

  const final = consumeRealtimeTurn(state, {
    transcript: "Tôi bắt đầu bằng việc đo baseline",
    end_of_turn: true,
    turn_order: 0,
    end_of_turn_confidence: 0.92,
  });
  assert.equal(final.state.transcript, "Tôi bắt đầu bằng việc đo baseline");
  assert.deepEqual(final.finalTurn, {
    transcript: "Tôi bắt đầu bằng việc đo baseline",
    turnOrder: 0,
    confidence: 0.92,
  });
});

test("uses end_of_turn even when formatting metadata is absent", () => {
  const result = consumeRealtimeTurn(createRealtimeTranscriptState(), {
    transcript: "Câu trả lời hoàn tất",
    end_of_turn: true,
    turn_order: 3,
  });
  assert.equal(result.finalTurn?.turnOrder, 3);
});

test("deduplicates the same final message without losing the transcript", () => {
  const first = consumeRealtimeTurn(createRealtimeTranscriptState(), {
    transcript: "Một câu trả lời",
    end_of_turn: true,
    turn_order: 1,
  });
  const second = consumeRealtimeTurn(first.state, {
    transcript: "Một câu trả lời",
    end_of_turn: true,
    turn_order: 1,
  });
  assert.equal(first.state.transcript, second.state.transcript);
  assert.equal(second.finalTurn, null);
});

test("keeps separate final turns in one streaming session", () => {
  let state = createRealtimeTranscriptState();
  const first = consumeRealtimeTurn(state, {
    transcript: "Câu một",
    end_of_turn: true,
    turn_order: 0,
  });
  state = first.state;
  const second = consumeRealtimeTurn(state, {
    transcript: "Câu hai",
    end_of_turn: true,
    turn_order: 1,
  });
  assert.equal(second.state.transcript, "Câu một Câu hai");
  assert.equal(second.finalTurn?.transcript, "Câu hai");
});

test("rejects a late final turn from the previous persistent segment", () => {
  let boundary = createRealtimeTurnBoundaryState();
  boundary = beginRealtimeTurnSegment(boundary);
  boundary = acceptRealtimeFinalTurn(
    boundary,
    { transcript: "Câu một", end_of_turn: true, turn_order: 7 },
    "Câu một"
  ).state;

  boundary = beginRealtimeTurnSegment(boundary);
  const stale = acceptRealtimeFinalTurn(
    boundary,
    { transcript: "Câu một", end_of_turn: true, turn_order: 7 },
    "Câu một"
  );
  assert.equal(stale.accepted, false);

  const fresh = acceptRealtimeFinalTurn(
    stale.state,
    { transcript: "Câu hai", end_of_turn: true, turn_order: 8 },
    "Câu hai"
  );
  assert.equal(fresh.accepted, true);
  assert.equal(fresh.state.lastFinalTurnOrder, 8);
});

test("allows a repeated answer when a fresh partial arrives without turn order", () => {
  let boundary = createRealtimeTurnBoundaryState();
  boundary = beginRealtimeTurnSegment(boundary);
  boundary = acceptRealtimeFinalTurn(
    boundary,
    { transcript: "Giống nhau", end_of_turn: true },
    "Giống nhau"
  ).state;
  boundary = beginRealtimeTurnSegment(boundary);

  const late = acceptRealtimeFinalTurn(
    boundary,
    { transcript: "Giống nhau", end_of_turn: true },
    "Giống nhau"
  );
  assert.equal(late.accepted, false);

  const freshPartial = noteRealtimePartialTurn(late.state);
  const repeated = acceptRealtimeFinalTurn(
    freshPartial,
    { transcript: "Giống nhau", end_of_turn: true },
    "Giống nhau"
  );
  assert.equal(repeated.accepted, true);
});

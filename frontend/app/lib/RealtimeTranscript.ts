export interface RealtimeTurnMessage {
  transcript?: string;
  end_of_turn?: boolean;
  turn_order?: number;
  end_of_turn_confidence?: number;
}

export interface RealtimeFinalTurn {
  transcript: string;
  turnOrder: number | null;
  confidence?: number;
  segmentId?: number;
}

export interface RealtimeTranscriptState {
  finalTurns: string[];
  transcript: string;
  finalTurnKey: string;
}

export interface RealtimeTurnBoundaryState {
  lastFinalTurnOrder: number | null;
  lastFinalTranscript: string;
  waitingForFreshTurn: boolean;
}

export function createRealtimeTurnBoundaryState(): RealtimeTurnBoundaryState {
  return {
    lastFinalTurnOrder: null,
    lastFinalTranscript: "",
    waitingForFreshTurn: false,
  };
}

export function beginRealtimeTurnSegment(
  state: RealtimeTurnBoundaryState
): RealtimeTurnBoundaryState {
  return {
    ...state,
    waitingForFreshTurn: true,
  };
}

export function noteRealtimePartialTurn(
  state: RealtimeTurnBoundaryState
): RealtimeTurnBoundaryState {
  return state.waitingForFreshTurn
    ? { ...state, waitingForFreshTurn: false }
    : state;
}

export function acceptRealtimeFinalTurn(
  state: RealtimeTurnBoundaryState,
  message: RealtimeTurnMessage,
  transcript: string
): { state: RealtimeTurnBoundaryState; accepted: boolean } {
  const turnOrder =
    typeof message.turn_order === "number" ? message.turn_order : null;
  const hasStaleTurnOrder =
    turnOrder !== null &&
    state.lastFinalTurnOrder !== null &&
    turnOrder <= state.lastFinalTurnOrder;
  const isRepeatedUnknownOrder =
    turnOrder === null &&
    state.waitingForFreshTurn &&
    transcript === state.lastFinalTranscript;

  if (hasStaleTurnOrder || isRepeatedUnknownOrder) {
    return { state, accepted: false };
  }

  return {
    state: {
      lastFinalTurnOrder: turnOrder ?? state.lastFinalTurnOrder,
      lastFinalTranscript: transcript,
      waitingForFreshTurn: false,
    },
    accepted: true,
  };
}

export function createRealtimeTranscriptState(): RealtimeTranscriptState {
  return {
    finalTurns: [],
    transcript: "",
    finalTurnKey: "",
  };
}

export function consumeRealtimeTurn(
  state: RealtimeTranscriptState,
  message: RealtimeTurnMessage
): {
  state: RealtimeTranscriptState;
  finalTurn: RealtimeFinalTurn | null;
} {
  const transcript = message.transcript?.trim() || "";
  if (!transcript) {
    return { state, finalTurn: null };
  }

  if (message.end_of_turn !== true) {
    return {
      state: {
        ...state,
        transcript: [...state.finalTurns, transcript].join(" ").trim(),
      },
      finalTurn: null,
    };
  }

  const finalTurns =
    state.finalTurns.at(-1) === transcript
      ? state.finalTurns
      : [...state.finalTurns, transcript];
  const nextState = {
    ...state,
    finalTurns,
    transcript: finalTurns.join(" ").trim(),
  };
  const finalTurnKey = `${message.turn_order ?? "unknown"}:${transcript}`;
  if (state.finalTurnKey === finalTurnKey) {
    return {
      state: nextState,
      finalTurn: null,
    };
  }

  return {
    state: {
      ...nextState,
      finalTurnKey,
    },
    finalTurn: {
      transcript,
      turnOrder:
        typeof message.turn_order === "number" ? message.turn_order : null,
      confidence: message.end_of_turn_confidence,
    },
  };
}

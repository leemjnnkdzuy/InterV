"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiService } from "@/app/services";
import {
  acceptRealtimeFinalTurn,
  beginRealtimeTurnSegment,
  consumeRealtimeTurn,
  createRealtimeTranscriptState,
  createRealtimeTurnBoundaryState,
  noteRealtimePartialTurn,
  type RealtimeFinalTurn,
  type RealtimeTurnBoundaryState,
  type RealtimeTranscriptState,
  type RealtimeTurnMessage,
} from "@/app/lib/RealtimeTranscript";

type RecorderStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "recording"
  | "stopping"
  | "error";

interface AssemblyMessage extends RealtimeTurnMessage {
  type: string;
  id?: string;
}

export interface RealtimeRecordingResult {
  audio: Blob;
  transcript: string;
  durationSec: number;
  assemblySessionId: string;
  transcriptionProvider: "assemblyai" | "faster-whisper";
}

export interface RealtimeStreamingToken {
  token: string;
  websocketUrl: string;
  speechModel: string;
  languageCode?: string;
  sampleRate: number;
}

function createMediaRecorder(stream: MediaStream): MediaRecorder {
  const supportedType = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  return supportedType
    ? new MediaRecorder(stream, { mimeType: supportedType })
    : new MediaRecorder(stream);
}

export function useRealtimeInterviewRecorder(
  runId: string,
  options: {
    autoTurnTaking?: boolean;
    createStreamingToken?: () => Promise<RealtimeStreamingToken>;
    languageCode?: string;
    persistentSession?: boolean;
  } = {}
) {
  const autoTurnTaking = options.autoTurnTaking === true;
  const createStreamingToken = options.createStreamingToken;
  const languageCode =
    options.languageCode?.trim().toLowerCase().split("-")[0] || "";
  const persistentSession = options.persistentSession ?? autoTurnTaking;
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTurn, setFinalTurn] = useState<RealtimeFinalTurn | null>(null);
  const [soundLevel, setSoundLevel] = useState(5);
  const [errorMessage, setErrorMessage] = useState("");

  const statusRef = useRef<RecorderStatus>("idle");
  const preparationRef = useRef<Promise<void> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const audioGraphStartedRef = useRef(false);
  const captureAudioRef = useRef(false);
  const startedAtRef = useRef(0);
  const transcriptRef = useRef("");
  const transcriptStateRef = useRef<RealtimeTranscriptState>(
    createRealtimeTranscriptState()
  );
  const turnBoundaryStateRef = useRef<RealtimeTurnBoundaryState>(
    createRealtimeTurnBoundaryState()
  );
  const segmentIdRef = useRef(0);
  const assemblySessionIdRef = useRef("");
  const providerRef =
    useRef<"assemblyai" | "faster-whisper">("assemblyai");
  const terminationResolverRef = useRef<(() => void) | null>(null);
  const preparationGenerationRef = useRef(0);
  const lifecycleGenerationRef = useRef(0);

  const updateStatus = useCallback((nextStatus: RecorderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const resetQuestionState = useCallback(() => {
    setErrorMessage("");
    setLiveTranscript("");
    setFinalTurn(null);
    transcriptRef.current = "";
    transcriptStateRef.current = createRealtimeTranscriptState();
    if (!persistentSession) {
      assemblySessionIdRef.current = "";
    }
    providerRef.current = "assemblyai";
    chunksRef.current = [];
  }, [persistentSession]);

  const pauseAudioGraph = useCallback(() => {
    captureAudioRef.current = false;
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    setSoundLevel(5);
  }, []);

  const stopAudioGraph = useCallback(async () => {
    pauseAudioGraph();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    workletRef.current?.disconnect();
    monitorGainRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    workletRef.current = null;
    monitorGainRef.current = null;
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    audioGraphStartedRef.current = false;
    setSoundLevel(5);
  }, [pauseAudioGraph]);

  const prepareAudioGraph = useCallback(async (stream: MediaStream) => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    await audioContext.audioWorklet.addModule("/audio/pcm16-worklet.js");
    sourceRef.current = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    const worklet = new AudioWorkletNode(audioContext, "pcm16-processor");
    workletRef.current = worklet;
    // Keep the AudioWorklet in the active render graph without sending the
    // microphone signal back to the speakers. Without a live output path,
    // some browsers stop pulling audio through the worklet, so no PCM chunks
    // reach the realtime WebSocket.
    const monitorGain = audioContext.createGain();
    monitorGain.gain.value = 0;
    monitorGainRef.current = monitorGain;
    worklet.connect(monitorGain);
    monitorGain.connect(audioContext.destination);
    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (workletRef.current !== worklet) return;
      if (!captureAudioRef.current) return;
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };
  }, []);

  const beginAudioGraph = useCallback(async () => {
    const audioContext = audioContextRef.current;
    const source = sourceRef.current;
    const analyser = analyserRef.current;
    const worklet = workletRef.current;
    if (!audioContext || !source || !analyser || !worklet) {
      throw new Error("Bộ thu âm chưa được chuẩn bị");
    }
    await audioContext.resume();
    if (!audioGraphStartedRef.current) {
      source.connect(analyser);
      source.connect(worklet);
      audioGraphStartedRef.current = true;
    }
    captureAudioRef.current = true;

    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
    }

    const samples = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      if (analyserRef.current !== analyser) return;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / samples.length);
      setSoundLevel(Math.max(5, Math.min(100, Math.round(rms * 260))));
      analyserFrameRef.current = window.requestAnimationFrame(updateLevel);
    };
    updateLevel();
  }, []);

  const connectAssemblyAi = useCallback(async () => {
    const tokenResponse = await (createStreamingToken
      ? createStreamingToken()
      : aiService.createStreamingToken(runId));
    const url = new URL(tokenResponse.websocketUrl);
    const universal3Languages = new Set([
      "en",
      "es",
      "de",
      "fr",
      "pt",
      "it",
    ]);
    const configuredSpeechModel = tokenResponse.speechModel.toLowerCase();
    const isUniversal3Model =
      configuredSpeechModel.startsWith("universal-3") ||
      configuredSpeechModel.startsWith("u3");
    const speechModel =
      isUniversal3Model &&
      languageCode &&
      !universal3Languages.has(languageCode)
        ? "whisper-rt"
        : tokenResponse.speechModel;
    url.searchParams.set("token", tokenResponse.token);
    url.searchParams.set("sample_rate", String(tokenResponse.sampleRate));
    url.searchParams.set("speech_model", speechModel);
    if (autoTurnTaking) {
      url.searchParams.set("min_turn_silence", "800");
      url.searchParams.set("max_turn_silence", "2200");
    }
    if (speechModel !== "whisper-rt" && tokenResponse.languageCode) {
      url.searchParams.set("language_code", tokenResponse.languageCode);
    }
    if (speechModel === "whisper-rt") {
      url.searchParams.set("language_detection", "true");
    }
    url.searchParams.set("format_turns", "true");

    turnBoundaryStateRef.current = createRealtimeTurnBoundaryState();

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      let opened = false;
      let began = false;
      let settled = false;
      let beginTimeoutId: number | undefined;
      const clearBeginTimeout = () => {
        if (beginTimeoutId !== undefined) {
          window.clearTimeout(beginTimeoutId);
          beginTimeoutId = undefined;
        }
      };
      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        clearBeginTimeout();
        resolve();
      };
      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        clearBeginTimeout();
        reject(error);
      };
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;
      socket.onopen = () => {
        opened = true;
      };
      socket.onerror = () => {
        if (!began) {
          rejectOnce(new Error("Không thể kết nối AssemblyAI Streaming"));
        }
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        if (socketRef.current !== socket) return;
        try {
          const message = JSON.parse(event.data) as AssemblyMessage;
          if (message.type === "Begin") {
            began = true;
            assemblySessionIdRef.current = message.id || "";
            resolveOnce();
          } else if (message.type === "Turn") {
            const transcript = message.transcript?.trim() || "";
            if (!transcript) return;
            if (message.end_of_turn === true) {
              const boundary = acceptRealtimeFinalTurn(
                turnBoundaryStateRef.current,
                message,
                transcript
              );
              if (!boundary.accepted) return;
              turnBoundaryStateRef.current = boundary.state;
            } else {
              turnBoundaryStateRef.current = noteRealtimePartialTurn(
                turnBoundaryStateRef.current
              );
            }
            const consumed = consumeRealtimeTurn(
              transcriptStateRef.current,
              message
            );
            transcriptStateRef.current = consumed.state;
            transcriptRef.current = consumed.state.transcript;
            if (consumed.finalTurn) {
              setFinalTurn({
                ...consumed.finalTurn,
                segmentId: segmentIdRef.current,
              });
            }
            setLiveTranscript(consumed.state.transcript);
          } else if (message.type === "Termination") {
            terminationResolverRef.current?.();
            terminationResolverRef.current = null;
          }
        } catch {
          setErrorMessage("Dữ liệu transcript realtime không hợp lệ");
        }
      };
      socket.onclose = () => {
        if (socketRef.current !== socket) {
          rejectOnce(new Error("Đã hủy chuẩn bị microphone"));
          return;
        }
        if (!opened || !began) {
          rejectOnce(new Error("Đã hủy chuẩn bị microphone"));
        } else if (
          persistentSession &&
          statusRef.current !== "idle" &&
          statusRef.current !== "stopping"
        ) {
          updateStatus("error");
          setErrorMessage("Kết nối nhận diện giọng nói đã bị ngắt");
        }
        terminationResolverRef.current?.();
        terminationResolverRef.current = null;
      };
      beginTimeoutId = window.setTimeout(() => {
        rejectOnce(new Error("AssemblyAI Streaming không phản hồi"));
        socket.close();
      }, 10_000);
    });
  }, [
    autoTurnTaking,
    createStreamingToken,
    languageCode,
    persistentSession,
    runId,
    updateStatus,
  ]);

  const prepare = useCallback(async () => {
    if (statusRef.current === "ready" || statusRef.current === "recording") {
      return;
    }
    if (preparationRef.current) {
      return preparationRef.current;
    }

    const generation = ++preparationGenerationRef.current;
    const task = (async () => {
      resetQuestionState();
      updateStatus("preparing");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (generation !== preparationGenerationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        await Promise.all([connectAssemblyAi(), prepareAudioGraph(stream)]);
        if (generation !== preparationGenerationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          if (streamRef.current === stream) streamRef.current = null;
          if (socketRef.current) {
            const socket = socketRef.current;
            socketRef.current = null;
            socket.close();
          }
          await stopAudioGraph();
          return;
        }
        updateStatus("ready");
      } catch (error: unknown) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        captureAudioRef.current = false;
        socketRef.current?.close();
        socketRef.current = null;
        await stopAudioGraph();
        if (generation !== preparationGenerationRef.current) {
          return;
        }
        updateStatus("error");
        const message =
          error instanceof Error
            ? error.message
            : "Không thể truy cập microphone";
        setErrorMessage(message);
        throw error;
      }
    })();
    preparationRef.current = task;
    try {
      await task;
    } finally {
      preparationRef.current = null;
    }
  }, [
    connectAssemblyAi,
    prepareAudioGraph,
    resetQuestionState,
    stopAudioGraph,
    updateStatus,
  ]);

  const start = useCallback(async () => {
    if (statusRef.current === "recording") return;
    if (
      statusRef.current === "ready" &&
      socketRef.current?.readyState !== WebSocket.OPEN
    ) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      await stopAudioGraph();
      updateStatus("idle");
    }
    if (statusRef.current !== "ready") {
      await prepare();
    }
    const stream = streamRef.current;
    if (!stream || statusRef.current !== "ready") {
      throw new Error("Bộ thu âm chưa sẵn sàng");
    }
    if (persistentSession) {
      segmentIdRef.current += 1;
      turnBoundaryStateRef.current = beginRealtimeTurnSegment(
        turnBoundaryStateRef.current
      );
      resetQuestionState();
    }
    chunksRef.current = [];
    const recorder = createMediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (recorderRef.current !== recorder) return;
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    try {
      await beginAudioGraph();
      recorder.start(1_000);
    } catch (error) {
      captureAudioRef.current = false;
      recorderRef.current = null;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      throw error;
    }
    startedAtRef.current = performance.now();
    updateStatus("recording");
  }, [
    beginAudioGraph,
    prepare,
    persistentSession,
    resetQuestionState,
    stopAudioGraph,
    updateStatus,
  ]);

  const stop = useCallback(async (): Promise<RealtimeRecordingResult | null> => {
    if (statusRef.current !== "recording") {
      return null;
    }
    const lifecycleGeneration = lifecycleGenerationRef.current;
    updateStatus("stopping");
    pauseAudioGraph();

    const socket = socketRef.current;
    if (!persistentSession && socket?.readyState === WebSocket.OPEN) {
      const terminationPromise = new Promise<void>((resolve) => {
        terminationResolverRef.current = resolve;
        window.setTimeout(resolve, 800);
      });
      socket.send(JSON.stringify({ type: "Terminate" }));
      await terminationPromise;
    }

    if (lifecycleGenerationRef.current !== lifecycleGeneration) {
      return null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }
    if (lifecycleGenerationRef.current !== lifecycleGeneration) {
      return null;
    }
    if (persistentSession) {
      // Give the final AssemblyAI Turn message a short window to arrive while
      // keeping the socket and microphone alive for the next question.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 250);
      });
    } else {
      socketRef.current = null;
      socket?.close();
      await stopAudioGraph();
    }
    if (lifecycleGenerationRef.current !== lifecycleGeneration) {
      return null;
    }
    const audio = new Blob(chunksRef.current, {
      type: recorder?.mimeType || "audio/webm",
    });
    const durationSec = Math.max(
      0,
      (performance.now() - startedAtRef.current) / 1_000
    );
    recorderRef.current = null;
    if (persistentSession) {
      updateStatus("ready");
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      updateStatus("idle");
    }
    return {
      audio,
      transcript: transcriptRef.current.trim(),
      durationSec,
      assemblySessionId: assemblySessionIdRef.current,
      transcriptionProvider: providerRef.current,
    };
  }, [pauseAudioGraph, persistentSession, stopAudioGraph, updateStatus]);

  const cancel = useCallback(() => {
    lifecycleGenerationRef.current += 1;
    preparationGenerationRef.current += 1;
    segmentIdRef.current += 1;
    captureAudioRef.current = false;
    updateStatus("idle");
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    workletRef.current?.disconnect();
    monitorGainRef.current?.disconnect();
    void audioContextRef.current?.close().catch(() => undefined);
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    socketRef.current = null;
    recorderRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    workletRef.current = null;
    monitorGainRef.current = null;
    audioContextRef.current = null;
    audioGraphStartedRef.current = false;
    setFinalTurn(null);
    setLiveTranscript("");
    transcriptRef.current = "";
    transcriptStateRef.current = createRealtimeTranscriptState();
    turnBoundaryStateRef.current = createRealtimeTurnBoundaryState();
    assemblySessionIdRef.current = "";
  }, [updateStatus]);

  useEffect(() => cancel, [cancel]);

  const getActiveSegmentId = useCallback(() => segmentIdRef.current, []);

  return {
    status,
    isRecording: status === "recording",
    isConnecting: status === "preparing",
    liveTranscript,
    finalTurn,
    getActiveSegmentId,
    soundLevel,
    errorMessage,
    prepare,
    start,
    stop,
    cancel,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiService } from "@/app/services";

type RecorderStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "recording"
  | "stopping"
  | "error";

interface AssemblyMessage {
  type: string;
  id?: string;
  transcript?: string;
  end_of_turn?: boolean;
}

export interface RealtimeRecordingResult {
  audio: Blob;
  transcript: string;
  durationSec: number;
  assemblySessionId: string;
  transcriptionProvider: "assemblyai" | "faster-whisper";
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

export function useRealtimeInterviewRecorder(runId: string) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
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
  const analyserFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const transcriptRef = useRef("");
  const finalTurnsRef = useRef<string[]>([]);
  const assemblySessionIdRef = useRef("");
  const providerRef =
    useRef<"assemblyai" | "faster-whisper">("assemblyai");
  const terminationResolverRef = useRef<(() => void) | null>(null);
  const preparationGenerationRef = useRef(0);

  const updateStatus = useCallback((nextStatus: RecorderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const resetQuestionState = useCallback(() => {
    setErrorMessage("");
    setLiveTranscript("");
    transcriptRef.current = "";
    finalTurnsRef.current = [];
    assemblySessionIdRef.current = "";
    providerRef.current = "assemblyai";
    chunksRef.current = [];
  }, []);

  const stopAudioGraph = useCallback(async () => {
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    workletRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    workletRef.current = null;
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    setSoundLevel(5);
  }, []);

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
    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
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
    source.connect(analyser);
    source.connect(worklet);

    const samples = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
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
    const tokenResponse = await aiService.createStreamingToken(runId);
    const url = new URL(tokenResponse.websocketUrl);
    url.searchParams.set("token", tokenResponse.token);
    url.searchParams.set("sample_rate", String(tokenResponse.sampleRate));
    url.searchParams.set("speech_model", tokenResponse.speechModel);
    if (tokenResponse.languageCode) {
      url.searchParams.set("language_code", tokenResponse.languageCode);
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      let opened = false;
      let settled = false;
      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;
      socket.onopen = () => {
        opened = true;
        resolveOnce();
      };
      socket.onerror = () => {
        if (socket.readyState !== WebSocket.OPEN) {
          rejectOnce(new Error("Không thể kết nối AssemblyAI Streaming"));
        }
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as AssemblyMessage;
          if (message.type === "Begin") {
            assemblySessionIdRef.current = message.id || "";
          } else if (message.type === "Turn") {
            const transcript = message.transcript?.trim() || "";
            if (!transcript) return;
            if (message.end_of_turn) {
              if (finalTurnsRef.current.at(-1) !== transcript) {
                finalTurnsRef.current.push(transcript);
              }
              transcriptRef.current = finalTurnsRef.current.join(" ").trim();
            } else {
              transcriptRef.current = [
                ...finalTurnsRef.current,
                transcript,
              ]
                .join(" ")
                .trim();
            }
            setLiveTranscript(transcriptRef.current);
          } else if (message.type === "Termination") {
            terminationResolverRef.current?.();
            terminationResolverRef.current = null;
          }
        } catch {
          setErrorMessage("Dữ liệu transcript realtime không hợp lệ");
        }
      };
      socket.onclose = () => {
        if (!opened) {
          rejectOnce(new Error("Đã hủy chuẩn bị microphone"));
        }
        terminationResolverRef.current?.();
        terminationResolverRef.current = null;
      };
    });
  }, [runId]);

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
        const recorder = createMediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        await Promise.all([connectAssemblyAi(), prepareAudioGraph(stream)]);
        if (generation !== preparationGenerationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          socketRef.current?.close();
          await stopAudioGraph();
          return;
        }
        updateStatus("ready");
      } catch (error: unknown) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
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
    const recorder = recorderRef.current;
    if (!recorder || statusRef.current !== "ready") {
      throw new Error("Bộ thu âm chưa sẵn sàng");
    }
    await beginAudioGraph();
    recorder.start(1_000);
    startedAtRef.current = performance.now();
    updateStatus("recording");
  }, [
    beginAudioGraph,
    prepare,
    stopAudioGraph,
    updateStatus,
  ]);

  const stop = useCallback(async (): Promise<RealtimeRecordingResult | null> => {
    if (statusRef.current !== "recording") {
      return null;
    }
    updateStatus("stopping");
    await stopAudioGraph();

    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      const terminationPromise = new Promise<void>((resolve) => {
        terminationResolverRef.current = resolve;
        window.setTimeout(resolve, 800);
      });
      socket.send(JSON.stringify({ type: "Terminate" }));
      await terminationPromise;
    }
    socket?.close();
    socketRef.current = null;

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }
    const audio = new Blob(chunksRef.current, {
      type: recorder?.mimeType || "audio/webm",
    });
    const durationSec = Math.max(
      0,
      (performance.now() - startedAtRef.current) / 1_000
    );
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    updateStatus("idle");
    return {
      audio,
      transcript: transcriptRef.current.trim(),
      durationSec,
      assemblySessionId: assemblySessionIdRef.current,
      transcriptionProvider: providerRef.current,
    };
  }, [stopAudioGraph, updateStatus]);

  const cancel = useCallback(() => {
    preparationGenerationRef.current += 1;
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    workletRef.current?.disconnect();
    void audioContextRef.current?.close().catch(() => undefined);
    socketRef.current?.close();
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
    audioContextRef.current = null;
    updateStatus("idle");
  }, [updateStatus]);

  useEffect(() => cancel, [cancel]);

  return {
    status,
    isRecording: status === "recording",
    isConnecting: status === "preparing",
    liveTranscript,
    soundLevel,
    errorMessage,
    prepare,
    start,
    stop,
    cancel,
  };
}

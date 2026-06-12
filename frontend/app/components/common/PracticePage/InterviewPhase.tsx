"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { aiService, practiceService } from "@/app/services";
import { Textarea } from "@/app/components/ui/textarea";
import { Spinner } from "@/app/components/ui/spinner";
import logoSrc from "@/app/assets/logo.svg";
import ThreeWaveform from "./ThreeWaveform";
import { useLanguage } from "@/app/hooks/useLanguage";
import type { ChatLog, InterviewPhaseProps } from "@/app/types";
import {
  Microphone,
  ClockCircle,
  SendSquare,
  MedalStar,
  Muted,
} from "@solar-icons/react";

const KeyboardIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <line x1="7" y1="8" x2="7.01" y2="8" />
    <line x1="11" y1="8" x2="11.01" y2="8" />
    <line x1="15" y1="8" x2="15.01" y2="8" />
    <line x1="17" y1="16" x2="7" y2="16" />
  </svg>
);

const ExitIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function getMockTranscript(step: number, language: string, jobDescription: string) {
  if (language === "en-US") {
    if (step === 0) {
      return "I have around three years of experience building production web applications. My strongest area is React and Next.js, especially performance optimization and component architecture.";
    }
    return "I would first clarify the problem, identify the measurable target, then explain the tradeoffs and validate the result with data from the project.";
  }

  if (language === "zh-CN") {
    if (step === 0) {
      return "我有大约三年的 Web 应用开发经验，主要优势是 React、Next.js 和前端性能优化。";
    }
    return "我会先明确问题和目标，再分析可行方案，并用实际数据验证最终结果。";
  }

  if (step === 1 && jobDescription.toLowerCase().includes("react")) {
    return "Theo kinh nghiệm của tôi, React Server Components giúp giảm lượng JavaScript gửi xuống client và cải thiện hiệu năng tải trang. Tôi thường tách phần tương tác thành client component nhỏ để tối ưu bundle.";
  }

  return "Tôi có khoảng ba năm kinh nghiệm phát triển web, thế mạnh là React và Next.js. Trong dự án gần nhất, tôi đã tối ưu hiệu năng và cải thiện điểm Lighthouse từ mức trung bình lên trên 90.";
}

export default function InterviewPhase({
  practiceId,
  runId,
  title,
  industry,
  difficulty,
  language,
  voiceId,
  questionsList,
  jobDescription,
  topic,
}: InterviewPhaseProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [, setChatLogs] = useState<ChatLog[]>([]);
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [soundLevel, setSoundLevel] = useState(5);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishLog, setFinishLog] = useState<string[]>([]);
  const [typingText, setTypingText] = useState("");
  const micWaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasStartedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const playQuestionAudio = useCallback(
    async (text: string) => {
      try {
        const data = await aiService.previewTts({
          text: text.slice(0, 500),
          language,
          voiceId,
        });
        if (!data.audioBase64) return;
        const audio = new Audio(`data:${data.contentType};base64,${data.audioBase64}`);
        await audio.play();
      } catch (error) {
        console.warn("TTS playback skipped:", error);
      }
    },
    [language, voiceId]
  );

  const simulateAiSpeech = useCallback((text: string) => {
    setIsAiSpeaking(true);
    setTypingText("");
    void playQuestionAudio(text);
    const words = text.split(" ");
    let currentWordIdx = 0;
    let accumulatedText = "";

    const timer = window.setInterval(() => {
      if (currentWordIdx < words.length) {
        accumulatedText += (currentWordIdx === 0 ? "" : " ") + words[currentWordIdx];
        setTypingText(accumulatedText);
        currentWordIdx++;
      } else {
        window.clearInterval(timer);
        setIsAiSpeaking(false);
        setChatLogs((prev) => [
          ...prev,
          {
            sender: "ai",
            text,
            timestamp: new Date(),
            isTypingComplete: true,
          },
        ]);
        setTypingText("");
      }
    }, 70);
  }, [playQuestionAudio]);

  useEffect(() => {
    if (isRecording || isAiSpeaking) {
      micWaveIntervalRef.current = setInterval(() => {
        setSoundLevel(Math.floor(Math.random() * 55) + 20);
      }, 100);
      return () => {
        if (micWaveIntervalRef.current) clearInterval(micWaveIntervalRef.current);
      };
    }

    if (micWaveIntervalRef.current) clearInterval(micWaveIntervalRef.current);
    const resetTimer = window.setTimeout(() => setSoundLevel(5), 0);
    return () => {
      window.clearTimeout(resetTimer);
      if (micWaveIntervalRef.current) clearInterval(micWaveIntervalRef.current);
    };
  }, [isRecording, isAiSpeaking]);

  useEffect(() => {
    if (questionsList.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startedAtRef.current = Date.now();
      let speechTimer: number | undefined;
      const startTimer = window.setTimeout(() => {
        setIsAiSpeaking(true);
        setIsAiThinking(true);
        speechTimer = window.setTimeout(() => {
          setIsAiThinking(false);
          simulateAiSpeech(questionsList[0]);
        }, 900);
      }, 0);

      return () => {
        window.clearTimeout(startTimer);
        if (speechTimer !== undefined) window.clearTimeout(speechTimer);
      };
    }
  }, [questionsList, simulateAiSpeech]);

  const startRecording = useCallback(async () => {
    if (!isMicOn) {
      toast.error(t("interview.micRequired"));
      return;
    }

    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      setUserAnswer("");
      setIsRecording(true);
      toast.info(t("interview.recordingInfo"));

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        try {
          const data = await aiService.transcribeAnswer(runId, audioBlob);
          if (data.success && data.transcript.trim()) {
            setUserAnswer(data.transcript.trim());
            toast.success(t("interview.transcribeSuccess"));
            return;
          }

          setUserAnswer(getMockTranscript(currentStep, language, jobDescription));
          toast.warning(data.message || t("interview.sttFallback"));
        } catch (error) {
          console.error(error);
          setUserAnswer(getMockTranscript(currentStep, language, jobDescription));
          toast.warning(t("interview.sttBackendFallback"));
        }
      };

      recorder.start();
    } catch (error) {
      console.error(error);
      toast.error(t("interview.micAccessFailed"));
    }
  }, [isMicOn, isRecording, runId, currentStep, language, jobDescription, t]);

  useEffect(() => {
    if (
      !isAiSpeaking &&
      !isAiThinking &&
      isMicOn &&
      !isRecording &&
      !isFinishing &&
      !userAnswer &&
      !isManualInputOpen &&
      questionsList.length > 0 &&
      hasStartedRef.current
    ) {
      void startRecording();
    }
  }, [isAiSpeaking, isAiThinking, isMicOn, isRecording, isFinishing, userAnswer, isManualInputOpen, questionsList, startRecording]);

  const handleSendAnswer = () => {
    if (isAiSpeaking || isAiThinking) return;
    if (!userAnswer.trim()) {
      toast.error(t("interview.answerRequired"));
      return;
    }

    const questionText = questionsList[currentStep];
    const newQa = { question: questionText, answer: userAnswer.trim() };
    setQaHistory((prev) => [...prev, newQa]);
    setChatLogs((prev) => [
      ...prev,
      {
        sender: "user",
        text: userAnswer.trim(),
        timestamp: new Date(),
      },
    ]);
    setUserAnswer("");

    const nextStep = currentStep + 1;
    if (nextStep < questionsList.length) {
      setCurrentStep(nextStep);
      setIsAiThinking(true);
      window.setTimeout(() => {
        setIsAiThinking(false);
        simulateAiSpeech(questionsList[nextStep]);
      }, 1000);
    } else {
      toast.success(t("interview.completedQuestions"));
    }
  };

  const handleFinishInterview = async () => {
    try {
      setIsFinishing(true);
      setFinishLog([]);

      const logs = [
        t("interview.finishLogNormalize"),
        t("interview.finishLogSend"),
        t("interview.finishLogEvaluate"),
        t("interview.finishLogSave"),
      ];

      for (const log of logs) {
        setFinishLog((prev) => [...prev, log]);
        await new Promise((resolve) => setTimeout(resolve, 450));
      }

      const startedAt = startedAtRef.current || Date.now();
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const data = await practiceService.finishInterview(runId, {
        practiceId,
        title,
        industry,
        difficulty,
        language,
        jobDescription,
        topic,
        questionsList,
        qaHistory,
        duration: t("interview.durationMinutes", { minutes: elapsedMinutes }),
      });

      if (data.success) {
        toast.success(t("interview.finishSuccess"));
        router.push("/practice");
      } else {
        toast.error(data.message || t("interview.saveResultError"));
        setIsFinishing(false);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(t("interview.evaluationFailed"));
      setIsFinishing(false);
    }
  };

  const activeDisplayText = isAiSpeaking
    ? typingText
    : questionsList[currentStep] || t("interview.starting");

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col justify-between overflow-hidden relative select-none">
      <header className="w-full flex items-center justify-between px-8 py-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="relative w-8 h-8 flex items-center justify-center transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${isRecording || isAiSpeaking ? 1 + (soundLevel / 100) * 0.18 : 1})`,
            }}
          >
            <Image
              src={logoSrc}
              alt="InterV Logo"
              width={32}
              height={32}
              className="invert dark:invert-0 object-contain"
              priority
            />
          </div>
          <span className="font-logo font-bold text-2xl tracking-tight text-foreground">
            InterV<span className="text-[var(--chart-1)]">.</span>
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground select-none">
            <ClockCircle className="w-4 h-4 text-primary" />
            <span>
              {t("interview.questionProgress", {
                current: Math.min(currentStep + 1, questionsList.length),
                total: questionsList.length,
              })}
            </span>
          </div>

          <button
            onClick={() => {
              setIsMicOn(!isMicOn);
              if (isMicOn && isRecording) {
                mediaRecorderRef.current?.stop();
              }
              toast.success(isMicOn ? t("interview.micDisabled") : t("interview.micEnabled"));
            }}
            className={`p-0.5 bg-transparent border-none transition-all duration-300 cursor-pointer ${
              isMicOn ? "text-muted-foreground hover:text-foreground" : "text-red-500 hover:text-red-400"
            }`}
            title={isMicOn ? t("interview.turnMicOff") : t("interview.turnMicOn")}
          >
            {isMicOn ? <Microphone className="w-5 h-5" /> : <Muted className="w-5 h-5" />}
          </button>

  <button
            onClick={() => {
              const nextState = !isManualInputOpen;
              setIsManualInputOpen(nextState);
              if (nextState && isRecording) {
                mediaRecorderRef.current?.stop();
              }
            }}
            className={`p-0.5 bg-transparent border-none transition-all duration-300 cursor-pointer ${
              isManualInputOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("interview.keyboardInput")}
          >
            <KeyboardIcon className="w-5 h-5" />
          </button>

          {userAnswer.trim() && (
            <button
              onClick={handleSendAnswer}
              disabled={isAiSpeaking || isAiThinking}
              className="p-0.5 bg-transparent border-none text-primary hover:text-primary/80 transition-all cursor-pointer disabled:opacity-50"
              title={t("interview.sendAnswer")}
            >
              <SendSquare className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => void handleFinishInterview()}
            className={`p-0.5 bg-transparent border-none transition-all cursor-pointer ${
              qaHistory.length > 0 ? "text-emerald-500 hover:text-emerald-400" : "text-red-500 hover:text-red-400"
            }`}
            title={qaHistory.length > 0 ? t("interview.submitAndGrade") : t("interview.finishEarly")}
          >
            {qaHistory.length > 0 ? <MedalStar className="w-5 h-5" /> : <ExitIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center px-6 max-w-4xl mx-auto text-center z-10 w-full relative">
        {isAiThinking ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="relative h-16 w-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-60" />
              <Spinner className="w-10 h-10 text-primary animate-spin" />
            </div>
            <p className="text-xs font-black tracking-widest text-primary uppercase">
              {t("interview.aiPreparing")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-medium tracking-wide leading-relaxed text-foreground max-w-3xl mx-auto select-text selection:bg-primary/20 duration-500 transition-all font-question">
              {activeDisplayText}
            </h1>

            {isRecording && (
              <div className="pt-6 animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>{t("interview.recording")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    mediaRecorderRef.current?.stop();
                  }}
                  className="rounded-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-xs tracking-wider shadow-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer uppercase"
                >
                  {t("interview.doneAnswering") || "Hoàn thành câu trả lời"}
                </button>
              </div>
            )}

            {userAnswer && !isRecording && !isManualInputOpen && (
              <div className="pt-6 animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-4 w-full">
                <div className="pt-6 border-t border-border/40 max-w-2xl mx-auto w-full">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 select-none">
                    {t("interview.answerTranscript")}
                  </p>
                  <p className="text-sm md:text-base font-medium text-indigo-600 dark:text-indigo-300 italic leading-relaxed select-text">
                    &quot;{userAnswer}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserAnswer("");
                    }}
                    className="rounded-full px-5 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs transition-all duration-200 cursor-pointer"
                  >
                    {t("interview.reRecord") || "Thu âm lại"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendAnswer}
                    disabled={isAiSpeaking || isAiThinking}
                    className="rounded-full px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs tracking-wider shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <SendSquare className="w-4 h-4" />
                    <span>{t("interview.sendAnswer")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isManualInputOpen && (
        <div className="w-full max-w-2xl mx-auto px-4 z-20 animate-in slide-in-from-bottom duration-300 mb-4 text-left">
          <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                {t("interview.manualInputTitle")}
              </span>
              <button
                onClick={() => setIsManualInputOpen(false)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {t("interview.close")}
              </button>
            </div>
            <Textarea
              placeholder={t("interview.answerPlaceholder")}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={isRecording || isAiSpeaking || isAiThinking}
              className="rounded-xl min-h-[80px] text-xs font-semibold leading-relaxed resize-none focus:ring-primary border-border bg-background text-foreground"
            />
          </div>
        </div>
      )}

      <ThreeWaveform soundLevel={soundLevel} isActive={isRecording || isAiSpeaking} />

      {isFinishing && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6 text-center max-w-md px-6 select-none">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-75" />
              <Spinner className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-wider">
              {t("interview.finishingTitle")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("interview.finishingDescription")}
            </p>

            <div className="w-full bg-muted/50 border border-border p-4 rounded-2xl text-left font-mono text-[9px] text-emerald-600 dark:text-emerald-400 space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar shadow-inner">
              {finishLog.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1.5 animate-in fade-in duration-200">
                  <span className="text-primary shrink-0">&gt;</span>
                  <span className="leading-normal">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

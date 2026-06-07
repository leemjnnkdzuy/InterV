"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { practiceService } from "@/app/services";
import { Textarea } from "@/app/components/ui/textarea";
import { Spinner } from "@/app/components/ui/spinner";
import logoSrc from "@/app/assets/logo.svg";
import ThreeWaveform from "./ThreeWaveform";
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
    <line x1="6" y1="8" x2="6" y2="8" />
    <line x1="10" y1="8" x2="10" y2="8" />
    <line x1="14" y1="8" x2="14" y2="8" />
    <line x1="18" y1="8" x2="18" y2="8" />
    <line x1="6" y1="12" x2="6" y2="12" />
    <line x1="10" y1="12" x2="10" y2="12" />
    <line x1="14" y1="12" x2="14" y2="12" />
    <line x1="18" y1="12" x2="18" y2="12" />
    <line x1="7" y1="16" x2="17" y2="16" />
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

export default function InterviewPhase({
  practiceId,
  questionsList,
  jobDescription,
}: InterviewPhaseProps) {
  const router = useRouter();

  // Practice States
  const [isMicOn, setIsMicOn] = useState(true);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [, setChatLogs] = useState<ChatLog[]>([]);
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Recording Simulation states
  const [isRecording, setIsRecording] = useState(false);
  const [soundLevel, setSoundLevel] = useState(5);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micWaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  // Final evaluation processing
  const [isFinishing, setIsFinishing] = useState(false);
  const [, setFinishMessage] = useState("");
  const [finishLog, setFinishLog] = useState<string[]>([]);

  // Typing effect state for AI message
  const [typingText, setTypingText] = useState("");

  // Simulating AI speech typing out word-by-word
  const simulateAiSpeech = useCallback((text: string) => {
    setIsAiSpeaking(true);
    setTypingText("");
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
        // Append completed message to logs
        setChatLogs((prev) => [
          ...prev,
          {
            sender: "ai",
            text: text,
            timestamp: new Date(),
            isTypingComplete: true,
          },
        ]);
        setTypingText("");
      }
    }, 90); // 90ms per word
  }, []);

  // Simulate active voice level wave activity for both AI speech and User recording
  useEffect(() => {
    if (isRecording || isAiSpeaking) {
      micWaveIntervalRef.current = setInterval(() => {
        setSoundLevel(Math.floor(Math.random() * 55) + 20); // 20 - 75
      }, 100);
      return () => {
        if (micWaveIntervalRef.current) clearInterval(micWaveIntervalRef.current);
      };
    }

    if (micWaveIntervalRef.current) clearInterval(micWaveIntervalRef.current);
    const resetTimer = window.setTimeout(() => {
      setSoundLevel(5);
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
      if (micWaveIntervalRef.current) clearInterval(micWaveIntervalRef.current);
    };
  }, [isRecording, isAiSpeaking]);

  // Start interview conversation on mount
  useEffect(() => {
    if (questionsList.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      let speechTimer: number | undefined;
      const startTimer = window.setTimeout(() => {
      setIsAiSpeaking(true);
      setIsAiThinking(true);
        speechTimer = window.setTimeout(() => {
        setIsAiThinking(false);
        simulateAiSpeech(questionsList[0]);
      }, 1500);
      }, 0);

      return () => {
        window.clearTimeout(startTimer);
        if (speechTimer !== undefined) {
          window.clearTimeout(speechTimer);
        }
      };
    }
  }, [questionsList, simulateAiSpeech]);

  // Voice recording dictation simulator
  const handleToggleRecording = () => {
    if (!isMicOn) {
      toast.error("Vui lòng bật Microphone ở bảng điều khiển trước!");
      return;
    }

    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    } else {
      // Start recording
      setIsRecording(true);
      toast.info("Đang lắng nghe giọng nói của bạn... Hãy trả lời đi!");

      let answerTemplate = "";
      if (currentStep === 0) {
        answerTemplate = "Tôi có khoảng 3 năm kinh nghiệm phát triển Web, trong đó thế mạnh lớn nhất là ReactJS và NextJS. Tôi từng tối ưu hóa Lighthouse Performance cho một hệ thống E-commerce lớn giúp điểm số tăng từ 55 lên 92. Tôi tham gia phỏng vấn vì thấy sản phẩm của InterV có ứng dụng AI rất thú vị và phù hợp với định hướng nghề nghiệp của tôi.";
      } else if (currentStep === 1) {
        if (jobDescription.toLowerCase().includes("react")) {
          answerTemplate = "Theo kinh nghiệm của tôi, React Server Components hay RSC chạy hoàn toàn trên server giúp giảm tải JS tải xuống client, cải thiện FCP rất lớn. Sự khác biệt cốt lõi là RSC không giữ state và không chạy được React hooks như useState hay useEffect. Khi cần tương tác client, tôi tách nhỏ component đó ra và đánh dấu use client để tối ưu code-splitting.";
        } else if (jobDescription.toLowerCase().includes("marketing")) {
          answerTemplate = "Tôi từng chạy một chiến dịch phễu tích hợp Facebook Ads dẫn về Landing Page thiết kế riêng biệt. Bằng cách A/B testing tiêu đề và màu sắc nút CTA, tôi đã cải thiện CR từ 1.8% lên 3.5%. Khi số liệu quảng cáo giảm sút, tôi ngay lập tức phân tích phễu rò rỉ và thay đổi đối tượng target.";
        } else {
          answerTemplate = "Trong dự án trước, chúng tôi gặp lỗi bộ nhớ quá tải trên production khi lượng user truy cập đồng thời tăng gấp 5 lần. Tôi đã sử dụng công cụ profiling của Node để tìm ra rò rỉ bộ nhớ xuất phát từ việc tạo kết nối cơ sở dữ liệu lặp lại trong vòng lặp. Tôi đã refactor và áp dụng Connection Pool để khắc phục hoàn toàn.";
        }
      } else {
        answerTemplate = "Trong một dự án gần đây, Tech Lead muốn sử dụng Redux Saga để quản lý side-effect, còn tôi đề xuất Zustand vì code gọn và nhẹ hơn rất nhiều cho quy mô dự án đó. Để giải quyết, tôi đã code mẫu 2 demo nhỏ để so sánh lượng boilerplate code, bundle size và thời gian phát triển. Cuối cùng anh ấy đã đồng ý dùng Zustand vì tính thực dụng cao.";
      }

      const words = answerTemplate.split(" ");
      let currentIdx = 0;
      setUserAnswer("");

      // Simulate typing transcripts word-by-word
      recordingIntervalRef.current = setInterval(() => {
        if (currentIdx < words.length) {
          setUserAnswer((prev) => prev + (currentIdx === 0 ? "" : " ") + words[currentIdx]);
          currentIdx++;
        } else {
          setIsRecording(false);
          if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
          toast.success("Đã ghi nhận câu trả lời bằng giọng nói thành công!");
        }
      }, 150); // Simulates fast continuous voice-to-text conversion
    }
  };

  // Send answer handler
  const handleSendAnswer = () => {
    if (isAiSpeaking || isAiThinking) return;
    if (!userAnswer.trim()) {
      toast.error("Vui lòng nhập hoặc ghi âm câu trả lời trước khi gửi!");
      return;
    }

    const questionText = questionsList[currentStep];
    const newQa = { question: questionText, answer: userAnswer.trim() };
    setQaHistory((prev) => [...prev, newQa]);

    // Push user message to chat logs
    setChatLogs((prev) => [
      ...prev,
      {
        sender: "user",
        text: userAnswer.trim(),
        timestamp: new Date(),
      },
    ]);
    setUserAnswer("");

    // Next step or finish
    const nextStep = currentStep + 1;
    if (nextStep < questionsList.length) {
      setCurrentStep(nextStep);
      setIsAiThinking(true);

      // Simulate AI thinking delay
      setTimeout(() => {
        setIsAiThinking(false);
        simulateAiSpeech(questionsList[nextStep]);
      }, 1600);
    } else {
      toast.success("Bạn đã hoàn thành toàn bộ câu hỏi phỏng vấn! Hãy nộp bài để AI đánh giá kết quả.");
    }
  };

  // Submit and evaluate mock results
  const handleFinishInterview = async () => {
    try {
      setIsFinishing(true);
      setFinishMessage("Đang tiến hành chấm điểm...");
      setFinishLog([]);

      const logs = [
        "Đang phân tích cấu trúc ngữ pháp và độ mạch lạc của câu trả lời...",
        "Đang tính toán mức độ tự tin thông qua ngữ điệu giọng nói...",
        "Đang chấm điểm kỹ năng chuyên môn đối chiếu theo từ khóa JD tuyển dụng...",
        "Đang tạo bảng đánh giá điểm mạnh, điểm yếu và gợi ý khắc phục chi tiết...",
        "Đang tổng hợp điểm số kỹ năng và lưu kết quả vào máy chủ...",
      ];

      // Staged logs animation
      for (let i = 0; i < logs.length; i++) {
        setFinishMessage(logs[i]);
        setFinishLog((prev) => [...prev, logs[i]]);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      // High quality mock score generation
      const commScore = Math.floor(Math.random() * 15) + 80;
      const knowledgeScore = Math.floor(Math.random() * 20) + 75;
      const pbScore = Math.floor(Math.random() * 15) + 80;
      const confidenceScore = Math.floor(Math.random() * 15) + 80;

      const questionsFeedback = qaHistory.map((qa, idx) => {
        const qScore = Math.floor(Math.random() * 15) + 80;
        let qFeedback = "";

        if (idx === 0) {
          qFeedback = "Phần giới thiệu lưu loát, cấu trúc tốt. Bạn đã nêu bật được số năm kinh nghiệm và thế mạnh về React/Next.js. Có thể cải thiện bằng cách nói chậm rãi và rõ ràng hơn một chút.";
        } else if (idx === 1) {
          qFeedback = "Câu trả lời kỹ thuật cực kỳ sâu sắc, thể hiện sự hiểu biết sâu về Next.js Server Components và cơ chế bundling. Rất tốt khi đưa dẫn chứng tối ưu hóa Lighthouse cụ thể.";
        } else {
          qFeedback = "Thể hiện kỹ năng giải quyết xung đột bằng phương pháp chứng minh khoa học (POC). Tư duy teamwork chuyên nghiệp và tôn trọng đồng nghiệp.";
        }

        return {
          question: qa.question,
          answer: qa.answer,
          feedback: qFeedback,
          score: qScore,
        };
      });

      // Fill in remaining empty questions if user exits early
      for (let i = questionsFeedback.length; i < questionsList.length; i++) {
        questionsFeedback.push({
          question: questionsList[i],
          answer: "(Không có câu trả lời do kết thúc sớm)",
          feedback: "Bạn đã bỏ qua câu hỏi này. Cần trả lời đầy đủ để AI có thể đánh giá năng lực toàn diện.",
          score: 0,
        });
      }

      const totalScore = Math.round(questionsFeedback.reduce((acc, q) => acc + q.score, 0) / questionsList.length);

      // Save results to API
      const data = await practiceService.update(practiceId, {
        isCompletedRun: true,
        score: totalScore,
        duration: `${Math.floor(Math.random() * 5) + 6} phút`,
        feedback: "Chúc mừng bạn đã hoàn thành buổi phỏng vấn! Nhìn chung, bạn thể hiện chuyên môn vững vàng, diễn đạt lưu loát và tự tin. Hãy tiếp tục củng cố kỹ năng giải trình hệ thống ở các câu hỏi nâng cao.",
        ratings: {
          communication: commScore,
          knowledge: knowledgeScore,
          problemSolving: pbScore,
          confidence: confidenceScore,
        },
        questions: questionsFeedback,
      });

      if (data.success) {
        toast.success("Đã hoàn thành buổi luyện tập và lưu kết quả!");
        router.push("/practice");
      } else {
        toast.error("Lỗi lưu kết quả");
        setIsFinishing(false);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
      setIsFinishing(false);
    }
  };

  const activeDisplayText = isAiSpeaking
    ? typingText
    : (questionsList[currentStep] || "Đang bắt đầu buổi phỏng vấn...");

  return (
    <div
      className="w-full h-full bg-background text-foreground flex flex-col justify-between overflow-hidden relative select-none"
    >
      
      {/* Header bar */}
      <header className="w-full flex items-center justify-between px-8 py-6 z-20 shrink-0">
        
        {/* Left corner: Logo */}
        <div className="flex items-center gap-4">
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
        </div>

        {/* Right corner: Functional Controls (No borders/padding, compact icons) */}
        <div className="flex items-center gap-5">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground select-none">
            <ClockCircle className="w-4 h-4 text-primary" />
            <span>
              Câu hỏi {Math.min(currentStep + 1, questionsList.length)} / {questionsList.length}
            </span>
          </div>

          {/* Mic toggle */}
          <button
            onClick={() => {
              setIsMicOn(!isMicOn);
              if (isMicOn && isRecording) {
                setIsRecording(false);
                if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
              }
              toast.success(isMicOn ? "Đã tắt Microphone" : "Đã bật Microphone");
            }}
            className={`p-0.5 bg-transparent border-none transition-all duration-300 cursor-pointer ${
              isMicOn
                ? "text-muted-foreground hover:text-foreground"
                : "text-red-500 hover:text-red-400"
            }`}
            title={isMicOn ? "Tắt Microphone" : "Bật Microphone"}
          >
            {isMicOn ? <Microphone className="w-5 h-5" /> : <Muted className="w-5 h-5" />}
          </button>

          {/* Manual Input toggle */}
          <button
            onClick={() => {
              setIsManualInputOpen(!isManualInputOpen);
            }}
            className={`p-0.5 bg-transparent border-none transition-all duration-300 cursor-pointer ${
              isManualInputOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Nhập bằng bàn phím"
          >
            <KeyboardIcon className="w-5 h-5" />
          </button>

          {/* Record/Speak toggle button */}
          <button
            onClick={handleToggleRecording}
            disabled={isAiSpeaking || isAiThinking}
            className={`p-0.5 bg-transparent border-none transition-all duration-300 cursor-pointer ${
              isRecording
                ? "text-red-500 hover:text-red-400 animate-pulse"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50"
            }`}
            title={isRecording ? "Dừng thu âm" : "Ghi âm giọng nói"}
          >
            <Microphone className="w-5 h-5" />
          </button>

          {/* Send Answer button (only visible when manual answer has content) */}
          {userAnswer.trim() && (
            <button
              onClick={handleSendAnswer}
              disabled={isAiSpeaking || isAiThinking}
              className="p-0.5 bg-transparent border-none text-primary hover:text-primary/80 transition-all cursor-pointer disabled:opacity-50"
              title="Gửi câu trả lời"
            >
              <SendSquare className="w-5 h-5" />
            </button>
          )}

          {/* Submit Evaluation or Exit */}
          {qaHistory.length > 0 ? (
            <button
              onClick={handleFinishInterview}
              className="p-0.5 bg-transparent border-none text-emerald-500 hover:text-emerald-400 transition-all cursor-pointer"
              title="Nộp bài & chấm điểm"
            >
              <MedalStar className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleFinishInterview}
              className="p-0.5 bg-transparent border-none text-red-500 hover:text-red-400 transition-all cursor-pointer"
              title="Kết thúc sớm"
            >
              <ExitIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Center Console: Large glowing text */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 max-w-4xl mx-auto text-center z-10 w-full relative">
        {isAiThinking ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="relative h-16 w-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-60" />
              <Spinner className="w-10 h-10 text-primary animate-spin" />
            </div>
            <p className="text-xs font-black tracking-widest text-primary uppercase">
              AI đang phân tích câu trả lời...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Displayed question */}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-medium tracking-wide leading-relaxed text-foreground max-w-3xl mx-auto select-text selection:bg-primary/20 duration-500 transition-all font-question">
              {activeDisplayText}
            </h1>

            {/* Live user transcript text underneath the question */}
            {userAnswer && (
              <div className="pt-8 border-t border-border/40 animate-in fade-in duration-500 max-w-2xl mx-auto">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 select-none">
                  {isRecording ? "Đang thu âm..." : "Bản ghi câu trả lời của bạn:"}
                </p>
                <p className="text-sm md:text-base font-medium text-indigo-600 dark:text-indigo-300 italic leading-relaxed select-text">
                  &quot;{userAnswer}&quot;
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sliding Glassmorphic Manual Input Panel */}
      {isManualInputOpen && (
        <div className="w-full max-w-2xl mx-auto px-4 z-20 animate-in slide-in-from-bottom duration-300 mb-4 text-left">
          <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                Nhập câu trả lời bằng tay
              </span>
              <button
                onClick={() => setIsManualInputOpen(false)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <Textarea
              placeholder="Nhập câu trả lời của bạn tại đây..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={isRecording || isAiSpeaking || isAiThinking}
              className="rounded-xl min-h-[80px] text-xs font-semibold leading-relaxed resize-none focus:ring-primary border-border bg-background text-foreground"
            />
          </div>
        </div>
      )}

      {/* Voice Waveform Visualizer at the bottom */}
      <ThreeWaveform soundLevel={soundLevel} isActive={isRecording || isAiSpeaking} />

      {/* Holographic Loader Overlay when AI compiles analysis */}
      {isFinishing && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6 text-center max-w-md px-6 select-none">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-75" />
              <Spinner className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-wider">AI Đang Tổng Hợp Kết Quả</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Vui lòng giữ kết nối. Hệ thống AI đang tổng hợp các khía cạnh phỏng vấn của bạn...</p>

            {/* Terminal-like logging display */}
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

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UsersGroupRounded, Chart, ShieldCheck, AltArrowRight, ArrowLeft, CheckCircle, ClockCircle } from "@solar-icons/react";
import { Progress } from "@/app/components/ui/progress";

interface Candidate {
  id: string;
  name: string;
  role: string;
  match: number;
  culture: string;
  status: "Passed" | "Review" | "Failed";
  avatar: string;
  summary: string;
  details: {
    label: string;
    value: number;
  }[];
  highlights: {
    text: string;
    type: "positive" | "negative" | "neutral";
  }[];
}

const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Nguyễn Văn An",
    role: "Product Designer",
    match: 92,
    culture: "9.0/10",
    status: "Passed",
    avatar: "A",
    summary: "Nắm vững nguyên lý thiết kế, có tư duy sản phẩm tốt, kỹ năng giao tiếp tự tin và thuyết phục. Phù hợp xuất sắc với văn hóa phát triển năng động của công ty.",
    details: [
      { label: "Chuyên môn UI/UX", value: 95 },
      { label: "Tư duy Product", value: 90 },
      { label: "Kỹ năng giao tiếp", value: 92 },
      { label: "Giải quyết vấn đề", value: 88 }
    ],
    highlights: [
      { text: "Có hơn 3 năm kinh nghiệm thực tế về xây dựng Design System quy mô lớn.", type: "positive" },
      { text: "Trình bày rõ ràng về quy trình lấy người dùng làm trung tâm (User-Centered Design).", type: "positive" },
      { text: "Nói hơi nhanh khi bắt đầu phỏng vấn nhưng đã tự điều chỉnh tốt sau đó.", type: "neutral" }
    ]
  },
  {
    id: "2",
    name: "Trần Thị Minh",
    role: "UX Researcher",
    match: 87,
    culture: "8.5/10",
    status: "Review",
    avatar: "M",
    summary: "Kinh nghiệm nghiên cứu định tính phong phú. Khả năng phỏng vấn sâu ứng viên và lập bản đồ hành trình người dùng tốt, tuy nhiên tư duy phân tích định lượng cần bổ trợ thêm.",
    details: [
      { label: "Nghiên cứu định tính", value: 92 },
      { label: "Nghiên cứu định lượng", value: 70 },
      { label: "Kỹ năng phân tích", value: 85 },
      { label: "Thuyết trình kết quả", value: 88 }
    ],
    highlights: [
      { text: "Đã thực hiện hơn 40 cuộc khảo sát diện rộng và vẽ 5 Persona chuẩn xác.", type: "positive" },
      { text: "Tương tác tự nhiên, phản hồi linh hoạt với câu hỏi tình huống từ AI.", type: "positive" },
      { text: "Thiếu kinh nghiệm sử dụng các công cụ phân tích dữ liệu lớn như SQL hay R.", type: "negative" }
    ]
  },
  {
    id: "3",
    name: "Phạm Minh Đức",
    role: "UI Designer",
    match: 62,
    culture: "6.0/10",
    status: "Failed",
    avatar: "Đ",
    summary: "Kỹ năng thiết kế visual cơ bản tốt nhưng thiếu tư duy phân tích UX và chưa có kinh nghiệm làm việc chặt chẽ với Technical Team. Kết quả làm bài Test kỹ thuật chưa đạt yêu cầu.",
    details: [
      { label: "Visual Design", value: 75 },
      { label: "UX Flow Design", value: 50 },
      { label: "Làm việc nhóm", value: 65 },
      { label: "Tech Collaboration", value: 55 }
    ],
    highlights: [
      { text: "Sử dụng Figma thành thạo, các Layout Grid thiết kế khá sạch sẽ.", type: "positive" },
      { text: "Chưa nắm rõ nguyên lý Responsive và chuyển đổi trạng thái giao diện phức tạp.", type: "negative" },
      { text: "Câu trả lời về xử lý mâu thuẫn ý kiến với Dev còn chung chung, thiếu thực tế.", type: "negative" }
    ]
  }
];

export default function AiScreening() {
  const [selectedId, setSelectedId] = useState<string>("1");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState<boolean>(false);

  const selectedCandidate = mockCandidates.find((c) => c.id === selectedId) || mockCandidates[0];

  return (
    <section id="ai-screening" className="w-full px-6 md:px-36 py-16 lg:py-0 lg:min-h-screen lg:flex lg:items-center bg-transparent relative z-10">
      <div className="w-full mx-auto">
        {/* Layout Flex Container */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-10 w-full">
          {/* Left Column: HR Dashboard Mockup */}
          <div className="w-full lg:w-[768px] lg:flex-shrink-0 flex lg:justify-start justify-center order-2 lg:order-1">
            <div className="w-full rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-6 relative overflow-hidden lg:h-[580px]">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hiring Pipeline</span>
                  <h5 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    Sàng lọc Product Team - Vòng 1
                    <span className="text-[9px] font-medium text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">3 Hồ sơ</span>
                  </h5>
                </div>
              </div>

              {/* Content Area - Split Pane on Desktop, Stack/Slide on Mobile */}
              <div className="relative flex-1 min-h-0 lg:grid lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Left Pane: Candidate List */}
                <div className={`lg:col-span-5 flex flex-col gap-2.5 lg:overflow-y-auto lg:pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isMobileDetailOpen ? 'hidden lg:flex' : 'flex'}`}>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Danh sách ứng viên</span>
                  <div className="flex flex-col gap-2.5">
                    {mockCandidates.map((candidate) => {
                      const isActive = candidate.id === selectedId;
                      return (
                        <button
                          key={candidate.id}
                          onClick={() => {
                            setSelectedId(candidate.id);
                            setIsMobileDetailOpen(true);
                          }}
                          className={`w-full text-left flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 relative group/item cursor-pointer ${
                            isActive 
                              ? "border-emerald-500/30 bg-emerald-500/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                              : "border-white/5 bg-zinc-950/20 hover:border-white/10 hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-colors duration-300 ${
                              isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 text-zinc-300 border border-white/5"
                            }`}>
                              {candidate.avatar}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold transition-colors ${isActive ? "text-emerald-400" : "text-white group-hover/item:text-emerald-400"}`}>{candidate.name}</span>
                              <span className="text-[10px] text-zinc-400 mt-0.5">{candidate.role}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Độ khớp</span>
                              <span className={`text-xs font-extrabold ${isActive ? "text-emerald-400" : "text-zinc-200"}`}>{candidate.match}%</span>
                            </div>
                            <AltArrowRight className={`w-4 h-4 text-zinc-500 transition-transform ${isActive ? "translate-x-0.5 text-emerald-400" : "group-hover/item:translate-x-0.5"}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pane: Selected Candidate Evaluation Detail */}
                <div className={`lg:col-span-7 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-white/5 pt-5 lg:pt-0 lg:pl-6 lg:overflow-y-auto lg:pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${!isMobileDetailOpen ? 'hidden lg:flex' : 'flex'}`}>
                  
                  {/* Mobile Back Button */}
                  <div className="flex lg:hidden items-center justify-between border-b border-white/5 pb-3">
                    <button 
                      onClick={() => setIsMobileDetailOpen(false)}
                      className="flex items-center gap-2 text-zinc-400 text-xs font-semibold hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Quay lại danh sách
                    </button>
                    <span 
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        selectedCandidate.status === "Passed" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : selectedCandidate.status === "Review" 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                          : "bg-zinc-800/40 text-zinc-400 border-white/5"
                      }`}
                    >
                      {selectedCandidate.status === "Passed" ? "Passed V1" : selectedCandidate.status === "Review" ? "Review" : "Rejected"}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedId}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col gap-5 flex-shrink-0"
                    >
                      {/* Candidate Detail Header */}
                      <div className="flex items-start justify-between gap-4 flex-shrink-0">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-base font-extrabold text-white">{selectedCandidate.name}</h4>
                            {/* Desktop Status Badge */}
                            <span 
                              className={`hidden lg:inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                                selectedCandidate.status === "Passed" 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : selectedCandidate.status === "Review" 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                  : "bg-zinc-800/40 text-zinc-400 border-white/5"
                              }`}
                            >
                              {selectedCandidate.status === "Passed" ? "Passed V1" : selectedCandidate.status === "Review" ? "Review" : "Rejected"}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">{selectedCandidate.role} • Văn hóa: <span className="font-semibold text-zinc-200">{selectedCandidate.culture}</span></p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-white/5 px-3 py-1.5 rounded-2xl">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Điểm AI</span>
                            <span className="text-sm font-black text-emerald-400">{selectedCandidate.match}<span className="text-zinc-500 text-[10px] font-normal">/100</span></span>
                          </div>
                        </div>
                      </div>

                      {/* AI Summary Comments */}
                      <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                          Đánh giá tổng quan từ AI
                        </div>
                        <p className="text-[11px] md:text-xs text-zinc-300 leading-relaxed font-medium">
                          &quot;{selectedCandidate.summary}&quot;
                        </p>
                      </div>

                      {/* Score Breakdown (Metrics) */}
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Chi tiết kỹ năng</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedCandidate.details.map((detail, idx) => (
                            <div key={idx} className="bg-zinc-950/20 border border-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-400 font-medium">{detail.label}</span>
                                <span className="font-bold text-zinc-200">{detail.value}%</span>
                              </div>
                              <Progress value={detail.value} className="h-1.5 bg-white/5" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Interview Highlights / Transcription Snippets */}
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Ghi nhận từ phỏng vấn</span>
                        <div className="flex flex-col gap-2">
                          {selectedCandidate.highlights.map((highlight, idx) => (
                            <div 
                              key={idx} 
                              className={`flex gap-2.5 p-3 rounded-xl border text-[11px] leading-relaxed ${
                                highlight.type === "positive" 
                                  ? "bg-emerald-500/[0.01] border-emerald-500/10 text-emerald-300/90" 
                                  : highlight.type === "negative" 
                                  ? "bg-rose-500/[0.01] border-rose-500/10 text-rose-300/90" 
                                  : "bg-zinc-900/30 border-white/5 text-zinc-300"
                              }`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {highlight.type === "positive" ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 bg-emerald-500/10 rounded-full p-0.5" />
                                ) : highlight.type === "negative" ? (
                                  <span className="w-3.5 h-3.5 text-rose-400 bg-rose-500/10 rounded-full flex items-center justify-center text-[8px] font-bold">!</span>
                                ) : (
                                  <ClockCircle className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                              </div>
                              <span>{highlight.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Title + Subtitle + Features Description */}
          <div className="w-full lg:flex-1 max-w-2xl lg:ml-auto flex flex-col gap-10 order-1 lg:order-2">
            
            {/* Header / Intro inside right column */}
            <div className="flex flex-col gap-4">
              <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Giải pháp doanh nghiệp</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Tự động hóa 90% quy trình sàng lọc sơ loại
              </h2>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                Giúp bộ phận HR tiết kiệm hàng chục giờ phỏng vấn thủ công. Lọc nhanh các ứng viên không đạt yêu cầu chuyên môn nhờ trợ lý AI chấm điểm tự động.
              </p>
            </div>

            {/* Features List */}
            <div className="flex flex-col gap-6">
              {/* Feature 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-400">
                  <UsersGroupRounded weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-base md:text-lg">Sàng lọc tự động 24/7</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    AI thay mặt HR thực hiện phỏng vấn sơ loại thông tin trực tiếp với hàng trăm ứng viên đồng thời qua cuộc gọi voice trực tuyến, không giới hạn khung giờ.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-400">
                  <Chart weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-base md:text-lg">Báo cáo đánh giá chi tiết</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    AI trích xuất ngay báo cáo đánh giá năng lực chuyên môn, phong cách hành vi và độ tương thích văn hóa (Culture Fit) của từng ứng viên dựa trên JD.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-400">
                  <ShieldCheck weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-base md:text-lg">Chống gian lận thông minh</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Hệ thống AI phân tích độ trễ phản hồi, ngữ điệu đọc bài viết sẵn và phát hiện âm thanh nền lạ để đảm bảo tính trung thực của câu trả lời.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

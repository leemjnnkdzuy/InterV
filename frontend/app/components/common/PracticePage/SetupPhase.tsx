"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { practiceService } from "@/app/services";
import { Spinner } from "@/app/components/ui/spinner";
import { INDUSTRIES } from "@/app/contants";
import { getDifficultyLevels, getAiPersonalities } from "@/app/lib/Utils";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Card } from "@/app/components/ui/card";
import type { SetupPhaseProps } from "@/app/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  AltArrowLeft,
  Pen2,
  UploadMinimalistic,
  CheckCircle,
  PlayCircle,
  TrashBinMinimalistic,
  DocumentText,
  SmileCircle,
  ShieldWarning,
  Cpu,
  Palette,
  WalletMoney,
  GraphUp,
  Suitcase,
  SquareAcademicCap,
  Stethoscope,
  Scale,
  Sledgehammer,
  Stars,
} from "@solar-icons/react";

const getAiIcon = (id: string, color: string) => {
  const className = `w-5.5 h-5.5 ${color}`;
  switch (id) {
    case "elena":
      return <SmileCircle className={className} />;
    case "marcus":
      return <ShieldWarning className={className} />;
    case "sophia":
      return <Cpu className={className} />;
    case "chloe":
    case "lucas":
      return <Palette className={className} />;
    case "david":
      return <WalletMoney className={className} />;
    case "olivia":
      return <GraphUp className={className} />;
    case "harvey":
      return <Suitcase className={className} />;
    case "mr_viet":
      return <SquareAcademicCap className={className} />;
    case "dr_minh":
      return <Stethoscope className={className} />;
    case "lawyer_khanh":
      return <Scale className={className} />;
    case "mr_hoang":
      return <Sledgehammer className={className} />;
    case "ms_huong":
      return <Stars className={className} />;
    default:
      return <SmileCircle className={className} />;
  }
};

export default function SetupPhase({
  router,
  practiceId,
  title,
  setTitle,
  industry,
  setIndustry,
  jobDescription,
  setJobDescription,
  topic,
  setTopic,
  difficulty,
  setDifficulty,
  duration,
  setDuration,
  selectedAi,
  setSelectedAi,
  isSavingSetup,
  handleStartInterview,
}: SetupPhaseProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [jdTab, setJdTab] = useState<"upload" | "paste">("upload");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [isUpdatingIndustry, setIsUpdatingIndustry] = useState(false);

  const handleSaveTitle = async () => {
    if (!title.trim()) {
      toast.error("Tên buổi luyện tập không được để trống");
      return;
    }
    try {
      setIsUpdatingTitle(true);
      const data = await practiceService.update(practiceId, {
        title: title.trim(),
      });
      if (data.success) {
        setIsEditingTitle(false);
      } else {
        toast.error(data.message || "Không thể cập nhật tên");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi kết nối máy chủ");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleIndustryChange = async (newIndustry: string) => {
    try {
      setIsUpdatingIndustry(true);
      const data = await practiceService.update(practiceId, {
        industry: newIndustry,
      });
      if (data.success) {
        setIndustry(newIndustry);
      } else {
        toast.error(data.message || "Không thể cập nhật lĩnh vực");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi kết nối máy chủ");
    } finally {
      setIsUpdatingIndustry(false);
    }
  };

  useEffect(() => {
    if (!industry) return;
    const difficulties = getDifficultyLevels(industry);
    const personalities = getAiPersonalities(industry);

    if (!difficulties.some((d) => d.id === difficulty)) {
      setDifficulty(difficulties[0]?.id || "Junior");
    }
    if (!personalities.some((a) => a.id === selectedAi)) {
      setSelectedAi(personalities[0]?.id || "elena");
    }
  }, [difficulty, industry, selectedAi, setDifficulty, setSelectedAi]);


  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<{ name: string; size: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const validExtensions = ["pdf", "docx", "txt"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (!fileExt || !validExtensions.includes(fileExt)) {
      toast.error("Vui lòng tải lên file định dạng .pdf, .docx, hoặc .txt");
      return;
    }

    setUploadFile({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Đang đọc tệp tin...");

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            const mockExtractedText = `MÔ TẢ CÔNG VIỆC VỊ TRÍ PHỎNG VẤN:\n- Thiết kế, phát triển và tối ưu hóa các ứng dụng Web sử dụng React, Next.js, TailwindCSS.\n- Xây dựng giao diện responsive chất lượng cao, tích hợp mượt mà API RESTful/GraphQL.\n- Tối ưu hóa tốc độ tải trang, đảm bảo trải nghiệm người dùng tối đa và chỉ số Lighthouse tốt.\n- Cộng tác chặt chẽ với UI/UX Designer và backend engineer để hoàn thiện tính năng.\nYêu cầu:\n- Từ 2 năm kinh nghiệm làm việc với lập trình Frontend (ReactJS/NextJS).\n- Hiểu sâu về React state management (Zustand/Redux), lifecycle, hooks.\n- Có kinh nghiệm làm việc trong môi trường Scrum/Agile, sử dụng Git Gitflow thành thạo.`;
            setJobDescription(mockExtractedText);
            toast.success("Trích xuất nội dung JD thành công!");
          }, 600);
          return 100;
        }

        if (prev === 30) setUploadStatus("Đang phân tích cấu trúc tài liệu...");
        if (prev === 65) setUploadStatus("Đang trích xuất văn bản bằng AI...");
        if (prev === 85) setUploadStatus("Đang tối ưu hóa định dạng nội dung...");

        return prev + 10;
      });
    }, 150);
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    setJobDescription("");
    setUploadProgress(0);
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
      {/* Top back button row */}
      <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between shrink-0 select-none">
        <Button
          variant="outline"
          onClick={() => router.push("/practice")}
          className="rounded-full flex items-center gap-2 border-border/40 hover:bg-muted/50 cursor-pointer h-10 px-4 text-xs font-semibold"
        >
          <AltArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </Button>
        <h1 className="font-logo text-xl font-bold tracking-tight text-foreground">
          InterV<span className="text-[var(--chart-1)]">.</span>
        </h1>
      </div>

      {/* Main setup layout workspace */}
      <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto no-scrollbar gap-6">
        {/* Bento Grid layout */}
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Column 1: Metadata (Title, Industry), JD Loader & Focus Topics */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[32px] overflow-hidden shadow-sm flex flex-col justify-between p-6">
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Title & Industry Selection in one row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-border/10 shrink-0">
                  {/* Title editing block */}
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">Tên buổi luyện tập</label>
                    <div className="flex items-center gap-2.5 group w-full">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTitle();
                            }}
                            className="bg-card/40 border border-primary/50 text-foreground text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-full h-[42px]"
                            autoFocus
                            disabled={isUpdatingTitle}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSaveTitle}
                            disabled={isUpdatingTitle}
                            className="h-[42px] w-[42px] shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 cursor-pointer flex items-center justify-center"
                          >
                            {isUpdatingTitle ? (
                              <Spinner className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full border border-border/10 bg-card/5 px-4 py-2.5 rounded-2xl h-[42px]">
                          <h2 className="text-xs font-bold text-foreground tracking-tight truncate flex-1">
                            {title || "Buổi phỏng vấn chưa đặt tên"}
                          </h2>
                          <button
                            onClick={() => setIsEditingTitle(true)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 cursor-pointer shrink-0 ml-2"
                            title="Đổi tên buổi luyện tập"
                          >
                            <Pen2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Industry selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">Lĩnh vực chuyên môn</label>
                    <Select value={industry} onValueChange={handleIndustryChange} disabled={isUpdatingIndustry}>
                      <SelectTrigger className="rounded-2xl w-full border border-border/20 bg-card/20 hover:bg-card/45 text-xs font-bold text-foreground cursor-pointer h-[42px] flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                          {isUpdatingIndustry && <Spinner className="w-3.5 h-3.5 text-primary" />}
                          <SelectValue placeholder="Chọn ngành nghề" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border/10 rounded-2xl shadow-lg">
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind} className="cursor-pointer rounded-xl text-xs">
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Section Title & Tabs */}
                <div className="flex items-center justify-between border-b border-border/10 pb-3 shrink-0">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      Mô tả công việc
                    </h3>
                  </div>

                  <div className="flex bg-muted/40 p-0.5 rounded-xl border border-border/5">
                    <button
                      onClick={() => setJdTab("upload")}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-tight cursor-pointer ${
                        jdTab === "upload" ? "bg-background text-primary shadow" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Tải lên File
                    </button>
                    <button
                      onClick={() => setJdTab("paste")}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-tight cursor-pointer ${
                        jdTab === "paste" ? "bg-background text-primary shadow" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Nhập văn bản
                    </button>
                  </div>
                </div>

                {/* Content block with flex-1 to fill card */}
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 px-1.5 py-2 flex flex-col">
                  {jdTab === "upload" ? (
                    <div className="space-y-4 flex-1 flex flex-col">
                      {!uploadFile ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer flex-1 min-h-[220px] group ${
                            isDragging
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                              : "border-border/20 hover:border-primary/50 bg-card/10 hover:bg-card/25"
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div className={`p-3.5 rounded-2xl bg-muted/30 text-muted-foreground group-hover:text-primary mb-2.5 ${isDragging ? "text-primary" : ""}`}>
                            <UploadMinimalistic className="w-7 h-7" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Kéo thả file JD hoặc nhấp để tải lên</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">Chấp nhận PDF, DOCX, TXT (Tối đa 5MB)</span>
                        </div>
                      ) : (
                        <div className="space-y-3 flex-1 flex flex-col">
                          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-primary text-background font-black text-xs shrink-0 flex items-center justify-center">
                                <DocumentText className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-foreground truncate">{uploadFile.name}</h4>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{uploadFile.size}</p>
                              </div>
                            </div>
                            {!isUploading && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRemoveFile}
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer"
                              >
                                <TrashBinMinimalistic className="w-4.5 h-4.5" />
                              </Button>
                            )}
                          </div>

                          {isUploading && (
                            <div className="space-y-2 border border-border/10 p-3 rounded-2xl bg-card/20">
                              <div className="flex items-center justify-between text-[9px] font-bold">
                                <span className="text-primary">{uploadStatus}</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-muted/30 rounded-full h-1 overflow-hidden">
                                <div className="bg-primary h-1 rounded-full" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          )}

                          {!isUploading && jobDescription && (
                            <div className="space-y-1.5 flex-1 flex flex-col min-h-[140px]">
                              <label className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">Nội dung JD đã trích xuất</label>
                              <Textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="rounded-2xl flex-1 text-left resize-none focus:ring-primary border-border/10 bg-card/5 text-xs leading-relaxed"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-[220px]">
                      <Textarea
                        placeholder="Dán nội dung JD hoặc các yêu cầu kỹ năng chi tiết tại đây để AI bắt đầu thiết lập bộ câu hỏi..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="w-full flex-1 rounded-2xl text-left resize-none focus:ring-primary border-border/10 bg-card/5 text-xs leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Topic Area at bottom */}
              <div className="space-y-1.5 pt-4 border-t border-border/10 shrink-0">
                <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Chủ đề/Kỹ năng cần luyện tập thêm
                </label>
                <Textarea
                  placeholder="Ví dụ: React Hooks, STAR method, Xử lý áp lực, System Design..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="rounded-2xl min-h-[50px] text-left resize-none focus:ring-primary border-border/10 bg-card/5 text-xs"
                />
              </div>
            </Card>
          </div>

          {/* Column 2: Parameters Configuration */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-0">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col gap-5 justify-between overflow-hidden">
              {/* Sub title */}
              <div className="border-b border-border/10 pb-3 shrink-0">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Thông số phỏng vấn
                </h3>
              </div>

              {/* Level stack */}
              <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto no-scrollbar p-1.5">
                {/* Difficulty settings */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Cấp độ chuyên môn</label>
                  <div className="flex flex-col gap-1.5">
                    {getDifficultyLevels(industry).map((levelObj) => {
                      const level = levelObj.id;
                      const isSelected = difficulty === level;
                      return (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`w-full p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border/10 bg-card/5 hover:bg-card/15 text-muted-foreground"
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-extrabold">{levelObj.name}</span>
                            <span className="block text-[8px] font-medium opacity-80 mt-0.5">
                              {levelObj.description}
                            </span>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration settings */}
                <div className="space-y-2 pt-2 border-t border-border/10">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Thời lượng câu hỏi</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[3, 5, 7, 12, 16, 20, 25].map((num) => {
                      const isSelected = duration === num;
                      return (
                        <button
                          key={num}
                          onClick={() => setDuration(num)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border/10 bg-card/5 hover:bg-card/15 text-muted-foreground"
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-extrabold">{num} câu hỏi</span>
                            <span className="block text-[8px] font-medium opacity-80 mt-0.5">
                              {num === 3 && "Phỏng vấn nhanh (10 phút)"}
                              {num === 5 && "Phỏng vấn chuẩn (20 phút)"}
                              {num === 7 && "Phỏng vấn mở rộng (30 phút)"}
                              {num === 12 && "Phỏng vấn chuyên sâu (50 phút)"}
                              {num === 16 && "Mô phỏng thực tế (70 phút)"}
                              {num === 20 && "Đánh giá toàn diện (90 phút)"}
                              {num === 25 && "Thử thách cực hạn (100 phút)"}
                            </span>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Column 3: AI Interviewer & Submit */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-4">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col gap-4 justify-between overflow-hidden">
              {/* Header */}
              <div className="border-b border-border/10 pb-3 shrink-0">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Phỏng vấn viên AI
                </h3>
              </div>

              {/* AI Selection Card Stack */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 p-1.5">
                {getAiPersonalities(industry).map((ai) => {
                  const isSelected = selectedAi === ai.id;

                  // Active colored glow effects
                  let selectedGlow = "border-primary/40 bg-primary/5 shadow-md shadow-primary/5";
                  if (isSelected) {
                    if (ai.id === "elena" || ai.id === "chloe") selectedGlow = "border-rose-500/40 bg-rose-500/5 shadow-md shadow-rose-500/5";
                    else if (ai.id === "marcus" || ai.id === "dr_minh") selectedGlow = "border-red-500/40 bg-red-500/5 shadow-md shadow-red-500/5";
                    else if (ai.id === "sophia" || ai.id === "lawyer_khanh") selectedGlow = "border-cyan-500/40 bg-cyan-500/5 shadow-md shadow-cyan-500/5";
                    else if (ai.id === "lucas") selectedGlow = "border-indigo-500/40 bg-indigo-500/5 shadow-md shadow-indigo-500/5";
                    else if (ai.id === "david") selectedGlow = "border-emerald-500/40 bg-emerald-500/5 shadow-md shadow-emerald-500/5";
                    else if (ai.id === "olivia" || ai.id === "mr_hoang") selectedGlow = "border-amber-500/40 bg-amber-500/5 shadow-md shadow-amber-500/5";
                    else if (ai.id === "harvey" || ai.id === "mr_viet" || ai.id === "ms_huong") selectedGlow = "border-blue-500/40 bg-blue-500/5 shadow-md shadow-blue-500/5";
                  }

                  return (
                    <button
                      key={ai.id}
                      onClick={() => setSelectedAi(ai.id)}
                      className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? selectedGlow
                          : "border-border/10 bg-card/5 hover:bg-card/15"
                      }`}
                    >
                      {/* Visual Avatar */}
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${ai.avatarBg} shrink-0 flex items-center justify-center border shadow-inner`}>
                        {getAiIcon(ai.id, ai.avatarColor)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{ai.name}</span>
                          <span className="text-[7.5px] font-black tracking-wider text-muted-foreground uppercase bg-muted/40 px-1.5 py-0.5 rounded border border-border/5">{ai.role}</span>
                        </div>
                        <p className="text-[9.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ai.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Action button separated from card */}
            <div className="shrink-0">
              <button
                onClick={handleStartInterview}
                disabled={isSavingSetup}
                className="w-full rounded-2xl py-4 font-black text-xs tracking-wider shadow-md bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer flex items-center justify-center gap-2 select-none disabled:opacity-50"
              >
                {isSavingSetup ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    ĐANG KHỞI TẠO CÂU HỎI...
                  </>
                ) : (
                  <>
                    <PlayCircle weight="BoldDuotone" className="w-4.5 h-4.5" />
                    BẮT ĐẦU LUYỆN TẬP NGAY
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

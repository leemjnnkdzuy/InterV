"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { practiceService } from "@/app/services";

import SetupPhase from "@/app/components/common/PracticePage/SetupPhase";
import SetupPhaseSkeleton from "@/app/components/seletons/SetupPhaseSkeleton";
import { getAiPersonality, getDifficultyLevels } from "@/app/contants";
import InterviewPhase from "@/app/components/common/PracticePage/InterviewPhase";
import type { PracticePageProps, PracticeSessionResponse } from "@/app/types";

export default function PracticePage({ practiceId }: PracticePageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<"setup" | "interview">("setup");

  // Phase 1: Setup states
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Middle");
  const [duration, setDuration] = useState(3);
  const [selectedAi, setSelectedAi] = useState("elena");
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [questionsList, setQuestionsList] = useState<string[]>([]);

  const fetchSessionDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = (await practiceService.getById(practiceId)) as PracticeSessionResponse;
      if (data.success && data.session) {
        const s = data.session;
        setTitle(s.title || "");
        setIndustry(s.industry || "Công nghệ thông tin");
        setJobDescription(s.jobDescription || "");
        setTopic(s.topic || "");
      } else {
        toast.error("Không thể lấy thông tin buổi phỏng vấn");
        router.push("/practice");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
      router.push("/practice");
    } finally {
      setIsLoading(false);
    }
  }, [practiceId, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSessionDetails();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSessionDetails]);

  const generateInterviewQuestions = () => {
    const personality = getAiPersonality(selectedAi, industry);
    const baseQuestions: string[] = [];

    baseQuestions.push(
      `${personality.introPrefix} Đầu tiên, để bắt đầu buổi trao đổi hôm nay, bạn hãy giới thiệu ngắn gọn về bản thân, các cột mốc kinh nghiệm nổi bật nhất của bạn, và lý do bạn ứng tuyển vào vị trí này?`
    );

    const lowerJD = jobDescription.toLowerCase();
    if (lowerJD.includes("react") || lowerJD.includes("next.js") || lowerJD.includes("nextjs") || lowerJD.includes("frontend")) {
      baseQuestions.push(
        "Cảm ơn phần giới thiệu của bạn. Bản mô tả công việc (JD) này yêu cầu rất cao về React và Next.js. Bạn có thể giải thích chi tiết cơ chế hoạt động của React Server Components (RSC) trong Next.js App Router không? Sự khác biệt cốt lõi về hiệu năng giữa Server Components và Client Components là gì và bạn sẽ tối ưu hóa Client Components như thế nào để giảm dung lượng bundle size?"
      );
    } else if (lowerJD.includes("marketing") || lowerJD.includes("quảng cáo") || lowerJD.includes("sales") || lowerJD.includes("bán hàng")) {
      baseQuestions.push(
        "Cảm ơn phần giới thiệu của bạn. Đối với vai trò chiến lược này, bạn hãy mô tả một chiến dịch marketing hoặc bán hàng mà bạn đã thiết kế và triển khai mang lại tỷ lệ chuyển đổi (conversion rate) cao nhất. Bạn đã phân tích chỉ số đo lường hiệu quả (KPIs) ra sao và xử lý thế nào khi chiến dịch không đạt kết quả mong muốn ban đầu?"
      );
    } else if (lowerJD.includes("tài chính") || lowerJD.includes("kế toán") || lowerJD.includes("ngân hàng")) {
      baseQuestions.push(
        "Cảm ơn bạn. Là một nhân sự tài chính/kế toán chuyên nghiệp, làm thế nào để bạn đảm bảo tính trung thực và chính xác của dữ liệu khi chịu trách nhiệm kiểm tra một lượng lớn chứng từ và báo cáo tài chính dưới áp lực thời gian gấp? Hãy kể về một lần bạn phát hiện ra sai sót lớn và cách bạn giải quyết nó."
      );
    } else if (topic.trim().length > 0) {
      baseQuestions.push(
        `Cảm ơn phần giới thiệu. Đi sâu vào chủ đề bạn muốn tập trung: "${topic}". Bạn hãy giải thích chi tiết kinh nghiệm thực chiến của mình liên quan đến chủ đề này, bao gồm cả những bài học hoặc sai lầm xương máu mà bạn đã đúc kết được trong quá trình làm việc thực tế?`
      );
    } else {
      baseQuestions.push(
        "Cảm ơn bạn. Đối với vị trí này, kỹ năng giải quyết vấn đề dưới áp lực là vô cùng quan trọng. Bạn hãy chia sẻ chi tiết về một thử thách hoặc sự cố kỹ thuật/vận hành nghiêm trọng nhất bạn từng gặp phải trong dự án trước đây. Bạn đã định vị nguyên nhân gốc rễ và xử lý nó như thế nào?"
      );
    }

    // Question 3: Behavioral (STAR method)
    const diffLevels = getDifficultyLevels(industry);
    const diffIndex = diffLevels.findIndex((d) => d.id === difficulty);
    const isSeniorOrLead = diffIndex >= 2;

    if (isSeniorOrLead) {
      baseQuestions.push(
        "Là một nhân sự cấp cao (Senior/Lead), việc quản lý kỳ vọng và giải quyết xung đột ý kiến là cực kỳ quan trọng. Hãy kể lại một tình huống bạn có bất đồng ý kiến sâu sắc với một Technical Architect, PM hoặc khách hàng về giải pháp triển khai sản phẩm. Bạn đã làm thế nào để thuyết phục họ hoặc tìm ra tiếng nói chung mà không làm ảnh hưởng đến tiến độ dự án?"
      );
    } else {
      baseQuestions.push(
        "Câu hỏi cuối cùng dành cho bạn: Khi làm việc nhóm, nếu một thành viên trong team không hoàn thành công việc đúng hạn được giao, gây ảnh hưởng trực tiếp đến deadline chung của bạn và toàn đội, bạn sẽ giao tiếp và xử lý tình huống đó như thế nào để đảm bảo công việc trôi chảy?"
      );
    }

    // If duration setting is more than 3, add more questions
    if (duration > 3) {
      const extraPool = [
        "Hãy chia sẻ về cách bạn cập nhật kiến thức công nghệ mới hoặc xu hướng ngành nghề hàng ngày. Có công cụ, blog hay phương pháp học tập đặc thù nào giúp bạn giữ vững chuyên môn đỉnh cao không?",
        "Trong môi trường làm việc Agile/Scrum tốc độ cao, bạn làm thế nào để sắp xếp thứ tự ưu tiên cho các task của mình khi có quá nhiều đầu việc phát sinh khẩn cấp cùng một lúc?",
        "Trong quá khứ, bạn đã bao giờ phải đối mặt với một deadline cực kỳ gấp mà biết chắc chắn không thể hoàn thành đúng hạn nếu không thay đổi phạm vi dự án hoặc làm thêm giờ chưa? Bạn đã đàm phán với quản lý hoặc đối tác để giải quyết khó khăn này như thế nào?",
        "Khi làm việc với các hệ thống lớn hoặc các chiến dịch phức tạp, việc theo dõi và đánh giá hiệu năng/chỉ số đo lường hiệu quả là rất quan trọng. Bạn đã bao giờ xây dựng một hệ thống monitor, đo lường hoặc tự động hóa quy trình làm việc chưa? Hãy kể chi tiết.",
        "Hãy chia sẻ về một quyết định kỹ thuật hoặc chiến lược kinh doanh sai lầm nhất bạn từng đưa ra trong quá khứ. Hậu quả của nó là gì và bạn đã học được bài học gì để không lặp lại sai lầm đó trong các dự án sau này?",
        "Làm thế nào để bạn duy trì sự cân bằng giữa chất lượng công việc (ví dụ: code sạch, tài liệu đầy đủ, quy trình chuẩn) và tốc độ bàn giao sản phẩm khi có sức ép lớn từ phía kinh doanh?",
        "Khi tiếp nhận một hệ thống cũ (legacy system) hoặc một dự án đang gặp rắc rối nghiêm trọng từ người khác bàn giao lại, bước đầu tiên bạn sẽ làm gì để hiểu và làm chủ tình hình nhanh nhất?",
        "Bạn đánh giá thế nào về tầm quan trọng của việc phản hồi (feedback) trong đội ngũ? Hãy kể về một lần bạn nhận được feedback mang tính xây dựng nhưng khó nghe nhất từ đồng nghiệp hoặc sếp, và bạn đã phản ứng ra sao?",
        "Hãy tưởng tượng bạn phải giải thích một khái niệm kỹ thuật cực kỳ phức tạp (hoặc một quy trình nghiệp vụ khó hiểu) cho một khách hàng hoặc thành viên nhóm không có chuyên môn về lĩnh vực đó. Bạn sẽ làm thế nào để đảm bảo họ hiểu rõ?",
        "Trong công việc, làm thế nào để bạn xác định khi nào cần tự giải quyết vấn đề và khi nào nên chủ động tìm kiếm sự giúp đỡ từ người khác hoặc nâng cấp vấn đề lên cấp quản lý?",
        "Nếu được thay đổi một điều duy nhất trong quy trình làm việc hiện tại của bạn hoặc công ty cũ để nâng cao hiệu suất làm việc của toàn team, bạn sẽ thay đổi điều gì và tại sao?",
        "Hãy chia sẻ về mục tiêu phát triển sự nghiệp của bạn trong vòng 2-3 năm tới. Vị trí này sẽ đóng vai trò như thế nào trong việc giúp bạn đạt được mục tiêu đó?",
        "Khi có sự thay đổi đột ngột về công nghệ cốt lõi hoặc định hướng sản phẩm từ ban lãnh đạo ngay giữa chu kỳ dự án, bạn làm cách nào để giúp bản thân và đồng nghiệp thích nghi nhanh chóng với sự thay đổi đó?",
        "Bạn giải quyết thế nào khi được giao một nhiệm vụ sử dụng công nghệ hoặc nghiệp vụ hoàn toàn mới mà bạn chưa từng học hoặc làm việc trước đây?",
        "Hãy mô tả một tình huống bạn phải làm việc với một đồng nghiệp có phong cách làm việc hoặc tính cách hoàn toàn trái ngược với bạn. Hai người đã phối hợp thế nào để đạt được kết quả chung tốt nhất?",
        "Trong vai trò này, việc tự chủ và làm việc độc lập là cần thiết. Hãy chia sẻ về một dự án hoặc sáng kiến bạn tự đề xuất và dẫn dắt từ đầu đến cuối mà không có sự chỉ đạo sát sao từ cấp trên.",
        "Trong môi trường công việc, làm thế nào để bạn xây dựng và duy trì mối quan hệ hợp tác tốt với các phòng ban/bộ phận khác vốn có mục tiêu hoặc lợi ích đối nghịch với đội ngũ của bạn?",
        "Hãy chia sẻ về một tình huống bạn phải tiếp nhận thông tin phản hồi tiêu cực hoặc khiếu nại gay gắt từ phía khách hàng/người dùng cuối. Bạn đã xử lý khủng hoảng đó ra sao?",
        "Bạn làm thế nào để quản lý thời gian và năng lượng của bản thân khi phải chịu trách nhiệm đảm đương nhiều dự án hoặc vai trò khác nhau cùng một lúc?",
        "Hãy kể lại một trường hợp bạn phải đưa ra quyết định quan trọng nhưng thông tin nhận được lại vô cùng mơ hồ hoặc thiếu sót. Bạn đã phân tích và hành động thế nào?",
        "Theo bạn, yếu tố nào là quan trọng nhất để tạo nên động lực làm việc lâu dài cho bản thân và giúp bạn vượt qua những giai đoạn công việc lặp đi lặp lại hoặc nhàm chán?",
        "Nếu bạn được yêu cầu đào tạo hoặc hướng dẫn cho một nhân sự mới hoàn toàn chưa có kinh nghiệm thực tế, bạn sẽ xây dựng lộ trình hướng dẫn họ như thế nào trong tuần đầu tiên?",
        "Cuối cùng, nếu bạn được tuyển dụng vào vị trí này, việc đầu tiên bạn muốn thực hiện trong 30 ngày thử việc đầu tiên để tạo ra đóng góp thiết thực nhất cho đội ngũ là gì?"
      ];

      const neededCount = duration - baseQuestions.length;
      for (let i = 0; i < neededCount; i++) {
        if (extraPool[i]) {
          baseQuestions.push(extraPool[i]);
        } else {
          baseQuestions.push(`Câu hỏi mở rộng số ${i + 1}: Bạn hãy chia sẻ thêm về một kinh nghiệm thực tế khác của bạn mà bạn cảm thấy tự hào nhất và có thể giúp bạn làm tốt công việc này.`);
        }
      }
    }

    return baseQuestions.slice(0, duration);
  };

  const handleStartInterview = async () => {
    try {
      setIsSavingSetup(true);
      const data = await practiceService.update(practiceId, {
        title: title.trim(),
        jobDescription: jobDescription.trim(),
        topic: topic.trim(),
        industry: industry,
      });

      if (data.success) {
        const generatedQs = generateInterviewQuestions();
        setQuestionsList(generatedQs);
        setActivePhase("interview");
      } else {
        toast.error(data.message || "Không thể lưu cấu hình");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setIsSavingSetup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen bg-background">
        <SetupPhaseSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background text-left relative overflow-hidden flex flex-col animate-in fade-in duration-300">
      {activePhase === "setup" ? (
        <SetupPhase
          router={router}
          practiceId={practiceId}
          title={title}
          setTitle={setTitle}
          industry={industry}
          setIndustry={setIndustry}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          topic={topic}
          setTopic={setTopic}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          duration={duration}
          setDuration={setDuration}
          selectedAi={selectedAi}
          setSelectedAi={setSelectedAi}
          isSavingSetup={isSavingSetup}
          handleStartInterview={handleStartInterview}
        />
      ) : (
        <InterviewPhase
          practiceId={practiceId}
          title={title}
          industry={industry}
          difficulty={difficulty}
          selectedAi={selectedAi}
          questionsList={questionsList}
          jobDescription={jobDescription}
          topic={topic}
        />
      )}
    </div>
  );
}

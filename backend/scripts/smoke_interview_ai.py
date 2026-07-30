from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.rag import get_rag_agent
from app.schemas import InterviewEvaluateRequest, InterviewStartRequest
from app.services.deepseek import evaluate_interview, generate_questions


QA_HISTORY = [
    {
        "questionId": "q_1",
        "question": "Hãy mô tả một incident production bạn từng xử lý.",
        "answer": (
            "API tăng p95 từ 180 ms lên 1,8 giây. Tôi đối chiếu metric với "
            "deployment, rollback trong 12 phút và mở postmortem. p95 trở lại "
            "190 ms."
        ),
    },
    {
        "questionId": "q_2",
        "question": "Bạn cân bằng consistency và latency như thế nào?",
        "answer": (
            "Với thanh toán tôi chọn strong consistency; dashboard dùng eventual "
            "consistency và cache 30 giây. Load test cho thấy p95 giảm từ 620 ms "
            "xuống 240 ms."
        ),
    },
    {
        "questionId": "q_3",
        "question": "Hãy kể một lần bạn phản biện quyết định kỹ thuật.",
        "answer": (
            "Tôi lập bảng trade-off về ownership, observability và chi phí, rồi "
            "đề xuất modular monolith. Thời gian deploy giảm 35 phần trăm."
        ),
    },
    {
        "questionId": "q_4",
        "question": "Bạn nâng chuẩn kỹ thuật cho đồng đội bằng cách nào?",
        "answer": (
            "Tôi phân tích 20 pull request, viết checklist và thêm test template "
            "vào CI. Tỷ lệ sửa lớn giảm từ 30 phần trăm xuống 12 phần trăm."
        ),
    },
    {
        "questionId": "q_5",
        "question": "Mô tả một quyết định chưa đạt kỳ vọng.",
        "answer": (
            "Tôi bỏ sót hành vi queue khi consumer restart, làm trễ dữ liệu 40 "
            "phút. Tôi rollback, thêm failure test và yêu cầu decision record."
        ),
    },
]


async def smoke_generation() -> dict[str, object]:
    questions, provider = await generate_questions(
        InterviewStartRequest(
            session_id="smoke-session",
            title="Senior Backend Engineer",
            industry="Công nghệ thông tin",
            job_description=(
                "Thiết kế API gRPC, vận hành production, chịu trách nhiệm SLO "
                "và mentoring."
            ),
            topic="system design and reliability",
            difficulty="Senior",
            requested_questions=1,
            question_count=5,
            language="vi-VN",
        )
    )
    question = questions[0]
    return {
        "provider": provider,
        "question": question.text,
        "competency": question.competency,
        "groundingIds": question.grounding_ids,
    }


async def smoke_evaluation() -> dict[str, object]:
    evaluation, provider = await evaluate_interview(
        InterviewEvaluateRequest(
            session_id="smoke-session",
            run_id="smoke-run",
            title="Senior Backend Engineer",
            industry="Công nghệ thông tin",
            job_description=(
                "Thiết kế API gRPC, vận hành production, chịu trách nhiệm SLO "
                "và mentoring."
            ),
            topic="system design and reliability",
            difficulty="Senior",
            language="vi-VN",
            qa_history=QA_HISTORY,
            audio_analysis={
                "provider": "sensevoice",
                "confidence": 78,
                "composure": 80,
                "vocal_delivery": 76,
                "dominant_emotion": "neutral",
                "observations": ["Tốc độ trình bày ổn định."],
            },
        )
    )
    return {
        "provider": provider,
        "score": evaluation.score,
        "questionCount": len(evaluation.questions),
        "groundingIds": evaluation.grounding_ids,
        "evidenceCounts": [
            len(question.evidence) for question in evaluation.questions
        ],
    }


async def run(mode: str) -> None:
    agent = get_rag_agent()
    try:
        await agent.initialize()
        result: dict[str, object] = {}
        if mode in {"generation", "all"}:
            result["generation"] = await smoke_generation()
        if mode in {"evaluation", "all"}:
            result["evaluation"] = await smoke_evaluation()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        await asyncio.to_thread(agent.store.close)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run billable live DeepSeek + Qdrant interview smoke tests"
    )
    parser.add_argument(
        "--mode",
        choices=("generation", "evaluation", "all"),
        default="generation",
    )
    args = parser.parse_args()
    asyncio.run(run(args.mode))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import json
import uuid

from app.config import get_settings
from app.schemas import (
    GeneratedQuestion,
    InterviewEvaluateRequest,
    InterviewEvaluation,
    InterviewStartRequest,
    EvaluationQuestion,
)


def _language_name(language: str) -> str:
    return {
        "vi-VN": "Vietnamese",
        "en-US": "English",
        "zh-CN": "Chinese",
    }.get(language, language)


def fallback_questions(payload: InterviewStartRequest) -> list[GeneratedQuestion]:
    lang = payload.language
    title = payload.title or "the target role"
    topic = payload.topic or payload.industry or "the job description"

    if lang == "en-US":
        templates = [
            f"Please introduce yourself and explain why your experience fits {title}.",
            f"Which requirements in the job description are the strongest match for you? Give concrete examples.",
            f"Describe a difficult situation related to {topic}. What did you do and what was the result?",
            "Tell me about a time you received critical feedback. How did you respond?",
            "What would you prioritize in your first 30 days if selected for this role?",
        ]
    elif lang == "zh-CN":
        templates = [
            f"请简要介绍你自己，并说明你的经验为什么适合 {title}。",
            "请结合岗位描述，说明你最匹配的能力，并给出具体案例。",
            f"请描述一个与 {topic} 相关的困难场景，你如何处理，结果如何？",
            "请分享一次你收到建设性反馈的经历，以及你如何改进。",
            "如果你被录用，入职前 30 天你会优先做什么？",
        ]
    else:
        templates = [
            f"Bạn hãy giới thiệu ngắn gọn về bản thân và lý do kinh nghiệm của bạn phù hợp với {title}.",
            "Dựa trên JD, bạn thấy yêu cầu nào là điểm mạnh nhất của mình? Hãy đưa ví dụ cụ thể.",
            f"Hãy mô tả một tình huống khó liên quan đến {topic}. Bạn đã xử lý thế nào và kết quả ra sao?",
            "Hãy kể về một lần bạn nhận phản hồi khó nghe nhưng có tính xây dựng. Bạn đã cải thiện như thế nào?",
            "Nếu được chọn, bạn sẽ ưu tiên điều gì trong 30 ngày đầu tiên?",
        ]

    questions = []
    for index in range(payload.duration):
        text = templates[index % len(templates)]
        questions.append(
            GeneratedQuestion(
                id=f"q_{index + 1}",
                text=text,
                competency=["communication", "jd_fit", "problem_solving", "self_improvement", "planning"][index % 5],
                difficulty=payload.difficulty,
                expected_signals=["specific examples", "clear structure", "measurable outcome"],
            )
        )
    return questions


def fallback_evaluation(payload: InterviewEvaluateRequest) -> InterviewEvaluation:
    answered = [qa for qa in payload.qa_history if qa.get("answer", "").strip()]
    coverage = len(answered) / max(len(payload.qa_history), 1)
    base_score = int(60 + coverage * 25)
    if any(len(qa.get("answer", "")) > 180 for qa in answered):
        base_score += 5
    score = max(0, min(95, base_score))

    questions = []
    for qa in payload.qa_history:
        answer = qa.get("answer", "")
        q_score = 0 if not answer.strip() else max(55, min(92, 65 + len(answer) // 30))
        questions.append(
            EvaluationQuestion(
                question=qa.get("question", ""),
                answer=answer or "(Không có câu trả lời)",
                score=q_score,
                feedback=(
                    "Câu trả lời có cấu trúc và nêu được ví dụ cụ thể."
                    if q_score >= 75
                    else "Cần bổ sung ví dụ cụ thể, kết quả đo lường và liên hệ rõ hơn với JD."
                ),
                evidence=[answer[:160]] if answer else [],
            )
        )

    return InterviewEvaluation(
        score=score,
        ratings={
            "communication": min(95, score + 2),
            "knowledge": score,
            "problemSolving": max(0, score - 3),
            "confidence": min(95, score + 1),
            "jdFit": max(0, score - 2),
        },
        feedback="Đánh giá fallback: ứng viên được chấm dựa trên mức độ hoàn thành câu hỏi, độ cụ thể của câu trả lời và mức liên hệ với JD.",
        strengths=["Có phản hồi cho các câu hỏi chính"] if answered else [],
        weaknesses=["Cần thêm dẫn chứng định lượng và cấu trúc STAR rõ hơn"],
        recommendations=["Chuẩn bị ví dụ theo STAR", "Liên hệ từng câu trả lời với yêu cầu trong JD"],
        questions=questions,
    )


async def generate_questions(payload: InterviewStartRequest) -> tuple[list[GeneratedQuestion], str]:
    settings = get_settings()
    if not settings.deepseek_api_key:
        return fallback_questions(payload), "fallback"

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.deepseek_api_key, base_url=settings.deepseek_base_url)
        language = _language_name(payload.language)
        system = (
            "You are an expert interview designer. Return only valid json. "
            "Create interview questions that assess candidate fit against the JD."
        )
        user = {
            "title": payload.title,
            "industry": payload.industry,
            "jobDescription": payload.job_description,
            "topic": payload.topic,
            "difficulty": payload.difficulty,
            "questionCount": payload.duration,
            "language": language,
            "jsonShape": {
                "questions": [
                    {
                        "id": "q_1",
                        "text": "question text",
                        "competency": "jd_fit",
                        "difficulty": payload.difficulty,
                        "expected_signals": ["signal"],
                    }
                ]
            },
        }
        last_error: Exception | None = None
        for _ in range(2):
            try:
                response = await client.chat.completions.create(
                    model=settings.deepseek_fast_model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
                    ],
                    response_format={"type": "json_object"},
                    extra_body={"thinking": {"type": "disabled"}},
                )
                content = response.choices[0].message.content or "{}"
                parsed = json.loads(content)
                questions = [GeneratedQuestion(**item) for item in parsed.get("questions", [])]
                if not questions:
                    raise ValueError("DeepSeek returned no questions")
                return questions[: payload.duration], "deepseek"
            except Exception as error:
                last_error = error

        raise last_error or ValueError("DeepSeek question generation failed")
    except Exception:
        return fallback_questions(payload), "fallback"


async def evaluate_interview(payload: InterviewEvaluateRequest) -> tuple[InterviewEvaluation, str]:
    settings = get_settings()
    if not settings.deepseek_api_key:
        return fallback_evaluation(payload), "fallback"

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.deepseek_api_key, base_url=settings.deepseek_base_url)
        system = (
            "You are a rigorous hiring interview evaluator. Return only valid json. "
            "Score based on JD fit, communication, knowledge, problem solving, confidence, and evidence."
        )
        user = {
            "title": payload.title,
            "industry": payload.industry,
            "jobDescription": payload.job_description,
            "topic": payload.topic,
            "difficulty": payload.difficulty,
            "language": _language_name(payload.language),
            "qaHistory": payload.qa_history,
            "jsonShape": {
                "score": 80,
                "ratings": {
                    "communication": 80,
                    "knowledge": 80,
                    "problemSolving": 80,
                    "confidence": 80,
                    "jdFit": 80,
                },
                "feedback": "summary",
                "strengths": ["strength"],
                "weaknesses": ["weakness"],
                "recommendations": ["recommendation"],
                "questions": [
                    {
                        "question": "question",
                        "answer": "answer",
                        "score": 80,
                        "feedback": "feedback",
                        "evidence": ["quote"],
                    }
                ],
            },
        }
        last_error: Exception | None = None
        for _ in range(2):
            try:
                response = await client.chat.completions.create(
                    model=settings.deepseek_eval_model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
                    ],
                    response_format={"type": "json_object"},
                    reasoning_effort="high",
                    extra_body={"thinking": {"type": "enabled"}},
                )
                content = response.choices[0].message.content or "{}"
                return InterviewEvaluation(**json.loads(content)), "deepseek"
            except Exception as error:
                last_error = error

        raise last_error or ValueError("DeepSeek evaluation failed")
    except Exception:
        return fallback_evaluation(payload), "fallback"


def new_run_id() -> str:
    return f"run_{uuid.uuid4().hex}"

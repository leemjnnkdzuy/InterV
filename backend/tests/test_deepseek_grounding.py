import copy
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.schemas import (
    InterviewEvaluateRequest,
    InterviewFollowUpRequest,
    InterviewStartRequest,
)
from app.services.deepseek import (
    evaluate_interview,
    generate_follow_up,
    generate_questions,
)


PROFILE_ID = "rule:profile:information-technology:middle"
EVIDENCE_ID = "rule:profile:information-technology:middle#chunk-003"


class FakeGrounding:
    profile_rule_id = PROFILE_ID
    evidence_ids = (EVIDENCE_ID,)
    allowed_ids = frozenset((PROFILE_ID, EVIDENCE_ID))

    def render(self):
        return {
            "allowedGroundingIds": sorted(self.allowed_ids),
            "requiredGrounding": {
                "mustIncludeProfileRuleId": self.profile_rule_id,
            },
        }


class DeepSeekGroundingTests(unittest.IsolatedAsyncioTestCase):
    async def test_generation_includes_total_floor_and_validates_grounding(self):
        completion = AsyncMock(
            return_value={
                "questions": [
                    {
                        "id": "q_1",
                        "text": "Hãy mô tả một incident production bạn từng xử lý.",
                        "competency": "problem_solving",
                        "difficulty": "Middle",
                        "expected_signals": ["log/metric", "kết quả đo được"],
                        "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                    }
                ]
            }
        )
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(deepseek_fast_model="test-model"),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=completion,
            ),
        ):
            questions, provider = await generate_questions(
                InterviewStartRequest(
                    session_id="session-1",
                    title="Backend Engineer",
                    industry="Công nghệ thông tin",
                    difficulty="Middle",
                    requested_questions=1,
                    question_count=5,
                )
            )

        self.assertEqual(provider, "deepseek")
        self.assertEqual(questions[0].grounding_ids, [PROFILE_ID, EVIDENCE_ID])
        sent_payload = completion.await_args.kwargs["payload"]
        self.assertEqual(sent_payload["requestedQuestions"], 1)
        self.assertEqual(sent_payload["interviewQuestionCount"], 5)
        self.assertIn("grounding", sent_payload)

    async def test_generation_rejects_hallucinated_grounding_id(self):
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(deepseek_fast_model="test-model"),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=AsyncMock(
                    return_value={
                        "questions": [
                            {
                                "id": "q_1",
                                "text": "Một câu hỏi có vẻ hợp lệ?",
                                "competency": "general",
                                "expected_signals": ["evidence"],
                                "grounding_ids": [
                                    PROFILE_ID,
                                    "rag:invented-id",
                                ],
                            }
                        ]
                    }
                ),
            ),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "outside the backend allow-list",
            ):
                await generate_questions(
                    InterviewStartRequest(
                        session_id="session-1",
                        title="Backend Engineer",
                        industry="Công nghệ thông tin",
                        difficulty="Middle",
                        question_count=5,
                    )
                )

    async def test_generation_repairs_missing_evidence_id_once(self):
        base_question = {
            "id": "q_1",
            "text": "Hãy mô tả một incident production bạn từng xử lý.",
            "competency": "problem_solving",
            "difficulty": "Middle",
            "expected_signals": ["log/metric", "kết quả đo được"],
        }
        completion = AsyncMock(
            side_effect=[
                {
                    "questions": [
                        {
                            **base_question,
                            "grounding_ids": [PROFILE_ID],
                        }
                    ]
                },
                {
                    "questions": [
                        {
                            **base_question,
                            "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                        }
                    ]
                },
            ]
        )
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(deepseek_fast_model="test-model"),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=completion,
            ),
        ):
            questions, provider = await generate_questions(
                InterviewStartRequest(
                    session_id="session-1",
                    title="Backend Engineer",
                    industry="Công nghệ thông tin",
                    difficulty="Middle",
                    requested_questions=1,
                    question_count=5,
                )
            )

        self.assertEqual(provider, "deepseek")
        self.assertEqual(completion.await_count, 2)
        self.assertEqual(
            questions[0].grounding_ids,
            [PROFILE_ID, EVIDENCE_ID],
        )
        repair_payload = completion.await_args_list[1].kwargs["payload"]
        self.assertTrue(repair_payload["repairRequired"])
        self.assertIn(
            "must cite at least one retrieved Qdrant evidence ID",
            repair_payload["validationError"],
        )

    async def test_follow_up_is_grounded_and_keeps_five_question_floor(self):
        completion = AsyncMock(
            return_value={
                "question": {
                    "id": "ignored",
                    "text": "Bạn đã dùng metric nào để xác nhận nguyên nhân incident?",
                    "competency": "problem_solving",
                    "difficulty": "Middle",
                    "expected_signals": ["log", "metric"],
                    "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                }
            }
        )
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(deepseek_fast_model="test-model"),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=completion,
            ),
        ):
            question, _ = await generate_follow_up(
                InterviewFollowUpRequest(
                    run_id="run-1",
                    session_id="session-1",
                    question_id="q_1",
                    question="Bạn từng xử lý incident nào?",
                    answer="Tôi xem log rồi rollback.",
                    title="Backend Engineer",
                    industry="Công nghệ thông tin",
                    difficulty="Middle",
                    question_count=5,
                    next_question_index=1,
                    qa_history=[
                        {
                            "questionId": "q_1",
                            "question": "Bạn từng xử lý incident nào?",
                            "answer": "Tôi xem log rồi rollback.",
                        }
                    ],
                )
            )
        self.assertEqual(question.id, "q_2")
        self.assertEqual(question.grounding_ids, [PROFILE_ID, EVIDENCE_ID])
        self.assertEqual(
            completion.await_args.kwargs["payload"]["questionCount"],
            5,
        )

    async def test_follow_up_repairs_missing_evidence_id_once(self):
        base_question = {
            "id": "q_2",
            "text": "Bạn đã dùng metric nào để xác nhận nguyên nhân incident?",
            "competency": "problem_solving",
            "difficulty": "Middle",
            "expected_signals": ["log", "metric"],
        }
        completion = AsyncMock(
            side_effect=[
                {
                    "question": {
                        **base_question,
                        "grounding_ids": [PROFILE_ID],
                    }
                },
                {
                    "question": {
                        **base_question,
                        "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                    }
                },
            ]
        )
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(deepseek_fast_model="test-model"),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=completion,
            ),
        ):
            question, provider = await generate_follow_up(
                InterviewFollowUpRequest(
                    run_id="run-1",
                    session_id="session-1",
                    question_id="q_1",
                    question="Bạn từng xử lý incident nào?",
                    answer="Tôi xem log rồi rollback.",
                    title="Backend Engineer",
                    industry="Công nghệ thông tin",
                    difficulty="Middle",
                    question_count=5,
                    next_question_index=1,
                    qa_history=[
                        {
                            "questionId": "q_1",
                            "question": "Bạn từng xử lý incident nào?",
                            "answer": "Tôi xem log rồi rollback.",
                        }
                    ],
                )
            )

        self.assertEqual(provider, "deepseek")
        self.assertEqual(completion.await_count, 2)
        self.assertEqual(question.grounding_ids, [PROFILE_ID, EVIDENCE_ID])
        repair_payload = completion.await_args_list[1].kwargs["payload"]
        self.assertTrue(repair_payload["repairRequired"])

    async def test_evaluation_requires_five_answers_and_grounding(self):
        qa_history = [
            {
                "questionId": f"q_{index}",
                "question": f"Câu {index}",
                "answer": f"Trả lời có evidence {index}",
            }
            for index in range(1, 6)
        ]
        response = {
            "score": 80,
            "ratings": {
                "communication": 80,
                "knowledge": 80,
                "problemSolving": 80,
                "confidence": 80,
                "jdFit": 80,
                "composure": 80,
                "vocalDelivery": 80,
            },
            "feedback": "Tóm tắt dựa trên evidence.",
            "strengths": ["Có ví dụ"],
            "weaknesses": ["Cần thêm metric"],
            "recommendations": ["Luyện STAR"],
            "questions": [
                {
                    "question": item["question"],
                    "answer": item["answer"],
                    "score": 80,
                    "feedback": "Đủ evidence.",
                    "evidence": [item["answer"]],
                    "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                }
                for item in qa_history
            ],
            "audio_analysis": {
                "provider": "sensevoice",
                "confidence": 80,
            },
            "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
        }
        response["questions"][0]["answer"] = "DeepSeek attempted to rewrite this answer"
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(
                    deepseek_eval_model="test-model",
                    deepseek_eval_max_tokens=32_768,
                ),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=AsyncMock(return_value=response),
            ),
        ):
            evaluation, _ = await evaluate_interview(
                InterviewEvaluateRequest(
                    run_id="run-1",
                    session_id="session-1",
                    title="Backend Engineer",
                    industry="Công nghệ thông tin",
                    difficulty="Middle",
                    qa_history=qa_history,
                    audio_analysis={
                        "provider": "sensevoice",
                        "confidence": 80,
                    },
                )
            )
        self.assertEqual(len(evaluation.questions), 5)
        self.assertEqual(
            evaluation.questions[0].answer,
            qa_history[0]["answer"],
        )
        self.assertEqual(evaluation.grounding_ids, [PROFILE_ID, EVIDENCE_ID])

    async def test_evaluation_repairs_invalid_grounding_once(self):
        qa_history = [
            {
                "questionId": f"q_{index}",
                "question": f"Câu {index}",
                "answer": f"Trả lời có evidence {index}",
            }
            for index in range(1, 6)
        ]
        valid_response = {
            "score": 80,
            "ratings": {
                "communication": 80,
                "knowledge": 80,
                "problemSolving": 80,
                "confidence": 80,
                "jdFit": 80,
                "composure": 80,
                "vocalDelivery": 80,
            },
            "feedback": "Tóm tắt dựa trên evidence.",
            "strengths": ["Có ví dụ"],
            "weaknesses": ["Cần thêm metric"],
            "recommendations": ["Luyện STAR"],
            "questions": [
                {
                    "question": item["question"],
                    "answer": item["answer"],
                    "score": 80,
                    "feedback": "Đủ evidence.",
                    "evidence": [item["answer"]],
                    "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                }
                for item in qa_history
            ],
            "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
        }
        invalid_response = copy.deepcopy(valid_response)
        invalid_response["questions"][4]["grounding_ids"] = [
            PROFILE_ID,
            "rule:invented#chunk-999",
        ]
        completion = AsyncMock(
            side_effect=[invalid_response, valid_response]
        )
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(
                    deepseek_eval_model="test-model",
                    deepseek_eval_max_tokens=32_768,
                ),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=completion,
            ),
        ):
            evaluation, provider = await evaluate_interview(
                InterviewEvaluateRequest(
                    run_id="run-1",
                    session_id="session-1",
                    title="Backend Engineer",
                    industry="Công nghệ thông tin",
                    difficulty="Middle",
                    qa_history=qa_history,
                    audio_analysis={
                        "provider": "sensevoice",
                        "confidence": 80,
                    },
                )
            )

        self.assertEqual(provider, "deepseek")
        self.assertEqual(completion.await_count, 2)
        self.assertEqual(
            evaluation.questions[4].grounding_ids,
            [PROFILE_ID, EVIDENCE_ID],
        )
        repair_payload = completion.await_args_list[1].kwargs["payload"]
        self.assertTrue(repair_payload["repairRequired"])
        self.assertIn("outside the backend allow-list", repair_payload["validationError"])

    async def test_evaluation_rejects_invented_answer_evidence(self):
        qa_history = [
            {
                "questionId": f"q_{index}",
                "question": f"Câu {index}",
                "answer": f"Trả lời có evidence {index}",
            }
            for index in range(1, 6)
        ]
        response = {
            "score": 80,
            "ratings": {
                "communication": 80,
                "knowledge": 80,
                "problemSolving": 80,
                "confidence": 80,
                "jdFit": 80,
                "composure": 80,
                "vocalDelivery": 80,
            },
            "feedback": "Tóm tắt dựa trên evidence.",
            "strengths": ["Có ví dụ"],
            "weaknesses": ["Cần thêm metric"],
            "recommendations": ["Luyện STAR"],
            "questions": [
                {
                    "question": item["question"],
                    "answer": item["answer"],
                    "score": 80,
                    "feedback": "Đủ evidence.",
                    "evidence": (
                        ["metric 99% không tồn tại"]
                        if index == 0
                        else [item["answer"]]
                    ),
                    "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
                }
                for index, item in enumerate(qa_history)
            ],
            "grounding_ids": [PROFILE_ID, EVIDENCE_ID],
        }
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=SimpleNamespace(
                    deepseek_eval_model="test-model",
                    deepseek_eval_max_tokens=32_768,
                ),
            ),
            patch(
                "app.services.deepseek.prepare_grounding",
                new=AsyncMock(return_value=FakeGrounding()),
            ),
            patch(
                "app.services.deepseek._json_completion",
                new=AsyncMock(return_value=response),
            ),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "repair failed backend validation",
            ):
                await evaluate_interview(
                    InterviewEvaluateRequest(
                        run_id="run-1",
                        session_id="session-1",
                        title="Backend Engineer",
                        industry="Công nghệ thông tin",
                        difficulty="Middle",
                        qa_history=qa_history,
                        audio_analysis={
                            "provider": "sensevoice",
                            "confidence": 80,
                        },
                    )
                )


if __name__ == "__main__":
    unittest.main()

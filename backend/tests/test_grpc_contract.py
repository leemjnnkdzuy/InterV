import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import grpc

import interv_ai_pb2
import interv_ai_pb2_grpc
from app.grpc_server import IntervAiService
from app.schemas import (
    CandidateProfileItem,
    GeneratedQuestion,
    InterviewEvaluation,
)
from app.services.audio_analysis import AudioBehaviorResult, analyze_audio_behavior
from app.rag.models import RagHealth


class GrpcContractTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.settings = SimpleNamespace(
            ai_backend_internal_key="test-internal-key",
            deepseek_api_key="configured",
            assembly_ai_api_key="configured",
        )
        self.settings_patch = patch(
            "app.grpc_server.get_settings",
            return_value=self.settings,
        )
        self.settings_patch.start()
        self.rag_agent = SimpleNamespace(
            health=AsyncMock(
                return_value=RagHealth(
                    ready=True,
                    backend="qdrant-test",
                    collection="test",
                    document_count=100,
                    dense_model="test-dense",
                    sparse_model="test-sparse",
                )
            ),
            index_session_context=AsyncMock(return_value=1),
            index_turn=AsyncMock(return_value=1),
            index_completed_interview=AsyncMock(return_value=1),
            delete_interview_knowledge=AsyncMock(return_value=4),
        )
        self.rag_patch = patch(
            "app.grpc_server.get_rag_agent",
            return_value=self.rag_agent,
        )
        self.rag_patch.start()

        self.server = grpc.aio.server()
        interv_ai_pb2_grpc.add_IntervAiServicer_to_server(
            IntervAiService(),
            self.server,
        )
        self.port = self.server.add_insecure_port("127.0.0.1:0")
        await self.server.start()
        self.channel = grpc.aio.insecure_channel(f"127.0.0.1:{self.port}")
        self.stub = interv_ai_pb2_grpc.IntervAiStub(self.channel)
        self.metadata = (("x-internal-api-key", "test-internal-key"),)

    async def asyncTearDown(self):
        await self.channel.close()
        await self.server.stop(grace=None)
        self.settings_patch.stop()
        self.rag_patch.stop()

    async def test_health_requires_internal_key(self):
        with self.assertRaises(grpc.aio.AioRpcError) as caught:
            await self.stub.Health(interv_ai_pb2.HealthRequest())
        self.assertEqual(caught.exception.code(), grpc.StatusCode.UNAUTHENTICATED)

        response = await self.stub.Health(
            interv_ai_pb2.HealthRequest(),
            metadata=self.metadata,
        )
        self.assertTrue(response.success)
        self.assertEqual(response.transport, "grpc")
        self.assertTrue(response.sensevoice_ready)
        self.assertTrue(response.rag_ready)
        self.assertEqual(response.rag_document_count, 100)

    async def test_deepseek_balance_contract_does_not_expose_credentials(self):
        with patch(
            "app.grpc_server.get_deepseek_balance",
            new=AsyncMock(
                return_value={
                    "is_available": True,
                    "balances": [
                        {
                            "currency": "USD",
                            "total_balance": "5.25",
                            "granted_balance": "1.00",
                            "topped_up_balance": "4.25",
                        }
                    ],
                    "fast_model": "deepseek-v4-flash",
                    "eval_model": "deepseek-v4-pro",
                }
            ),
        ):
            response = await self.stub.GetDeepSeekBalance(
                interv_ai_pb2.DeepSeekBalanceRequest(),
                metadata=self.metadata,
            )

        self.assertTrue(response.success)
        self.assertTrue(response.is_available)
        self.assertEqual(response.balances[0].currency, "USD")
        self.assertEqual(response.balances[0].total_balance, "5.25")
        self.assertEqual(response.fast_model, "deepseek-v4-flash")
        self.assertNotIn("secret", str(response).lower())

    async def test_start_interview_prepares_all_questions_without_blocking_on_tts(self):
        generated = [
            GeneratedQuestion(
                id=f"draft-{index}",
                text=f"Câu hỏi phỏng vấn số {index}.",
                competency="jd_fit",
                difficulty="Middle",
                expected_signals=["specific evidence"],
            )
            for index in range(1, 6)
        ]
        with patch(
            "app.grpc_server.generate_questions",
            new=AsyncMock(return_value=(generated, "deepseek")),
        ) as generate, patch(
            "app.grpc_server.synthesize_preview",
            new=AsyncMock(
                return_value=SimpleNamespace(
                    audio_base64="YXVkaW8=",
                    content_type="audio/mpeg",
                    cached=True,
                )
            ),
        ) as synthesize:
            response = await self.stub.StartInterview(
                interv_ai_pb2.InterviewStartRequest(
                    context=interv_ai_pb2.InterviewContext(
                        session_id="session-1",
                        title="Frontend Engineer",
                        question_count=5,
                        language="vi-VN",
                        voice_id="hn_female_ngochuyen_full_48k-fhg",
                    )
                ),
                metadata=self.metadata,
            )

        self.assertTrue(response.success)
        self.assertEqual(response.provider, "deepseek")
        self.assertEqual(len(response.questions), 5)
        self.assertEqual(response.questions[0].id, "q_1")
        self.assertEqual(response.questions[-1].id, "q_5")
        self.assertEqual(generate.await_args.args[0].requested_questions, 5)
        self.assertEqual(generate.await_args.args[0].question_count, 5)
        synthesize.assert_not_awaited()
        self.rag_agent.index_session_context.assert_awaited_once()
        indexed_context = self.rag_agent.index_session_context.await_args.args[0]
        self.assertEqual(indexed_context.run_id, response.run_id)

    async def test_submit_answer_returns_generated_follow_up(self):
        generated = GeneratedQuestion(
            id="q_2",
            text="Kết quả đo lường cụ thể của thay đổi đó là gì?",
            competency="evidence",
            difficulty="Middle",
            expected_signals=["metric"],
        )
        with patch(
            "app.grpc_server.generate_follow_up",
            new=AsyncMock(return_value=(generated, "deepseek")),
        ):
            response = await self.stub.SubmitAnswer(
                interv_ai_pb2.InterviewAnswerRequest(
                    run_id="run-1",
                    context=interv_ai_pb2.InterviewContext(
                        session_id="session-1",
                        title="Frontend Engineer",
                        question_count=3,
                        language="vi-VN",
                    ),
                    current=interv_ai_pb2.QaPair(
                        question_id="q_1",
                        question="Bạn đã tối ưu hiệu năng như thế nào?",
                        answer="Tôi giảm bundle 30 phần trăm.",
                    ),
                    qa_history=[
                        interv_ai_pb2.QaPair(
                            question_id="q_1",
                            question="Bạn đã tối ưu hiệu năng như thế nào?",
                            answer="Tôi giảm bundle 30 phần trăm.",
                        )
                    ],
                    next_question_index=1,
                ),
                metadata=self.metadata,
            )

        self.assertTrue(response.has_next_question)
        self.assertEqual(response.next_question.id, "q_2")
        self.assertIn("kết quả", response.next_question.text.lower())
        self.assertEqual(
            self.rag_agent.index_turn.await_count,
            1,
        )

    async def test_audio_analysis_stream_returns_sensevoice_result(self):
        expected = AudioBehaviorResult(
            confidence=82,
            composure=79,
            vocal_delivery=84,
            dominant_emotion="neutral",
            observations=["Giọng nói ổn định."],
            recommendations=["Dừng ngắn giữa các ý."],
            speaking_rate_wpm=132,
            pace_consistency=84,
            pause_ratio=18,
            volume_stability=86,
            filler_word_count=1,
            average_answer_duration_sec=52,
            analyzed_answer_count=1,
            total_word_count=114,
            provider="sensevoice",
        )

        async def chunks():
            yield interv_ai_pb2.AudioAnalysisChunk(
                run_id="run-1",
                question_id="q_1",
                transcript="Câu trả lời",
                audio=b"audio-bytes",
                content_type="audio/webm",
                duration_sec=4.2,
                final_chunk=True,
            )

        with patch(
            "app.grpc_server.analyze_audio_behavior",
            new=AsyncMock(return_value=expected),
        ):
            response = await self.stub.AnalyzeInterview(
                chunks(),
                metadata=self.metadata,
            )

        self.assertTrue(response.success)
        self.assertEqual(response.analysis.provider, "sensevoice")
        self.assertEqual(response.analysis.confidence, 82)

    async def test_evaluate_interview_indexes_completed_grounded_record(self):
        grounding_ids = [
            "rule:profile:information-technology:middle",
            "rule:profile:information-technology:middle#chunk-3",
        ]
        evaluation = InterviewEvaluation(
            score=80,
            ratings={
                "communication": 80,
                "knowledge": 80,
                "problemSolving": 80,
                "confidence": 80,
                "jdFit": 80,
                "composure": 80,
                "vocalDelivery": 80,
            },
            feedback="Có evidence.",
            strengths=["Rõ ràng"],
            weaknesses=["Cần thêm metric"],
            recommendations=["Luyện STAR"],
            questions=[
                {
                    "question": f"Câu {index}",
                    "answer": f"Trả lời {index}",
                    "score": 80,
                    "feedback": "Đủ evidence",
                    "evidence": [f"Trả lời {index}"],
                    "grounding_ids": grounding_ids,
                }
                for index in range(1, 6)
            ],
            audio_analysis={
                "confidence": 80,
                "composure": 80,
                "vocal_delivery": 80,
                "dominant_emotion": "neutral",
                "observations": ["Ổn định"],
                "provider": "sensevoice",
            },
            grounding_ids=grounding_ids,
        )
        qa_history = [
            interv_ai_pb2.QaPair(
                question_id=f"q_{index}",
                question=f"Câu {index}",
                answer=f"Trả lời {index}",
                grounding_ids=grounding_ids,
            )
            for index in range(1, 6)
        ]
        with patch(
            "app.grpc_server.evaluate_interview",
            new=AsyncMock(return_value=(evaluation, "deepseek")),
        ):
            response = await self.stub.EvaluateInterview(
                interv_ai_pb2.InterviewEvaluateRequest(
                    run_id="run-1",
                    context=interv_ai_pb2.InterviewContext(
                        session_id="session-1",
                        title="Backend Engineer",
                        industry="Công nghệ thông tin",
                        difficulty="Middle",
                        question_count=5,
                        language="vi-VN",
                    ),
                    qa_history=qa_history,
                    audio_analysis=interv_ai_pb2.AudioBehaviorAnalysis(
                        confidence=80,
                        composure=80,
                        vocal_delivery=80,
                        dominant_emotion="neutral",
                        observations=["Ổn định"],
                        provider="sensevoice",
                    ),
                ),
                metadata=self.metadata,
            )

        self.assertTrue(response.success)
        self.assertEqual(len(response.evaluation.questions), 5)
        self.assertEqual(list(response.evaluation.grounding_ids), grounding_ids)
        self.rag_agent.index_completed_interview.assert_awaited_once()

    async def test_delete_knowledge_is_available_over_grpc(self):
        response = await self.stub.DeleteKnowledge(
            interv_ai_pb2.RagDeleteRequest(session_id="session-1"),
            metadata=self.metadata,
        )
        self.assertTrue(response.success)
        self.assertEqual(response.deleted_count, 4)
        self.rag_agent.delete_interview_knowledge.assert_awaited_once_with(
            session_id="session-1",
            run_id="",
        )

    async def test_candidate_profile_extraction_returns_structured_items(self):
        items = [
            CandidateProfileItem(
                category="experience",
                label="Kinh nghiệm",
                value="3 năm backend",
                evidence=["Tôi có 3 năm backend"],
            )
        ]
        with patch(
            "app.grpc_server.extract_candidate_profile",
            new=AsyncMock(return_value=(items, "deepseek")),
        ):
            response = await self.stub.ExtractCandidateProfile(
                interv_ai_pb2.CandidateProfileRequest(
                    transcript="Tôi có 3 năm backend.",
                    title="Backend Engineer",
                    job_description="Xây dựng API.",
                    language="vi-VN",
                ),
                metadata=self.metadata,
            )

        self.assertTrue(response.success)
        self.assertEqual(response.provider, "deepseek")
        self.assertEqual(response.items[0].category, "experience")
        self.assertEqual(response.items[0].value, "3 năm backend")


class SenseVoiceInvariantTests(unittest.IsolatedAsyncioTestCase):
    async def test_audio_analysis_rejects_empty_audio(self):
        with self.assertRaisesRegex(
            ValueError,
            "requires at least one recorded audio",
        ):
            await analyze_audio_behavior([])


if __name__ == "__main__":
    unittest.main()

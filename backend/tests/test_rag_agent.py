import unittest

from qdrant_client import QdrantClient

from app.rag.agent import InterviewRagAgent
from app.rag.embeddings import DeterministicEmbeddingProvider
from app.rag.models import InterviewKnowledgeRecord
from app.rag.store import QdrantKnowledgeStore
from app.rules import get_rule_catalog


class RagAgentTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = QdrantClient(":memory:")
        self.store = QdrantKnowledgeStore(
            collection_name="interv_test_knowledge",
            embedding_provider=DeterministicEmbeddingProvider(),
            client=self.client,
        )
        self.agent = InterviewRagAgent(
            store=self.store,
            rule_catalog=get_rule_catalog(),
            top_k=12,
            candidate_limit=40,
        )
        await self.agent.initialize()

    async def asyncTearDown(self):
        self.store.close()

    async def test_bootstrap_indexes_rule_corpus_and_retrieves_profile_evidence(self):
        health = await self.agent.health(initialize=False)
        self.assertTrue(health.ready)
        self.assertGreater(health.document_count, 84)

        evidence = await self.agent.retrieve_for_interview(
            purpose="question",
            title="Senior Backend Engineer",
            industry="Công nghệ thông tin",
            level="Senior",
            job_description="Thiết kế API, xử lý production incident và SLO.",
            topic="system design",
            session_id="session-1",
            top_k=12,
        )
        self.assertTrue(evidence)
        self.assertTrue(
            any(item.document_type == "rule_chunk" for item in evidence)
        )
        self.assertTrue(
            any(
                item.industry in {"Công nghệ thông tin", "*"}
                for item in evidence
            )
        )

    async def test_retrieval_excludes_rules_from_other_tiers(self):
        evidence = await self.agent.retrieve_for_interview(
            purpose="question",
            title="Marketing Executive",
            industry="Marketing & Quảng cáo",
            level="Executive",
            job_description=(
                "Tự lập kế hoạch, chịu trách nhiệm đầu-cuối và phối hợp stakeholder."
            ),
            topic="ownership",
            session_id="session-tier-filter",
            top_k=40,
        )
        level_rule_ids = {
            item.grounding_id.split("#", 1)[0]
            for item in evidence
            if item.grounding_id.startswith("rule:level:")
        }
        self.assertIn("rule:level:tier-2-independent", level_rule_ids)
        self.assertEqual(level_rule_ids, {"rule:level:tier-2-independent"})

    async def test_indexing_is_idempotent_and_generation_never_leaks_raw_answer(self):
        private_answer = "MẬT_KHẨU_NỘI_BỘ tuyệt đối không được lộ"
        record = InterviewKnowledgeRecord(
            run_id="run-private-1",
            session_id="session-private-1",
            title="Backend Engineer",
            industry="Công nghệ thông tin",
            level="Middle",
            tier=2,
            language="vi-VN",
            job_description="Xây API ổn định.",
            topic="debugging",
            qa_history=(
                {
                    "questionId": "q_1",
                    "question": "Bạn xử lý incident production thế nào?",
                    "answer": private_answer,
                },
            ),
            evaluation={
                "score": 80,
                "questions": [
                    {
                        "question": "Bạn xử lý incident production thế nào?",
                        "answer": private_answer,
                        "score": 80,
                        "feedback": "Có evidence.",
                    }
                ],
            },
            audio_analysis={"provider": "sensevoice", "confidence": 80},
        )

        await self.agent.index_session_context(record)
        await self.agent.index_turn(record, record.qa_history[0], 0)
        await self.agent.index_completed_interview(record)
        first_count = self.store.count()

        await self.agent.index_session_context(record)
        await self.agent.index_turn(record, record.qa_history[0], 0)
        await self.agent.index_completed_interview(record)
        self.assertEqual(self.store.count(), first_count)

        public_evidence = await self.agent.retrieve_for_interview(
            purpose="question",
            title=record.title,
            industry=record.industry,
            level=record.level,
            job_description=record.job_description,
            topic=private_answer,
            session_id="another-session",
            top_k=20,
        )
        self.assertFalse(
            any(private_answer in item.text for item in public_evidence)
        )
        self.assertFalse(
            any(item.document_type == "interview_turn" for item in public_evidence)
        )

        private_evidence = await self.agent.audit_session(
            session_id=record.session_id,
            industry=record.industry,
            level=record.level,
            query_text=private_answer,
            top_k=20,
        )
        self.assertTrue(
            any(private_answer in item.text for item in private_evidence)
        )

        deleted = await self.agent.delete_interview_knowledge(
            session_id=record.session_id
        )
        self.assertEqual(deleted, 4)
        self.assertEqual(self.store.count(), first_count - 4)


if __name__ == "__main__":
    unittest.main()

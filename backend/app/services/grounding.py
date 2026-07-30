from __future__ import annotations

from dataclasses import dataclass

from app.rag import RetrievedEvidence, get_rag_agent
from app.rules import RuleBundle, get_rule_catalog


@dataclass(frozen=True)
class GroundingPackage:
    bundle: RuleBundle
    evidence: tuple[RetrievedEvidence, ...]

    @property
    def profile_rule_id(self) -> str:
        return self.bundle.profile.rule_id

    @property
    def evidence_ids(self) -> tuple[str, ...]:
        return tuple(item.grounding_id for item in self.evidence)

    @property
    def allowed_ids(self) -> frozenset[str]:
        return frozenset((*self.bundle.rule_ids, *self.evidence_ids))

    def render(self) -> dict[str, object]:
        rag_agent = get_rag_agent()
        return {
            "resolvedProfile": {
                "industry": self.bundle.profile.industry.name,
                "level": self.bundle.profile.level,
                "tier": self.bundle.profile.tier.index,
                "profileRuleId": self.profile_rule_id,
            },
            "mandatoryRuleBundle": self.bundle.render(),
            "retrievedEvidence": rag_agent.render_evidence(self.evidence),
            "allowedGroundingIds": sorted(self.allowed_ids),
            "requiredGrounding": {
                "mustIncludeProfileRuleId": self.profile_rule_id,
                "mustIncludeAtLeastOneRetrievedEvidenceId": True,
                "unknownIdsAreForbidden": True,
            },
        }


async def prepare_grounding(
    *,
    purpose: str,
    session_id: str,
    run_id: str,
    title: str,
    industry: str,
    level: str,
    job_description: str,
    topic: str,
    latest_question: str = "",
    latest_answer: str = "",
) -> GroundingPackage:
    bundle = get_rule_catalog().bundle_for(industry, level)
    evidence = await get_rag_agent().retrieve_for_interview(
        purpose=purpose,
        title=title,
        industry=bundle.profile.industry.name,
        level=bundle.profile.level,
        job_description=job_description,
        topic=topic,
        session_id=session_id,
        run_id=run_id,
        latest_question=latest_question,
        latest_answer=latest_answer,
        top_k=get_rag_agent().top_k,
    )
    return GroundingPackage(bundle=bundle, evidence=tuple(evidence))


def validate_grounding_ids(
    grounding_ids: list[str],
    package: GroundingPackage,
    *,
    label: str,
) -> list[str]:
    normalized = list(dict.fromkeys(item.strip() for item in grounding_ids if item.strip()))
    if not normalized:
        raise RuntimeError(f"{label} has no grounding_ids")
    unknown = sorted(set(normalized) - package.allowed_ids)
    if unknown:
        raise RuntimeError(
            f"{label} contains grounding IDs outside the backend allow-list: "
            + ", ".join(unknown)
        )
    if package.profile_rule_id not in normalized:
        raise RuntimeError(
            f"{label} must cite profile rule {package.profile_rule_id}"
        )
    if not set(normalized).intersection(package.evidence_ids):
        raise RuntimeError(
            f"{label} must cite at least one retrieved Qdrant evidence ID"
        )
    return normalized

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.rules.catalog import INDUSTRIES, TIERS, ProfileSpec, all_profiles, resolve_profile


RULE_ROOT = Path(__file__).resolve().parents[2] / "rules" / "interview"
CORE_RULE_SLUGS = (
    "structured-interview",
    "behavioral-probing",
    "evidence-scoring",
    "fairness-ethics",
    "ai-grounding",
)
REQUIRED_HEADINGS = (
    "## Phạm vi áp dụng",
    "## Quy tắc bắt buộc",
    "## Nguồn",
)
SOURCE_PATTERN = re.compile(r"\[([A-Z][A-Z0-9_-]{3,})\]")


class RuleValidationError(RuntimeError):
    pass


@dataclass(frozen=True)
class RuleDocument:
    rule_id: str
    path: Path
    content: str
    kind: str
    industry: str = "*"
    level: str = "*"
    tier: int = 0

    @property
    def source_ids(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys(SOURCE_PATTERN.findall(self.content)))


@dataclass(frozen=True)
class RuleBundle:
    profile: ProfileSpec
    documents: tuple[RuleDocument, ...]

    @property
    def rule_ids(self) -> tuple[str, ...]:
        return tuple(document.rule_id for document in self.documents)

    @property
    def source_ids(self) -> tuple[str, ...]:
        return tuple(
            dict.fromkeys(
                source_id
                for document in self.documents
                for source_id in document.source_ids
            )
        )

    def render(self, max_characters: int = 36_000) -> str:
        blocks: list[str] = []
        total = 0
        for document in self.documents:
            block = f"\n\n<RULE id=\"{document.rule_id}\">\n{document.content}\n</RULE>"
            if blocks and total + len(block) > max_characters:
                break
            blocks.append(block)
            total += len(block)
        return "".join(blocks).strip()


class RuleCatalog:
    def __init__(self, root: Path = RULE_ROOT) -> None:
        self.root = root

    def _read(
        self,
        *,
        rule_id: str,
        relative_path: str,
        kind: str,
        industry: str = "*",
        level: str = "*",
        tier: int = 0,
    ) -> RuleDocument:
        path = self.root / relative_path
        if not path.is_file():
            raise RuleValidationError(f"Missing mandatory interview rule: {path}")
        content = path.read_text(encoding="utf-8").strip()
        return RuleDocument(
            rule_id=rule_id,
            path=path,
            content=content,
            kind=kind,
            industry=industry,
            level=level,
            tier=tier,
        )

    def bundle_for(self, industry: str, level: str) -> RuleBundle:
        profile = resolve_profile(industry, level)
        core = tuple(
            self._read(
                rule_id=f"rule:core:{slug}",
                relative_path=f"core/{slug}.md",
                kind="core",
            )
            for slug in CORE_RULE_SLUGS
        )
        industry_rule = self._read(
            rule_id=f"rule:industry:{profile.industry.slug}",
            relative_path=f"industries/{profile.industry.slug}.md",
            kind="industry",
            industry=profile.industry.name,
        )
        level_rule = self._read(
            rule_id=f"rule:level:{profile.tier.slug}",
            relative_path=f"levels/{profile.tier.slug}.md",
            kind="level",
            level="*",
            tier=profile.tier.index,
        )
        profile_rule = self._read(
            rule_id=profile.rule_id,
            relative_path=(
                f"profiles/{profile.industry.slug}/{profile.level_slug}.md"
            ),
            kind="profile",
            industry=profile.industry.name,
            level=profile.level,
            tier=profile.tier.index,
        )
        return RuleBundle(
            profile=profile,
            documents=(*core, industry_rule, level_rule, profile_rule),
        )

    def all_documents(self) -> tuple[RuleDocument, ...]:
        documents: dict[str, RuleDocument] = {}
        for profile in all_profiles():
            bundle = self.bundle_for(profile.industry.name, profile.level)
            for document in bundle.documents:
                documents[document.rule_id] = document
        return tuple(documents.values())

    def validate(self) -> dict[str, int]:
        errors: list[str] = []
        documents: tuple[RuleDocument, ...]
        try:
            documents = self.all_documents()
        except RuleValidationError as error:
            raise error

        for document in documents:
            if document.kind == "profile":
                for heading in REQUIRED_HEADINGS:
                    if heading not in document.content:
                        errors.append(f"{document.path}: missing heading {heading}")
            if not document.source_ids:
                errors.append(f"{document.path}: no source citation IDs")

        sources_path = self.root / "sources.md"
        if not sources_path.is_file():
            errors.append(f"{sources_path}: missing source register")
            sources = ""
        else:
            sources = sources_path.read_text(encoding="utf-8")
        known_sources = set(SOURCE_PATTERN.findall(sources))
        cited_sources = {
            source_id
            for document in documents
            for source_id in document.source_ids
        }
        missing_sources = sorted(cited_sources - known_sources)
        if missing_sources:
            errors.append(
                "Source IDs absent from sources.md: " + ", ".join(missing_sources)
            )

        profile_documents = [
            document for document in documents if document.kind == "profile"
        ]
        if len(INDUSTRIES) != 15:
            errors.append(f"Expected 15 industries, found {len(INDUSTRIES)}")
        if len(profile_documents) != 60:
            errors.append(
                f"Expected 60 industry-level profiles, found {len(profile_documents)}"
            )
        if len(TIERS) != 4:
            errors.append(f"Expected 4 tiers, found {len(TIERS)}")

        if errors:
            raise RuleValidationError("\n".join(errors))
        return {
            "industries": len(INDUSTRIES),
            "tiers": len(TIERS),
            "profiles": len(profile_documents),
            "documents": len(documents),
            "sources": len(known_sources),
        }


@lru_cache(maxsize=1)
def get_rule_catalog() -> RuleCatalog:
    return RuleCatalog()

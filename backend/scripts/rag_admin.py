from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.rag import RetrievalQuery, get_rag_agent
from app.rules import get_rule_catalog, resolve_profile


def print_json(value: object) -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(value, ensure_ascii=False, indent=2, default=str))


async def status() -> int:
    health = await get_rag_agent().health()
    print_json(
        {
            "ready": health.ready,
            "backend": health.backend,
            "collection": health.collection,
            "documentCount": health.document_count,
            "denseModel": health.dense_model,
            "sparseModel": health.sparse_model,
            "error": health.error,
        }
    )
    return 0 if health.ready else 1


async def bootstrap() -> int:
    validation = get_rule_catalog().validate()
    health = await get_rag_agent().initialize()
    print_json(
        {
            "rules": validation,
            "rag": {
                "ready": health.ready,
                "backend": health.backend,
                "collection": health.collection,
                "documentCount": health.document_count,
            },
        }
    )
    return 0


async def rebuild(confirmed: bool) -> int:
    if not confirmed:
        print("Rebuild deletes the selected Qdrant collection. Pass --yes to continue.")
        return 2
    agent = get_rag_agent()
    health = await agent.rebuild()
    print_json(
        {
            "rebuilt": True,
            "collection": health.collection,
            "documentCount": health.document_count,
        }
    )
    return 0


async def search(args: argparse.Namespace) -> int:
    profile = resolve_profile(args.industry, args.level)
    evidence = await get_rag_agent().retrieve(
        RetrievalQuery(
            text=args.query,
            purpose=args.purpose,
            industry=profile.industry.name,
            level=profile.level,
            tier=profile.tier.index,
            session_id=args.session_id,
            run_id=args.run_id,
            top_k=args.limit,
        )
    )
    print_json(
        {
            "profile": {
                "industry": profile.industry.name,
                "level": profile.level,
                "tier": profile.tier.index,
            },
            "evidence": [
                {
                    "groundingId": item.grounding_id,
                    "title": item.title,
                    "score": item.score,
                    "documentType": item.document_type,
                    "industry": item.industry,
                    "level": item.level,
                    "sourceIds": item.source_ids,
                    "text": item.text,
                }
                for item in evidence
            ],
        }
    )
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Administer the backend InterV RAG index")
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("status")
    commands.add_parser("bootstrap")
    rebuild_parser = commands.add_parser("rebuild")
    rebuild_parser.add_argument("--yes", action="store_true")

    search_parser = commands.add_parser("search")
    search_parser.add_argument("query")
    search_parser.add_argument("--industry", default="Công nghệ thông tin")
    search_parser.add_argument("--level", default="Middle")
    search_parser.add_argument(
        "--purpose",
        choices=("question", "follow_up", "evaluation", "audit"),
        default="question",
    )
    search_parser.add_argument("--session-id", default="")
    search_parser.add_argument("--run-id", default="")
    search_parser.add_argument("--limit", type=int, default=8)
    return root


async def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "status":
            return await status()
        if args.command == "bootstrap":
            return await bootstrap()
        if args.command == "rebuild":
            return await rebuild(args.yes)
        if args.command == "search":
            if args.purpose == "audit" and not args.session_id:
                print("--session-id is required for audit retrieval")
                return 2
            args.limit = max(1, min(args.limit, 20))
            return await search(args)
        return 2
    finally:
        agent = get_rag_agent()
        await asyncio.to_thread(agent.store.close)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

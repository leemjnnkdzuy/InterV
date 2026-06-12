import re
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings
from app.schemas import JdExtractResponse, NormalizedJd


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def _detect_language(text: str) -> str:
    vietnamese_marks = "ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợúùủũụứừửữựíìỉĩịýỳỷỹỵ"
    if any(ch in text.lower() for ch in vietnamese_marks):
        return "vi"
    if re.search(r"[\u4e00-\u9fff]", text):
        return "zh"
    return "en"


def _extract_bullets(section_text: str) -> list[str]:
    lines = []
    for raw in section_text.splitlines():
        line = raw.strip(" -•\t")
        if len(line) >= 8:
            lines.append(line)
    return lines[:12]


def normalize_jd(markdown: str) -> NormalizedJd:
    text = markdown.strip()
    lower = text.lower()
    skills = []
    for skill in [
        "react",
        "next.js",
        "node.js",
        "python",
        "java",
        "sql",
        "mongodb",
        "docker",
        "kafka",
        "redis",
        "marketing",
        "sales",
        "seo",
    ]:
        if skill in lower:
            skills.append(skill)

    seniority = None
    for level in ["intern", "junior", "middle", "senior", "lead", "manager", "director"]:
        if level in lower:
            seniority = level.title()
            break

    responsibilities = []
    requirements = []
    sections = re.split(r"\n(?=#|[A-ZÀ-Ỹ ].{3,}:)", text)
    for section in sections:
        section_lower = section.lower()
        if any(key in section_lower for key in ["responsib", "mô tả", "nhiệm vụ", "công việc"]):
            responsibilities.extend(_extract_bullets(section))
        if any(key in section_lower for key in ["require", "yêu cầu", "qualification", "skills"]):
            requirements.extend(_extract_bullets(section))

    first_heading = None
    for line in text.splitlines():
        clean = line.strip("# ").strip()
        if len(clean) >= 6:
            first_heading = clean[:120]
            break

    return NormalizedJd(
        title=first_heading,
        responsibilities=responsibilities[:10],
        requirements=requirements[:10],
        skills=skills,
        seniority=seniority,
        language=_detect_language(text),
    )


async def extract_jd(file: UploadFile) -> JdExtractResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .pdf, .docx, and .txt files are supported",
        )

    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File must be smaller than {get_settings().max_upload_mb}MB",
        )

    markdown = ""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        if suffix == ".txt":
            markdown = data.decode("utf-8", errors="ignore")
        else:
            try:
                from markitdown import MarkItDown

                result = MarkItDown().convert(str(tmp_path))
                markdown = result.text_content
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Could not extract text from document: {exc}",
                ) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    markdown = markdown.strip()
    if not markdown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document did not contain extractable text",
        )

    return JdExtractResponse(markdown=markdown, normalized=normalize_jd(markdown))

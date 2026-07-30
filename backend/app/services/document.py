import asyncio
import logging
import re
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings
from app.schemas import JdExtractResponse, NormalizedJd


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_EXTRACTED_CHARACTERS = 250_000
MAX_DOCX_ENTRIES = 2_000
MAX_DOCX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024
MAX_DOCX_COMPRESSION_RATIO = 100
logger = logging.getLogger(__name__)


def _detect_language(text: str) -> str:
    vietnamese_marks = (
        "ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợ"
        "úùủũụứừửữựíìỉĩịýỳỷỹỵ"
    )
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
    for level in [
        "intern",
        "junior",
        "middle",
        "senior",
        "lead",
        "manager",
        "director",
    ]:
        if level in lower:
            seniority = level.title()
            break

    responsibilities = []
    requirements = []
    sections = re.split(r"\n(?=#|[A-ZÀ-Ỹ ].{3,}:)", text)
    for section in sections:
        section_lower = section.lower()
        if any(
            key in section_lower
            for key in ["responsib", "mô tả", "nhiệm vụ", "công việc"]
        ):
            responsibilities.extend(_extract_bullets(section))
        if any(
            key in section_lower
            for key in ["require", "yêu cầu", "qualification", "skills"]
        ):
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


def _validate_docx(data: bytes) -> None:
    try:
        from io import BytesIO

        with zipfile.ZipFile(BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_DOCX_ENTRIES:
                raise ValueError("DOCX contains too many archive entries")
            names = {entry.filename for entry in entries}
            if (
                "[Content_Types].xml" not in names
                or "word/document.xml" not in names
            ):
                raise ValueError("File is not a valid DOCX document")

            total_uncompressed = 0
            for entry in entries:
                path = PurePosixPath(entry.filename)
                if path.is_absolute() or ".." in path.parts:
                    raise ValueError("DOCX contains an unsafe archive path")
                if entry.filename.casefold().endswith("vbaproject.bin"):
                    raise ValueError("Macro-enabled documents are not allowed")
                total_uncompressed += entry.file_size
                if total_uncompressed > MAX_DOCX_UNCOMPRESSED_BYTES:
                    raise ValueError("DOCX expands beyond the allowed size")
                if (
                    entry.file_size > 1 * 1024 * 1024
                    and entry.file_size
                    > max(1, entry.compress_size) * MAX_DOCX_COMPRESSION_RATIO
                ):
                    raise ValueError("DOCX compression ratio is unsafe")
    except zipfile.BadZipFile as error:
        raise ValueError("File is not a valid DOCX document") from error


def _validate_signature(suffix: str, data: bytes) -> None:
    if not data:
        raise ValueError("Uploaded document is empty")
    if suffix == ".pdf" and not data.startswith(b"%PDF-"):
        raise ValueError("File signature does not match PDF")
    if suffix == ".docx":
        if not data.startswith(b"PK"):
            raise ValueError("File signature does not match DOCX")
        _validate_docx(data)
    if suffix == ".txt" and b"\x00" in data:
        raise ValueError("Text document contains binary content")


def _convert_document(path: Path) -> str:
    from markitdown import MarkItDown

    result = MarkItDown().convert(str(path))
    return result.text_content


async def extract_jd(file: UploadFile) -> JdExtractResponse:
    filename = file.filename or ""
    if len(filename) > 180 or "\x00" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .pdf, .docx, and .txt files are supported",
        )

    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File must be smaller than {settings.max_upload_mb}MB",
        )
    try:
        _validate_signature(suffix, data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(error),
        ) from error

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        if suffix == ".txt":
            markdown = data.decode("utf-8", errors="strict")
        else:
            try:
                markdown = await asyncio.wait_for(
                    asyncio.to_thread(_convert_document, tmp_path),
                    timeout=settings.document_parse_timeout_seconds,
                )
            except TimeoutError as error:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Document parsing timed out",
                ) from error
            except Exception as error:
                logger.exception("Document parser rejected an upload")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not safely extract text from document",
                ) from error
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text files must use UTF-8 encoding",
        ) from error
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not immediately remove temporary upload %s", tmp_path)

    markdown = markdown.strip()
    if not markdown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document did not contain extractable text",
        )
    if len(markdown) > MAX_EXTRACTED_CHARACTERS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Extracted document text exceeds the allowed size",
        )

    return JdExtractResponse(
        markdown=markdown,
        normalized=normalize_jd(markdown),
    )

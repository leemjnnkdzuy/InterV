# -*- coding: utf-8 -*-
"""
Script to generate the ultimate 15-minute speaking script for KLTN InterV
covering all 37 slides (including 6 Section Dividers and Top-Left #xx badges).
Outputs: Kich_Ban_Thuyet_Trinh_KLTN_InterV_15Phut_v2.docx
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    
    borders = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
    for border_name, border_style in borders.items():
        if border_style:
            b_elm = parse_xml(f'<w:{border_name} {nsdecls("w")} w:val="{border_style.get("val", "single")}" w:sz="{border_style.get("sz", "4")}" w:space="0" w:color="{border_style.get("color", "auto")}"/>')
            tcBorders.append(b_elm)
        else:
            b_elm = parse_xml(f'<w:{border_name} {nsdecls("w")} w:val="none"/>')
            tcBorders.append(b_elm)
    tcPr.append(tcBorders)

def create_callout_box(doc, title, text, bg_hex="F0FDF4", border_hex="16A34A", icon="💡"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=160, bottom=160, left=200, right=200)
    set_cell_borders(cell, left={"val": "single", "sz": "24", "color": border_hex})
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_icon = p.add_run(f"{icon} {title}\n")
    run_icon.font.name = "Arial"
    run_icon.font.size = Pt(11)
    run_icon.font.bold = True
    run_icon.font.color.rgb = RGBColor(22, 101, 52) if border_hex == "16A34A" else RGBColor(185, 28, 28)
    
    run_text = p.add_run(text)
    run_text.font.name = "Arial"
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def build_speaking_script_docx():
    doc = Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    # Styles
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title_p.add_run("KỊCH BẢN THUYẾT TRÌNH BẢO VỆ KHÓA LUẬN TỐT NGHIỆP\n")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(17)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    run_sub = title_p.add_run(
        "ĐỀ TÀI: NGHIÊN CỨU THIẾT KẾ VÀ PHÁT TRIỂN KIẾN TRÚC HỆ THỐNG PHỎNG VẤN NĂNG LỰC TỰ ĐỘNG TÍCH HỢP XỬ LÝ GIỌNG NÓI ĐA TẦNG, TRUY XUẤT TRI THỨC TĂNG CƯỜNG (RAG) VÀ MÔ HÌNH NGÔN NGỮ LỚN - INTERV\n"
        "(Chuẩn thời lượng: 15 Phút | Đồng bộ Bộ Slide 37 Trang & 6 Phần Phân Cách)"
    )
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(11)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(22, 101, 52) # Forest green

    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.space_after = Pt(14)
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_meta = meta_p.add_run("Sinh viên: Lê Minh Duy  |  GVHD: ThS. Đặng Văn Lực  |  Thời lượng tối đa: 15 Phút + 10 Phút Q&A")
    run_meta.font.name = "Arial"
    run_meta.font.size = Pt(9.5)
    run_meta.font.italic = True
    run_meta.font.color.rgb = RGBColor(100, 116, 139)

    def add_section_heading(text, level=1):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.bold = True
        if level == 1:
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(15, 23, 42)
            pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="16A34A"/></w:pBdr>')
            h._p.get_or_add_pPr().append(pBdr)
        elif level == 2:
            r.font.size = Pt(11.5)
            r.font.color.rgb = RGBColor(22, 101, 52)
        return h

    # --- PHẦN 1: BẢNG PHÂN BỔ THỜI GIAN 6 PHẦN ---
    add_section_heading("PHẦN I. MA TRẬN PHÂN BỔ THỜI GIAN 6 PHẦN (CHÍNH XÁC 15 PHÚT)", level=1)
    
    doc.add_paragraph(
        "Chiến lược thời gian: Dành trọn vẹn 10 phút (67% thời lượng) cho Phần 03 - Thiết kế Kiến trúc & Pipeline Cốt lõi "
        "(Lookahead 0ms, Grounded RAG, Pipeline tiếng nói 2 pha Realtime & Hậu kỳ, Typed gRPC). "
        "5 phút còn lại chia đều cho Bối cảnh/Ranh giới (Phần 01, 02), Hiện vật/Bằng chứng (Phần 04, 05) và Kết luận (Phần 06)."
    )

    table_data = [
        ("Phần", "Phạm vi Slide", "Chủ đề & Nội dung Trọng tâm", "Thời gian", "Tỷ trọng"),
        ("01", "Slide 1 - 7 (#01)", "Bìa, Lộ trình, Bài toán, 3 Actor & 4 Nguyên tắc khóa phạm vi", "02:00", "13.3%"),
        ("02", "Slide 8 - 10 (#02)", "Phương pháp nghiên cứu, Xác minh kỹ thuật & Ánh xạ STAR/BARS", "00:35", "3.9%"),
        ("03", "Slide 11 - 20 (#03)", "KIẾN TRÚC & PIPELINE CỐT LÕI (Lookahead 0ms, RAG, Speech 2 pha, gRPC)", "08:10", "54.4%"),
        ("04", "Slide 21 - 26 (#04)", "Sản phẩm: RBAC, State Machine, Recruiter lifecycle & Fallback", "01:35", "10.6%"),
        ("05", "Slide 27 - 31 (#05)", "Bằng chứng: 72k LOC, 51/51 Tests 100%, 3 điểm kiểm soát LLM & SenseVoice", "01:55", "12.8%"),
        ("06", "Slide 32 - 37 (#06)", "Kết luận: 4 Đóng góp, Giới hạn nghiên cứu, 4 Cổng kiểm soát & Lời cảm ơn", "00:45", "5.0%"),
        ("TỔNG", "37 Slides", "Toàn bộ bài bảo vệ Khóa luận Tốt nghiệp InterV", "15:00", "100.0%")
    ]

    table = doc.add_table(rows=len(table_data), cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(0.6), Inches(1.3), Inches(3.0), Inches(0.8), Inches(0.8)]
    for i, col in enumerate(table.columns):
        col.width = col_widths[i]

    for row_idx, row_data in enumerate(table_data):
        row = table.rows[row_idx]
        is_header = (row_idx == 0)
        is_total = (row_idx == len(table_data) - 1)
        
        for col_idx, cell_value in enumerate(row_data):
            cell = row.cells[col_idx]
            cell.width = col_widths[col_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            if col_idx in [0, 1, 3, 4]:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            r = p.add_run(cell_value)
            r.font.name = "Arial"
            
            if is_header:
                set_cell_background(cell, "166534") # Dark green
                r.font.size = Pt(9.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            elif is_total:
                set_cell_background(cell, "F0FDF4")
                r.font.size = Pt(9.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(22, 101, 52)
            else:
                bg = "FFFFFF" if row_idx % 2 != 0 else "F8FAFC"
                set_cell_background(cell, bg)
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(30, 41, 59)
                
            if col_idx == 0 and not is_header:
                r.font.bold = True
                r.font.color.rgb = RGBColor(22, 101, 52)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # --- PHẦN 2: KỊCH BẢN NÓI CHI TIẾT TỪNG PHẦN VÀ SLIDE ---
    add_section_heading("PHẦN II. KỊCH BẢN NÓI CHI TIẾT 6 PHẦN (CHÍNH XÁC 15 PHÚT)", level=1)
    
    doc.add_paragraph(
        "Kịch bản dưới đây phân rã theo đúng 6 phần của bài trình bày. "
        "Sinh viên đọc tự tin, phát âm rõ ràng, không đọc nguyên văn slide mà diễn giải cơ chế kỹ thuật và quyết định kiến trúc."
    )

    sections_script = [
        {
            "sec_title": "PHẦN 01: BÀI TOÁN, BỐI CẢNH & KHÓA PHẠM VI (SLIDES 1 - 7 | 02:00)",
            "slides": [
                {
                    "slide_num": "Slide 1 (Bìa)",
                    "title": "Trang bìa - Giới thiệu đề tài",
                    "time": "00:00 - 00:30 (30s)",
                    "badge": "",
                    "script": (
                        "Kính thưa quý Thầy Cô trong Hội đồng chấm khóa luận tốt nghiệp. "
                        "Em tên là Lê Minh Duy, sinh viên lớp Công nghệ Thông tin. "
                        "Hôm nay, em xin phép được đại diện nhóm nghiên cứu trình bày đề tài khóa luận tốt nghiệp: "
                        "'Nghiên cứu thiết kế và phát triển kiến trúc hệ thống phỏng vấn năng lực tự động tích hợp xử lý giọng nói đa tầng, truy xuất tri thức tăng cường (RAG) và mô hình ngôn ngữ lớn' (InterV), "
                        "dưới sự hướng dẫn tận tình của Thầy ThS. Đặng Văn Lực.\n\n"
                        "InterV là một nền tảng phỏng vấn giọng nói hai chế độ: Luyện tập cá nhân và Tuyển dụng thực tế, "
                        "kết hợp mô hình DeepSeek, hệ thống vector Qdrant RAG, và mô hình phân tích âm thanh đa phương thức SenseVoice."
                    ),
                    "note": "Chào Hội đồng to, rõ, tư thế đĩnh đạc, ánh mắt bao quát toàn bộ Hội đồng."
                },
                {
                    "slide_num": "Slide 2 (Lộ trình)",
                    "title": "Lộ trình trình bày",
                    "time": "00:30 - 00:50 (20s)",
                    "badge": "",
                    "script": (
                        "Nội dung báo cáo gồm 6 phần chính: 01 Bài toán, 02 Phương pháp, 03 Thiết kế, 04 Sản phẩm, 05 Bằng chứng, và 06 Kết luận. "
                        "Để làm nổi bật chiều sâu công nghệ, em xin phép dành 10 phút trọng tâm cho Pipeline Cốt lõi ở Phần 3, "
                        "và 5 phút cho bối cảnh, ranh giới và hiện vật triển khai."
                    ),
                    "note": "Nhấn mạnh cấu trúc 6 phần mạch lạc, làm chủ thời gian."
                },
                {
                    "slide_num": "Slide 3 (Phần 01)",
                    "title": "PHẦN 01: BÀI TOÁN & MỤC TIÊU",
                    "time": "00:50 - 00:55 (5s)",
                    "badge": "",
                    "script": (
                        "Sau đây, em xin phép bắt đầu với Phần 1: Bài toán thực tế, ba nhóm người dùng và các ranh giới thiết kế cốt lõi của InterV."
                    ),
                    "note": "Chuyển phần dứt khoát, phong thái chuyên nghiệp."
                },
                {
                    "slide_num": "Slide 4",
                    "title": "Bài toán & Thực trạng",
                    "time": "00:55 - 01:15 (20s)",
                    "badge": "#01",
                    "script": (
                        "Các hệ thống phỏng vấn AI hiện nay thường mắc phải 3 lỗi lớn:\n"
                        "1. LLM thiếu căn cứ (Hallucination): Câu hỏi và nhận xét lệch JD.\n"
                        "2. Thiếu nhất quán: Tiêu chí thay đổi giữa các ứng viên.\n"
                        "3. Suy diễn quá mức: Biến tín hiệu giọng nói thành kết luận tâm lý thiếu cơ sở.\n"
                        "Mục tiêu của InterV: Mọi câu hỏi và đánh giá đều phải có căn cứ (Grounded), nhất quán và AI không thay thế con người ra quyết định."
                    ),
                    "note": "Nhấn mạnh 3 từ khóa: Grounding - Nhất quán - Human-in-the-loop."
                },
                {
                    "slide_num": "Slide 5",
                    "title": "Ba nhóm người dùng & Ranh giới trách nhiệm",
                    "time": "01:15 - 01:30 (15s)",
                    "badge": "#01",
                    "script": (
                        "Hệ thống phân định 3 ranh giới trách nhiệm tuyệt đối:\n"
                        "• Ứng viên: Sở hữu dữ liệu cá nhân, luyện tập hoặc tham gia theo lời mời.\n"
                        "• Recruiter: Sở hữu quyết định tuyển dụng (thiết lập JD, xem bằng chứng và đánh giá cuối).\n"
                        "• Admin: Vận hành hạ tầng và tài chính; không can thiệp kết quả tuyển dụng."
                    ),
                    "note": "Thể hiện tư duy phân quyền và ranh giới nghiệp vụ chuẩn mực."
                },
                {
                    "slide_num": "Slide 6 - 7",
                    "title": "Mục tiêu nghiên cứu & Bốn nguyên tắc khóa phạm vi",
                    "time": "01:30 - 02:00 (30s)",
                    "badge": "#01",
                    "script": (
                        "Đề tài đặt ra 6 mục tiêu thiết kế và được khóa phạm vi bằng 4 nguyên tắc bất biến:\n"
                        "1. Evidence-first: Mọi output phải nối về JD hoặc Rule catalog.\n"
                        "2. Human-in-the-loop: Tuyệt đối không auto-hire hay auto-reject.\n"
                        "3. Observation only: Tín hiệu giọng nói chỉ dùng làm quan sát hỗ trợ luyện tập, không chẩn đoán tâm lý.\n"
                        "4. Đúng mức bằng chứng: Không suy diễn vượt quá dữ liệu thu thập."
                    ),
                    "note": "Khẳng định cam kết về Responsible AI và đạo đức kỹ thuật."
                }
            ]
        },
        {
            "sec_title": "PHẦN 02: PHƯƠNG PHÁP NGHIÊN CỨU & ÁNH XẠ LÝ THUYẾT (SLIDES 8 - 10 | 00:35)",
            "slides": [
                {
                    "slide_num": "Slide 8 (Phần 02)",
                    "title": "PHẦN 02: PHƯƠNG PHÁP NGHIÊN CỨU",
                    "time": "02:00 - 02:05 (5s)",
                    "badge": "",
                    "script": (
                        "Tiếp theo là Phần 2: Phương pháp nghiên cứu và cách thức chuyển hóa các khung lý thuyết chuẩn thành mã nguồn."
                    ),
                    "note": "Chuyển tiếp mượt mà sang cơ sở lý thuyết."
                },
                {
                    "slide_num": "Slide 9 - 10",
                    "title": "Phương pháp tách rõ & Ánh xạ lý thuyết vào phần mềm",
                    "time": "02:05 - 02:35 (30s)",
                    "badge": "#02",
                    "script": (
                        "Phương pháp nghiên cứu tách rõ hai tầng:\n"
                        "• Tầng 1 - Xác minh kỹ thuật: Đảm bảo hệ thống chạy đúng, type-safe, kiểm thử hợp đồng và không có lỗi logic.\n"
                        "• Tầng 2 - Đánh giá hiệu lực nghiệp vụ: Ánh xạ chuẩn Structured Interview thành Schema, STAR/BARS thành Rule Catalog 86 files, "
                        "và Responsible AI thành Grounding Tri-gate."
                    ),
                    "note": "Làm nổi bật tính hàn lâm được chuyển hóa thành mã nguồn thực tế."
                }
            ]
        },
        {
            "sec_title": "PHẦN 03: THIẾT KẾ KIẾN TRÚC & PIPELINE CỐT LÕI (SLIDES 11 - 20 | 08:10 - TRỌNG TÂM)",
            "slides": [
                {
                    "slide_num": "Slide 11 (Phần 03)",
                    "title": "PHẦN 03: THIẾT KẾ KIẾN TRÚC & PIPELINE",
                    "time": "02:35 - 02:40 (5s)",
                    "badge": "",
                    "script": (
                        "Sau đây là Phần 3 - Trọng tâm bài thuyết trình: Thiết kế Kiến trúc và Pipeline Cốt lõi của InterV."
                    ),
                    "note": "Bắt đầu chặng trọng tâm 10 phút. Tăng nhiệt huyết và tốc độ nói tự tin."
                },
                {
                    "slide_num": "Slide 12 - 14",
                    "title": "Kiến trúc 2 tầng (BFF & AI Boundary) & Data Ownership",
                    "time": "02:40 - 03:35 (55s)",
                    "badge": "#03",
                    "script": (
                        "Về mặt kiến trúc, hệ thống phân tầng rạch ròi:\n"
                        "• Web/BFF (Next.js App Router): Quản lý session, auth RBAC, WebSocket audio streaming, và MongoDB replica set.\n"
                        "• AI Backend (Python): DeepSeek, Qdrant RAG, SenseVoice, TTS.\n"
                        "Giao tiếp qua hợp đồng gRPC typed 16 RPCs có xác thực nội bộ. 19 Mongoose models liên kết chặt chẽ theo vòng đời Provenance. "
                        "Không có mock data trong runtime."
                    ),
                    "note": "Chỉ tay vào sơ đồ phân tầng BFF ↔ Python Backend trên Slide 12."
                },
                {
                    "slide_num": "Slide 15",
                    "title": "Lookahead Adaptive Question Engine (Xử lý độ trễ 0ms)",
                    "time": "03:35 - 05:30 (115s)",
                    "badge": "#03",
                    "script": (
                        "★ ĐIỂM SÁNG KIẾN TRÚC - XỬ LÝ ĐỘ TRỄ 0MS:\n"
                        "1. Preparation: Backend sinh sẵn bộ câu hỏi baseline + warm TTS. Trả ngay câu 1.\n"
                        "2. Instant Return: Ứng viên nộp câu Q_i -> Trả ngay Q_(i+1) có sẵn trong bộ nhớ đệm (0ms latency, không phải chờ LLM).\n"
                        "3. Background Lookahead: Next.js after() gọi bất đồng bộ SubmitAnswer qua gRPC -> DeepSeek + RAG phân tích câu trả lời Q_i để bắt bài (probe gap) và sinh câu hỏi thích ứng Q_(i+2), đồng thời warm TTS trong nền.\n"
                        "4. Ghi đè thông minh: Q_(i+2) ghi đè vào slot kế tiếp; nếu mạng chậm thì câu baseline làm fallback an toàn. "
                        "Trải nghiệm phỏng vấn luôn mượt mà và thông minh!"
                    ),
                    "note": "Chỉ rõ luồng 0ms bên trên và luồng nền Lookahead bên dưới trên Slide 15."
                },
                {
                    "slide_num": "Slide 16",
                    "title": "Grounded Generation & Cơ chế kiểm soát 3 cổng",
                    "time": "05:30 - 07:00 (90s)",
                    "badge": "#03",
                    "script": (
                        "★ CƠ CHẾ GROUNDING 3 CỔNG CHỐNG ẢO GIÁC:\n"
                        "1. Chuẩn hóa Context & Cấp phát Evidence IDs.\n"
                        "2. DeepSeek Structured JSON Output với ràng buộc trích dẫn Evidence ID.\n"
                        "3. Citation Gate: Backend kiểm tra đối chiếu allow-list. Nếu DeepSeek bịa ra ID lạ -> Chặn ngay lập tức và kích hoạt 1 lượt Repair Request tự sửa sai. "
                        "Bất biến: 100% câu hỏi và đánh giá đều truy nguyên được nguồn gốc!"
                    ),
                    "note": "Chỉ vào chuỗi kiểm soát Trước - Trong - Sau khi sinh trên Slide 16."
                },
                {
                    "slide_num": "Slide 17",
                    "title": "Vòng đời tài liệu RAG & Hybrid Retrieval (Dense + BM25)",
                    "time": "07:00 - 08:00 (60s)",
                    "badge": "#03",
                    "script": (
                        "Kho tri thức 86 Rule Markdown (15 ngành, 60 profile STAR/BARS).\n"
                        "Qdrant kết hợp song song:\n"
                        "• Dense Embeddings: FastEmbed Multilingual MPNet.\n"
                        "• Sparse Lexical: Thuật toán BM25 bắt từ khóa kỹ thuật.\n"
                        "Hợp nhất bằng Reciprocal Rank Fusion (RRF), đảm bảo truy hồi tài liệu vừa chuẩn ngữ nghĩa vừa chính xác từ khóa."
                    ),
                    "note": "Nhấn mạnh thuật toán RRF và kho tri thức chuẩn hóa."
                },
                {
                    "slide_num": "Slide 18",
                    "title": "Pipeline Tiếng nói Đa tầng (Realtime STT + Fallback & Hậu kỳ tuần tự)",
                    "time": "08:00 - 09:30 (90s)",
                    "badge": "#03",
                    "script": (
                        "Kính thưa Thầy Cô, pipeline tiếng nói của InterV được thiết kế chuyên biệt theo 2 pha rõ rệt:\n\n"
                        "1. PHA 1: LUỒNG REALTIME TRONG PHỎNG VẤN (TƯƠNG TÁC MƯỢT MÀ, KHÔNG RỜI RẠC)\n"
                        "• Luồng âm thanh từ microphone được AudioWorklet thu và stream trực tiếp qua WebSocket tới AssemblyAI để thực hiện STT theo thời gian thực.\n"
                        "• Cơ chế Fallback cục bộ: Khi gặp sự cố mạng hoặc lỗi API, hệ thống tự động fallback về model Faster-Whisper chạy trực tiếp trên Python backend.\n"
                        "• Mục đích: Luôn bảo đảm có dữ liệu transcript tức thời cho AI Provider (DeepSeek) tiếp tục hiểu ngữ cảnh, nói tiếp qua TTS và sinh các câu hỏi thích ứng (Lookahead Engine) liền mạch, không làm câu hỏi bị rời rạc hay ngắt quãng phiên phỏng vấn.\n\n"
                        "2. PHA 2: LUỒNG XỬ LÝ HẬU KỲ SAU PHỎNG VẤN (ĐÁNH GIÁ CHUYÊN SÂU & COACHING)\n"
                        "• Sau khi phỏng vấn xong, toàn bộ các đoạn audio gốc đã lưu sẽ được xử lý tuần tự (sequential batch) bằng Faster-Whisper để tái tạo STT chính xác cao nhất.\n"
                        "• Hệ thống áp dụng các thuật toán xử lý tín hiệu âm thanh để đo lường khách quan nhịp độ, tốc độ nói (WPM), và các khoảng trống/khoảng lặng (pause duration) trong câu nói.\n"
                        "• Tiếp theo, audio được đưa qua mô hình SenseVoice theo nguyên tắc 'Observation only' để bóc tách: LID (ngôn ngữ), SER (cảm xúc giọng nói), và AED (sự kiện âm thanh: tiếng cười, tiếng ho, thở dài, từ đệm/filler words).\n"
                        "• Dữ liệu này được tổng hợp để đánh giá khách quan mức độ tự tin, tính lưu loát, và phong thái diễn đạt nhằm hỗ trợ coaching cho ứng viên mà không suy diễn tâm lý tùy tiện."
                    ),
                    "note": "Chỉ rõ Slide 18: Pha 1 Realtime STT + Fallback; Pha 2 Hậu kỳ Faster-Whisper + Thuật toán nhịp độ + SenseVoice Coaching."
                },
                {
                    "slide_num": "Slide 19 - 20",
                    "title": "An toàn, Khả năng phục hồi & Hợp đồng Typed gRPC",
                    "time": "09:30 - 10:45 (75s)",
                    "badge": "#03",
                    "script": (
                        "5 lớp bảo vệ hệ thống: Auth/RBAC, Schema validation Zod/Pydantic, Circuit breaker, Audit log/Usage tracking, Graceful fallback ở mọi khâu.\n"
                        "Hợp đồng Typed 16 RPCs ràng buộc giữa TypeScript BFF và Python Backend, bảo đảm tính toàn vẹn và độ tin cậy tuyệt đối."
                    ),
                    "note": "Tổng kết chặng trọng tâm kỹ thuật. Chuẩn bị chuyển sang sản phẩm và bằng chứng."
                }
            ]
        },
        {
            "sec_title": "PHẦN 04: SẢN PHẨM & TRẢI NGHIỆM NGƯỜI DÙNG (SLIDES 21 - 26 | 01:35)",
            "slides": [
                {
                    "slide_num": "Slide 21 (Phần 04)",
                    "title": "PHẦN 04: SẢN PHẨM & TRẢI NGHIỆM",
                    "time": "10:45 - 10:50 (5s)",
                    "badge": "",
                    "script": (
                        "Tiếp theo là Phần 4: Sản phẩm và các luồng trải nghiệm thực tế trên hệ thống InterV."
                    ),
                    "note": "Chuyển sang phần sản phẩm."
                },
                {
                    "slide_num": "Slide 22 - 26",
                    "title": "RBAC, State Machine, Vòng đời Tuyển dụng & Graceful Fallback",
                    "time": "10:50 - 12:20 (90s)",
                    "badge": "#04",
                    "script": (
                        "Sản phẩm cung cấp 2 không gian trải nghiệm hoàn chỉnh:\n"
                        "• Candidate & Practice: State Machine 6 trạng thái nghiêm ngặt, có cơ chế resume an toàn.\n"
                        "• Recruiter Workspace: Tạo chiến dịch, quản lý JD, gửi lời mời tự động, duyệt kết quả có bằng chứng trích dẫn.\n"
                        "Toàn bộ hệ thống trang bị cơ chế Graceful Fallback tại mọi điểm: RAG fallback baseline, STT fallback Faster-Whisper, audio fallback text-only."
                    ),
                    "note": "Nói súc tích, làm nổi bật tính hoàn thiện của sản phẩm."
                }
            ]
        },
        {
            "sec_title": "PHẦN 05: BẰNG CHỨNG & XÁC MINH KỸ THUẬT (SLIDES 27 - 31 | 01:55)",
            "slides": [
                {
                    "slide_num": "Slide 27 (Phần 05)",
                    "title": "PHẦN 05: BẰNG CHỨNG & XÁC MINH",
                    "time": "12:20 - 12:25 (5s)",
                    "badge": "",
                    "script": (
                        "Tiếp theo là Phần 5: Các bằng chứng kỹ thuật, quy mô hiện vật và kết quả kiểm thử toàn diện."
                    ),
                    "note": "Chuyển sang bằng chứng và kiểm thử."
                },
                {
                    "slide_num": "Slide 28 - 31",
                    "title": "Quy mô 72k LOC, 51/51 Tests 100% & Bất biến SenseVoice",
                    "time": "12:25 - 14:15 (110s)",
                    "badge": "#05",
                    "script": (
                        "Con số thực tế từ repository:\n"
                        "• Hơn 72.000 dòng mã nguồn logic, 61 route files, 74 HTTP handlers, 38 trang frontend, 19 Mongoose models, 16 gRPC RPCs, 86 Rule files.\n"
                        "• 51/51 Backend tests đạt 100% trong 3.28 giây, 16/16 RPC contract tests pass, zero-mock runtime.\n"
                        "• 3 điểm kiểm soát LLM Pre/In/Post generation và Bất biến SenseVoice: Observation-only, Neutral default 50."
                    ),
                    "note": "Nhấn mạnh các số liệu chính xác từ repo để chứng minh tính trung thực."
                }
            ]
        },
        {
            "sec_title": "PHẦN 06: KẾT LUẬN, GIỚI HẠN & LỜI CẢM ƠN (SLIDES 32 - 37 | 00:45)",
            "slides": [
                {
                    "slide_num": "Slide 32 (Phần 06)",
                    "title": "PHẦN 06: KẾT LUẬN & ĐÓNG GÓP",
                    "time": "14:15 - 14:20 (5s)",
                    "badge": "",
                    "script": (
                        "Cuối cùng là Phần 6: Đóng góp chính, giới hạn nghiên cứu và lộ trình kiểm soát của InterV."
                    ),
                    "note": "Chuyển sang phần kết luận."
                },
                {
                    "slide_num": "Slide 33 - 36",
                    "title": "Bốn đóng góp, Giới hạn nghiên cứu & Bốn cổng kiểm soát",
                    "time": "14:20 - 14:58 (38s)",
                    "badge": "#06",
                    "script": (
                        "4 đóng góp then chốt: Kiến trúc Lookahead 0ms, Grounded Generation 3 cổng, Pipeline tiếng nói 2 pha an toàn, và Quản trị Provenance STAR/BARS.\n"
                        "Giới hạn nghiên cứu: Hệ thống đạt vững chắc kỹ thuật nhưng cần đánh giá Validity/Fairness thực nghiệm trước khi mở rộng.\n"
                        "Lộ trình qua 4 cổng kiểm soát: Playground -> Shadow Scoring -> Pilot -> Restricted Production."
                    ),
                    "note": "Khẳng định tính khiêm tốn khoa học và tầm nhìn phát triển."
                },
                {
                    "slide_num": "Slide 37 (Cảm ơn)",
                    "title": "Cảm ơn Hội đồng & Q&A",
                    "time": "14:58 - 15:00 (2s)",
                    "badge": "#06",
                    "script": (
                        "Em xin trân trọng cảm ơn Thầy ThS. Đặng Văn Lực và quý Thầy Cô trong Hội đồng đã chú ý theo dõi. "
                        "Em xin phép được tiếp nhận câu hỏi phản biện!"
                    ),
                    "note": "Cúi đầu chào trân trọng, chuyển sang trạng thái sẵn sàng trả lời phản biện."
                }
            ]
        }
    ]

    for sec in sections_script:
        add_section_heading(sec["sec_title"], level=2)
        for s in sec["slides"]:
            p_slide = doc.add_paragraph()
            p_slide.paragraph_format.space_before = Pt(8)
            p_slide.paragraph_format.space_after = Pt(2)
            p_slide.paragraph_format.keep_with_next = True
            
            badge_str = f" [{s['badge']}]" if s['badge'] else ""
            r_num = p_slide.add_run(f"• {s['slide_num']}{badge_str}: {s['title']} ({s['time']})\n")
            r_num.font.name = "Arial"
            r_num.font.size = Pt(10.5)
            r_num.font.bold = True
            r_num.font.color.rgb = RGBColor(15, 23, 42)

            p_script = doc.add_paragraph()
            p_script.paragraph_format.left_indent = Inches(0.2)
            p_script.paragraph_format.space_before = Pt(0)
            p_script.paragraph_format.space_after = Pt(4)
            
            r_label = p_script.add_run("Lời nói: ")
            r_label.font.name = "Arial"
            r_label.font.size = Pt(9.5)
            r_label.font.bold = True
            r_label.font.color.rgb = RGBColor(22, 101, 52)
            
            r_body = p_script.add_run(f"\"{s['script']}\"")
            r_body.font.name = "Arial"
            r_body.font.size = Pt(9.5)
            r_body.font.color.rgb = RGBColor(51, 65, 85)

            p_note = doc.add_paragraph()
            p_note.paragraph_format.left_indent = Inches(0.2)
            p_note.paragraph_format.space_before = Pt(0)
            p_note.paragraph_format.space_after = Pt(6)
            
            r_nlabel = p_note.add_run("Gợi ý hành động: ")
            r_nlabel.font.name = "Arial"
            r_nlabel.font.size = Pt(9)
            r_nlabel.font.italic = True
            r_nlabel.font.bold = True
            r_nlabel.font.color.rgb = RGBColor(180, 83, 9)
            
            r_nbody = p_note.add_run(s['note'])
            r_nbody.font.name = "Arial"
            r_nbody.font.size = Pt(9)
            r_nbody.font.italic = True
            r_nbody.font.color.rgb = RGBColor(100, 116, 139)

    out_path = r"d:\project\InterV\Review\Kich_Ban_Thuyet_Trinh_KLTN_InterV_15Phut_v2.docx"
    doc.save(out_path)
    print(f"Generated successfully: {out_path}")

if __name__ == "__main__":
    build_speaking_script_docx()

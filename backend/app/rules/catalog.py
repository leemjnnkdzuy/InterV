from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class TierSpec:
    index: int
    slug: str
    name: str
    objective: str
    autonomy: str
    complexity: str
    impact: str
    evidence_standard: str
    question_mix: tuple[str, ...]


@dataclass(frozen=True)
class IndustrySpec:
    name: str
    slug: str
    aliases: tuple[str, ...]
    levels: tuple[str, ...]
    competencies: tuple[str, ...]
    evidence: tuple[str, ...]
    risks: tuple[str, ...]
    scenarios: tuple[str, ...]
    source_ids: tuple[str, ...] = ("ONET2026", "OPM2008", "ROULIN2022")


@dataclass(frozen=True)
class ProfileSpec:
    industry: IndustrySpec
    level: str
    level_slug: str
    tier: TierSpec

    @property
    def rule_id(self) -> str:
        return f"rule:profile:{self.industry.slug}:{self.level_slug}"


TIERS: tuple[TierSpec, ...] = (
    TierSpec(
        index=1,
        slug="tier-1-foundation",
        name="Tier 1 - Foundation",
        objective="Xác minh nền tảng, khả năng học và thực hiện công việc có hướng dẫn.",
        autonomy="Làm việc trong phạm vi rõ ràng, biết lúc nào cần hỏi hoặc escalates.",
        complexity="Tình huống quen thuộc, dữ kiện đủ và rủi ro giới hạn.",
        impact="Đầu ra cá nhân, chất lượng và độ tin cậy trong nhiệm vụ được giao.",
        evidence_standard="Ví dụ từ học tập, thực tập, dự án cá nhân hoặc công việc đầu tiên đều hợp lệ nếu có hành động và kết quả kiểm chứng được.",
        question_mix=(
            "một câu kiến thức/nền tảng gắn với nhiệm vụ",
            "một câu hành vi về học hỏi hoặc nhận phản hồi",
            "một câu tình huống xử lý lỗi trong phạm vi cá nhân",
            "một câu hợp tác và giao tiếp",
            "một câu động lực nghề nghiệp gắn với JD",
        ),
    ),
    TierSpec(
        index=2,
        slug="tier-2-independent",
        name="Tier 2 - Independent",
        objective="Xác minh năng lực tự chủ, ưu tiên và giải quyết vấn đề đầu-cuối.",
        autonomy="Tự lập kế hoạch và chịu trách nhiệm cho một phạm vi công việc.",
        complexity="Tình huống có đánh đổi, thiếu dữ kiện hoặc nhiều bên liên quan.",
        impact="Kết quả đo được của dự án, khách hàng hoặc quy trình.",
        evidence_standard="Cần ví dụ công việc gần đây với vai trò cá nhân rõ, quyết định, chỉ số và bài học.",
        question_mix=(
            "một câu hành vi về ownership đầu-cuối",
            "một câu tình huống có đánh đổi",
            "một câu chẩn đoán sự cố hoặc dữ liệu",
            "một câu phối hợp stakeholder",
            "một câu cải tiến có kết quả đo được",
        ),
    ),
    TierSpec(
        index=3,
        slug="tier-3-senior",
        name="Tier 3 - Senior",
        objective="Xác minh phán đoán chuyên sâu, ảnh hưởng liên chức năng và năng lực nâng chuẩn.",
        autonomy="Định nghĩa cách làm trong vùng mơ hồ và cố vấn người khác.",
        complexity="Vấn đề hệ thống, rủi ro đáng kể, nhiều phương án hợp lý.",
        impact="Kết quả cấp nhóm/chương trình và chất lượng quyết định dài hạn.",
        evidence_standard="Cần bằng chứng về trade-off, ảnh hưởng tới người khác, chỉ số trước-sau và trách nhiệm đối với hệ quả.",
        question_mix=(
            "một câu phân tích quyết định khó và trade-off",
            "một câu thiết kế/chuẩn hóa hệ thống",
            "một câu xử lý khủng hoảng hoặc rủi ro",
            "một câu gây ảnh hưởng không dùng quyền lực",
            "một câu mentoring và nâng chuẩn đội ngũ",
        ),
    ),
    TierSpec(
        index=4,
        slug="tier-4-strategic",
        name="Tier 4 - Strategic",
        objective="Xác minh tư duy chiến lược, quản trị danh mục và trách nhiệm tổ chức.",
        autonomy="Đặt định hướng, phân bổ nguồn lực và chịu trách nhiệm qua nhiều nhóm.",
        complexity="Bất định cao, xung đột mục tiêu, tác động tài chính/pháp lý/danh tiếng.",
        impact="Kết quả cấp đơn vị hoặc tổ chức trong nhiều quý/năm.",
        evidence_standard="Cần bằng chứng định lượng về chiến lược, cơ chế quản trị, quyết định nguồn lực, hệ quả và cách sửa sai.",
        question_mix=(
            "một câu chiến lược và giả định nền",
            "một câu phân bổ nguồn lực/danh mục",
            "một câu governance, ethics hoặc risk appetite",
            "một câu dẫn dắt thay đổi quy mô lớn",
            "một câu xây tổ chức và đo hiệu quả dài hạn",
        ),
    ),
)


INDUSTRIES: tuple[IndustrySpec, ...] = (
    IndustrySpec(
        name="Công nghệ thông tin",
        slug="information-technology",
        aliases=("it", "cntt", "software", "technology"),
        levels=("Junior", "Middle", "Senior", "Lead"),
        competencies=(
            "nền tảng kỹ thuật và tính đúng đắn",
            "phân rã vấn đề và gỡ lỗi",
            "thiết kế hệ thống và trade-off",
            "chất lượng mã, kiểm thử và vận hành",
            "bảo mật và quyền riêng tư",
            "giao tiếp kỹ thuật",
            "ownership và reliability",
            "học công nghệ mới",
        ),
        evidence=(
            "kiến trúc, constraint và quyết định kỹ thuật cụ thể",
            "log, metric, test hoặc dữ liệu xác nhận nguyên nhân",
            "SLA/SLO, latency, throughput, lỗi hoặc chi phí trước-sau",
            "pull request, incident, release hoặc migration có vai trò rõ",
            "trade-off bảo mật, khả năng bảo trì và tốc độ giao hàng",
        ),
        risks=(
            "nói công nghệ theo khẩu hiệu nhưng không giải thích cơ chế",
            "không phân biệt đóng góp cá nhân với kết quả của cả nhóm",
            "bỏ qua rollback, monitoring, testing hoặc threat model",
        ),
        scenarios=(
            "dịch vụ production tăng latency sau một lần deploy",
            "thiết kế API phải cân bằng consistency, scale và thời hạn",
            "legacy code thiếu test nhưng cần thay đổi khẩn cấp",
            "lỗ hổng bảo mật xuất hiện sát ngày phát hành",
            "hai nhóm bất đồng về ownership của một hệ thống dùng chung",
        ),
    ),
    IndustrySpec(
        name="Marketing & Quảng cáo",
        slug="marketing-advertising",
        aliases=("marketing", "advertising", "quảng cáo"),
        levels=("Intern", "Executive", "Leader", "Manager"),
        competencies=(
            "insight khách hàng",
            "chiến lược kênh và thông điệp",
            "thử nghiệm và đo lường",
            "sáng tạo có mục tiêu",
            "quản trị ngân sách",
            "phân tích funnel và attribution",
            "phối hợp thương hiệu-bán hàng-sản phẩm",
            "đạo đức dữ liệu và truyền thông",
        ),
        evidence=(
            "brief, phân khúc và insight được kiểm chứng",
            "CTR, CVR, CAC, ROAS, retention hoặc brand lift",
            "thiết kế A/B test, baseline và cách đọc nhiễu",
            "phân bổ ngân sách và lý do dừng/mở rộng kênh",
            "tài sản sáng tạo gắn với hành vi khách hàng",
        ),
        risks=(
            "nhận công lao từ vanity metrics mà không nối tới mục tiêu kinh doanh",
            "khẳng định attribution chắc chắn khi dữ liệu không đủ",
            "dùng dark pattern, dữ liệu cá nhân hoặc tuyên bố gây hiểu nhầm",
        ),
        scenarios=(
            "CPA tăng mạnh dù traffic không đổi",
            "brand campaign khó đo lường trong ngắn hạn",
            "ngân sách bị cắt giữa chiến dịch",
            "creative hiệu quả nhưng có nguy cơ tổn hại thương hiệu",
            "sales và marketing bất đồng định nghĩa lead chất lượng",
        ),
    ),
    IndustrySpec(
        name="Tài chính & Ngân hàng",
        slug="finance-banking",
        aliases=("finance", "banking", "ngân hàng", "tài chính"),
        levels=("Analyst", "Specialist", "Manager", "Director"),
        competencies=(
            "phân tích tài chính định lượng",
            "quản trị rủi ro",
            "kiểm soát và tuân thủ",
            "phán đoán tín dụng/đầu tư",
            "mô hình hóa và kiểm định giả định",
            "độ chính xác dữ liệu",
            "giao tiếp với stakeholder",
            "đạo đức nghề nghiệp",
        ),
        evidence=(
            "mô hình, nguồn dữ liệu và giả định có thể kiểm tra",
            "sensitivity/scenario analysis và ngưỡng rủi ro",
            "tác động P&L, cash flow, capital hoặc exposure",
            "control, reconciliation và dấu vết phê duyệt",
            "quyết định khi dữ liệu thiếu hoặc xung đột lợi ích",
        ),
        risks=(
            "đưa kết luận chắc chắn từ giả định chưa kiểm định",
            "xem compliance như thủ tục thay vì cơ chế kiểm soát",
            "che giấu sai số, xung đột lợi ích hoặc downside risk",
        ),
        scenarios=(
            "mô hình dự báo lệch đáng kể so với actual",
            "khách hàng lớn tạo áp lực nới tiêu chuẩn rủi ro",
            "phát hiện giao dịch bất thường sát giờ chốt",
            "lãi suất biến động làm thay đổi luận điểm đầu tư",
            "business muốn tăng trưởng nhanh hơn risk appetite",
        ),
    ),
    IndustrySpec(
        name="Kinh doanh & Bán hàng",
        slug="sales-business-development",
        aliases=("sales", "business development", "bán hàng", "kinh doanh"),
        levels=("Executive", "Specialist", "Leader", "Manager"),
        competencies=(
            "khám phá nhu cầu",
            "xây pipeline",
            "tư vấn giá trị",
            "đàm phán",
            "xử lý phản đối",
            "forecast và quản trị CRM",
            "phối hợp delivery/customer success",
            "đạo đức bán hàng",
        ),
        evidence=(
            "ICP, persona, pain point và buying process cụ thể",
            "pipeline coverage, win rate, sales cycle và quota attainment",
            "deal strategy, stakeholder map và next step",
            "nhượng bộ trong đàm phán gắn với giá trị nhận lại",
            "retention/expansion và chất lượng bàn giao sau ký",
        ),
        risks=(
            "chỉ nói doanh số mà không làm rõ baseline, territory và đóng góp",
            "forecast theo cảm tính hoặc dữ liệu CRM không sạch",
            "hứa quá khả năng sản phẩm hay dùng sức ép thiếu đạo đức",
        ),
        scenarios=(
            "deal chiến lược đứng yên vì thiếu economic buyer",
            "khách hàng yêu cầu giảm giá sâu vào cuối quý",
            "pipeline không đủ để đạt target",
            "sản phẩm chưa đáp ứng một yêu cầu quan trọng",
            "sales và delivery bất đồng về cam kết đã bán",
        ),
    ),
    IndustrySpec(
        name="Quản trị nhân sự",
        slug="human-resources",
        aliases=("hr", "human resources", "nhân sự", "hrbp"),
        levels=("Intern/Assistant", "Specialist", "Leader/Supervisor", "Manager/HRBP"),
        competencies=(
            "tuyển dụng dựa trên năng lực",
            "employee relations",
            "C&B và dữ liệu nhân sự",
            "learning và performance",
            "tư vấn quản lý",
            "thiết kế tổ chức",
            "bảo mật và công bằng",
            "quản trị thay đổi",
        ),
        evidence=(
            "job analysis, competency và tiêu chí quyết định rõ",
            "time-to-fill, quality-of-hire, turnover hoặc engagement",
            "case handling có biên bản, escalation và bảo mật",
            "phân tích dữ liệu nhân sự kèm giới hạn suy luận",
            "can thiệp với manager và kết quả theo dõi",
        ),
        risks=(
            "dựa vào trực giác hoặc culture fit mơ hồ để đánh giá con người",
            "tiết lộ dữ liệu cá nhân/nhạy cảm",
            "đưa lời khuyên pháp lý chắc chắn ngoài phạm vi chuyên môn",
        ),
        scenarios=(
            "manager muốn loại ứng viên vì lý do không liên quan công việc",
            "khiếu nại nội bộ có xung đột lời khai",
            "turnover tăng tại một đơn vị kinh doanh",
            "thiết kế thang lương trong ngân sách giới hạn",
            "tái cấu trúc ảnh hưởng tới tinh thần và năng lực tổ chức",
        ),
    ),
    IndustrySpec(
        name="Chăm sóc khách hàng",
        slug="customer-service",
        aliases=("customer service", "support", "cskh", "chăm sóc khách hàng"),
        levels=("Executive", "Specialist", "Leader", "Manager"),
        competencies=(
            "lắng nghe và đồng cảm",
            "chẩn đoán vấn đề",
            "giao tiếp rõ ràng",
            "de-escalation",
            "quản trị SLA",
            "knowledge management",
            "phân tích voice-of-customer",
            "service recovery",
        ),
        evidence=(
            "ticket/case cụ thể và cách xác minh nguyên nhân",
            "CSAT, FCR, AHT, backlog, SLA hoặc churn",
            "ngôn ngữ dùng để đặt kỳ vọng và trấn an",
            "escalation hợp lý và ownership tới khi đóng case",
            "cải tiến bài viết, macro, workflow hoặc sản phẩm",
        ),
        risks=(
            "đồng cảm bằng lời nhưng không giải quyết nguyên nhân",
            "tối ưu AHT làm giảm chất lượng hoặc che backlog",
            "hứa bồi thường, thời hạn hoặc kết quả ngoài thẩm quyền",
        ),
        scenarios=(
            "khách hàng tức giận vì sự cố lặp lại",
            "backlog tăng trong giờ cao điểm",
            "case liên quan dữ liệu riêng tư",
            "SLA sắp vỡ do phụ thuộc đội khác",
            "nhiều ticket cùng chỉ ra một lỗi sản phẩm",
        ),
    ),
    IndustrySpec(
        name="Thiết kế & Nghệ thuật",
        slug="design-arts",
        aliases=("design", "creative", "thiết kế", "nghệ thuật"),
        levels=("Junior Designer", "Senior Designer", "Design Lead", "Creative Director"),
        competencies=(
            "framing vấn đề thiết kế",
            "research và insight",
            "craft và hệ thống thị giác",
            "iteration và critique",
            "accessibility",
            "kể chuyện thiết kế",
            "phối hợp product/engineering/brand",
            "đo tác động",
        ),
        evidence=(
            "portfolio case nêu constraint, vai trò và iteration",
            "research evidence thay vì sở thích cá nhân",
            "prototype, design system hoặc artifact cụ thể",
            "usability, conversion, task success hoặc brand metric",
            "trade-off giữa craft, accessibility và feasibility",
        ),
        risks=(
            "chỉ mô tả output đẹp mà thiếu bài toán và kết quả",
            "nhận toàn bộ công lao của sản phẩm cộng tác",
            "bỏ qua accessibility, bản quyền hoặc tác động thao túng",
        ),
        scenarios=(
            "stakeholder yêu cầu giải pháp mâu thuẫn với research",
            "thiết kế phải ship khi chưa đủ thời gian test",
            "design system bị các đội áp dụng không nhất quán",
            "metric tăng nhưng trải nghiệm dài hạn xấu đi",
            "creative direction gây tranh luận về nhận diện thương hiệu",
        ),
    ),
    IndustrySpec(
        name="Kế toán & Kiểm toán",
        slug="accounting-audit",
        aliases=("accounting", "audit", "kế toán", "kiểm toán"),
        levels=("Analyst", "Specialist", "Manager", "Director"),
        competencies=(
            "chuẩn mực và nghiệp vụ kế toán",
            "reconciliation và độ chính xác",
            "internal control",
            "audit evidence",
            "professional skepticism",
            "materiality và risk assessment",
            "quản trị deadline",
            "độc lập và đạo đức",
        ),
        evidence=(
            "working paper, ledger, assertion và evidence trail",
            "sai lệch, materiality và tác động báo cáo",
            "control design/operating effectiveness",
            "sampling, test procedure và kết luận",
            "cách xử lý disagreement với client/management",
        ),
        risks=(
            "kết luận trước khi đủ bằng chứng thích hợp",
            "bỏ qua dấu hiệu gian lận vì áp lực deadline",
            "xung đột lợi ích hoặc thiếu độc lập nghề nghiệp",
        ),
        scenarios=(
            "reconciliation không khớp sát ngày đóng sổ",
            "management phản đối audit adjustment",
            "control quan trọng tồn tại trên giấy nhưng vận hành yếu",
            "mẫu kiểm toán phát hiện ngoại lệ lặp lại",
            "deadline báo cáo xung đột với chất lượng bằng chứng",
        ),
    ),
    IndustrySpec(
        name="Quản lý sản phẩm",
        slug="product-management",
        aliases=("product", "product management", "pm", "quản lý sản phẩm"),
        levels=("Associate", "Product Owner", "Senior PM", "Director"),
        competencies=(
            "problem discovery",
            "product strategy",
            "prioritization",
            "data-informed decisions",
            "delivery và discovery",
            "stakeholder alignment",
            "go-to-market",
            "outcome ownership",
        ),
        evidence=(
            "problem statement, user segment và evidence",
            "north-star/input metric, baseline và target",
            "roadmap trade-off và opportunity cost",
            "experiment, launch và decision rule",
            "outcome sau phát hành và vòng lặp học tập",
        ),
        risks=(
            "feature factory không nối roadmap với outcome",
            "chọn số liệu thuận lợi hoặc nhầm correlation với causation",
            "đẩy trách nhiệm delivery/decision sang stakeholder khác",
        ),
        scenarios=(
            "hai cơ hội lớn cạnh tranh cùng nguồn lực",
            "launch không đạt adoption dù giao đúng scope",
            "sales yêu cầu feature cho một khách hàng lớn",
            "dữ liệu định lượng và research định tính mâu thuẫn",
            "team mất niềm tin vì roadmap thay đổi liên tục",
        ),
    ),
    IndustrySpec(
        name="Giáo dục & Đào tạo",
        slug="education-training",
        aliases=("education", "training", "giáo dục", "đào tạo"),
        levels=("Teacher/Tutor", "Coordinator", "Academic Manager", "Education Director"),
        competencies=(
            "thiết kế mục tiêu học tập",
            "pedagogy và differentiation",
            "assessment literacy",
            "quản lý lớp/học viên",
            "feedback và coaching",
            "curriculum quality",
            "safeguarding và công bằng",
            "đo learning outcomes",
        ),
        evidence=(
            "learning objective và hoạt động tương ứng",
            "assessment artifact, rubric và dữ liệu tiến bộ",
            "cách điều chỉnh cho nhu cầu học khác nhau",
            "phản hồi cho học viên và theo dõi tác động",
            "quality assurance hoặc cải tiến chương trình",
        ),
        risks=(
            "đồng nhất điểm số với toàn bộ năng lực người học",
            "gắn nhãn người học hoặc tiết lộ dữ liệu nhạy cảm",
            "dùng phương pháp hấp dẫn nhưng không có mục tiêu/đánh giá phù hợp",
        ),
        scenarios=(
            "lớp có chênh lệch năng lực lớn",
            "kết quả assessment thấp hơn kỳ vọng",
            "phụ huynh/học viên phản đối phương pháp dạy",
            "chương trình cần đổi nhanh nhưng giảng viên chưa sẵn sàng",
            "mục tiêu tăng quy mô xung đột với chất lượng học tập",
        ),
    ),
    IndustrySpec(
        name="Y tế & Dược phẩm",
        slug="healthcare-pharmaceuticals",
        aliases=("healthcare", "pharma", "medical", "y tế", "dược"),
        levels=("Practitioner/Pharmacist", "Specialist", "Chief Pharmacist/Head Doctor", "Medical Director"),
        competencies=(
            "an toàn người bệnh",
            "clinical reasoning trong phạm vi vai trò",
            "evidence-based practice",
            "giao tiếp và informed consent",
            "quản lý thuốc/quy trình",
            "quality improvement",
            "đạo đức và bảo mật",
            "interprofessional collaboration",
        ),
        evidence=(
            "tình huống đã ẩn danh, dấu hiệu và reasoning",
            "guideline/protocol và lý do deviation nếu có",
            "safety check, escalation và documentation",
            "outcome hoặc quality indicator",
            "phối hợp đa chuyên môn và handoff",
        ),
        risks=(
            "đưa hướng dẫn chẩn đoán/điều trị ngoài phạm vi phỏng vấn",
            "tiết lộ dữ liệu định danh người bệnh",
            "che giấu near miss, adverse event hoặc sai sót thuốc",
        ),
        scenarios=(
            "dữ kiện lâm sàng mơ hồ nhưng rủi ro có thể cao",
            "phát hiện nguy cơ medication error",
            "người bệnh từ chối kế hoạch được đề xuất",
            "handoff thiếu thông tin quan trọng",
            "quality indicator xấu đi qua nhiều kỳ",
        ),
    ),
    IndustrySpec(
        name="Luật & Pháp lý",
        slug="legal",
        aliases=("legal", "law", "luật", "pháp lý"),
        levels=("Legal Assistant", "Legal Counsel", "Senior Counsel", "Legal Director/Partner"),
        competencies=(
            "legal research",
            "issue spotting",
            "phân tích và lập luận",
            "drafting",
            "quản trị matter/deadline",
            "tư vấn rủi ro",
            "đàm phán",
            "đạo đức và bảo mật",
        ),
        evidence=(
            "vấn đề pháp lý, nguồn thẩm quyền và reasoning",
            "draft/memo/contract đã ẩn danh",
            "risk matrix và lựa chọn kinh doanh",
            "deadline, privilege và document control",
            "kết quả đàm phán/tranh chấp cùng giới hạn vai trò",
        ),
        risks=(
            "bịa điều luật/án lệ hoặc khẳng định khi chưa kiểm tra jurisdiction",
            "tiết lộ privileged/confidential information",
            "đánh đổi đạo đức nghề nghiệp để đạt mục tiêu thương mại",
        ),
        scenarios=(
            "business cần quyết định trước khi research hoàn tất",
            "điều khoản hợp đồng phân bổ rủi ro bất cân xứng",
            "phát hiện xung đột lợi ích",
            "đối tác dùng áp lực deadline trong đàm phán",
            "ban lãnh đạo muốn chấp nhận rủi ro pháp lý đáng kể",
        ),
    ),
    IndustrySpec(
        name="Xây dựng & Bất động sản",
        slug="construction-real-estate",
        aliases=("construction", "real estate", "xây dựng", "bất động sản"),
        levels=("Site Engineer/Agent", "Project Engineer/Consultant", "Project Manager/Head", "Project Director"),
        competencies=(
            "an toàn và tuân thủ",
            "đọc/kiểm soát hồ sơ kỹ thuật",
            "tiến độ và nguồn lực",
            "chi phí và hợp đồng",
            "quality control",
            "quản trị nhà thầu/khách hàng",
            "risk và issue management",
            "giao tiếp hiện trường",
        ),
        evidence=(
            "bản vẽ/spec/BOQ hoặc hồ sơ giao dịch cụ thể",
            "schedule, cost variance, defect hoặc conversion metric",
            "RFI, change order, nghiệm thu hoặc due diligence",
            "safety action và escalation",
            "trade-off chất lượng-tiến độ-chi phí có phê duyệt",
        ),
        risks=(
            "đẩy nhanh tiến độ bằng cách bỏ qua an toàn/chất lượng",
            "không phân biệt estimate, commitment và actual",
            "che giấu conflict, defect hoặc điều kiện giao dịch quan trọng",
        ),
        scenarios=(
            "phát hiện sai khác giữa bản vẽ và hiện trường",
            "nhà thầu chậm tiến độ và yêu cầu phát sinh",
            "nguy cơ an toàn cần dừng việc",
            "chi phí vật liệu tăng làm vỡ budget",
            "khách hàng yêu cầu cam kết ngoài hồ sơ được phê duyệt",
        ),
    ),
    IndustrySpec(
        name="Du lịch & Nhà hàng - Khách sạn",
        slug="hospitality-tourism",
        aliases=("hospitality", "tourism", "hotel", "du lịch", "khách sạn", "nhà hàng"),
        levels=("Staff/Receptionist", "Supervisor", "Department Manager", "General Manager"),
        competencies=(
            "guest service",
            "service recovery",
            "vận hành ca",
            "an toàn và vệ sinh",
            "doanh thu và yield",
            "phối hợp đa bộ phận",
            "quản trị nhân sự tuyến đầu",
            "trải nghiệm đa văn hóa",
        ),
        evidence=(
            "guest case và hành động trong phạm vi thẩm quyền",
            "CSAT/review score, occupancy, RevPAR, table turn hoặc waste",
            "SOP, checklist và handover",
            "staffing/roster và xử lý peak demand",
            "service recovery cost và tác động giữ khách",
        ),
        risks=(
            "xin lỗi hình thức nhưng không khôi phục trải nghiệm",
            "đánh đổi an toàn/vệ sinh để phục vụ nhanh",
            "phân biệt đối xử hoặc tiết lộ thông tin khách",
        ),
        scenarios=(
            "overbooking hoặc hết phòng vào giờ cao điểm",
            "khách phàn nàn công khai trong khi khu vực đông",
            "thiếu nhân sự đột xuất trong ca",
            "sự cố an toàn thực phẩm hoặc tài sản",
            "mục tiêu doanh thu xung đột với chất lượng dịch vụ",
        ),
    ),
    IndustrySpec(
        name="Khác",
        slug="general",
        aliases=("other", "general", "khác"),
        levels=("Junior", "Middle", "Senior", "Lead"),
        competencies=(
            "hiểu vai trò và mục tiêu",
            "kiến thức/chuyên môn liên quan JD",
            "giải quyết vấn đề",
            "giao tiếp",
            "hợp tác",
            "ownership",
            "khả năng học",
            "đạo đức nghề nghiệp",
        ),
        evidence=(
            "nhiệm vụ, constraint và vai trò cá nhân rõ",
            "hành động theo trình tự thay vì mô tả chung",
            "kết quả định lượng hoặc phản hồi có nguồn",
            "trade-off và tiêu chí ra quyết định",
            "bài học cùng thay đổi hành vi sau đó",
        ),
        risks=(
            "câu trả lời khẩu hiệu không có ví dụ",
            "đánh giá tính cách thay cho hành vi liên quan công việc",
            "hỏi thông tin nhạy cảm không cần thiết cho JD",
        ),
        scenarios=(
            "ưu tiên nhiều deadline cạnh tranh",
            "sửa một sai sót có ảnh hưởng tới người khác",
            "học nhanh một kỹ năng mới để giao việc",
            "bất đồng với stakeholder về cách làm",
            "cải tiến một quy trình đang kém hiệu quả",
        ),
    ),
)


def normalize_key(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().casefold())
    without_marks = "".join(
        character for character in normalized if unicodedata.category(character) != "Mn"
    )
    return re.sub(r"[^a-z0-9]+", " ", without_marks).strip()


def slugify(value: str) -> str:
    return normalize_key(value).replace(" ", "-")


def _industry_lookup() -> dict[str, IndustrySpec]:
    lookup: dict[str, IndustrySpec] = {}
    for industry in INDUSTRIES:
        for key in (industry.name, industry.slug, *industry.aliases):
            lookup[normalize_key(key)] = industry
    return lookup


INDUSTRY_LOOKUP = _industry_lookup()
FALLBACK_INDUSTRY = next(item for item in INDUSTRIES if item.slug == "general")


def resolve_industry(value: str) -> IndustrySpec:
    return INDUSTRY_LOOKUP.get(normalize_key(value), FALLBACK_INDUSTRY)


def resolve_profile(industry: str, level: str) -> ProfileSpec:
    industry_spec = resolve_industry(industry)
    normalized_level = normalize_key(level)
    level_index = next(
        (
            index
            for index, candidate in enumerate(industry_spec.levels)
            if normalize_key(candidate) == normalized_level
        ),
        1,
    )
    canonical_level = industry_spec.levels[level_index]
    return ProfileSpec(
        industry=industry_spec,
        level=canonical_level,
        level_slug=slugify(canonical_level),
        tier=TIERS[level_index],
    )


def all_profiles() -> tuple[ProfileSpec, ...]:
    return tuple(
        ProfileSpec(
            industry=industry,
            level=level,
            level_slug=slugify(level),
            tier=TIERS[index],
        )
        for industry in INDUSTRIES
        for index, level in enumerate(industry.levels)
    )

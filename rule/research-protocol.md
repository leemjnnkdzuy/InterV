# Research protocol

## 1. Phạm vi

Nghiên cứu tập trung vào khả năng nhận dạng tiếng Việt của FunASR trong bối cảnh phỏng vấn: âm thanh hội thoại, tốc độ nói khác nhau, tạp âm và thuật ngữ chuyên môn. Mục tiêu là xác định khi nào mô hình nền đủ dùng và khi nào fine-tuning đem lại cải thiện có ý nghĩa.

## 2. Câu hỏi nghiên cứu

1. Fine-tuning trên dữ liệu tiếng Việt có làm giảm WER/CER trên tập kiểm tra độc lập không?
2. Cải thiện có giữ được trên các nhóm âm thanh chưa xuất hiện trong tập huấn luyện không?
3. Chi phí inference, độ trễ và mức sử dụng tài nguyên thay đổi như thế nào?
4. Các lỗi còn lại thuộc về âm vị, phân đoạn, dấu câu hay thuật ngữ riêng?

## 3. Nguyên tắc dữ liệu

- Tách speaker trước khi chia train/dev/test; không để cùng một speaker xuất hiện ở nhiều tập.
- Giữ bản gốc bất biến và tạo manifest phiên bản hóa.
- Loại bỏ thông tin cá nhân không cần thiết; mã hóa định danh speaker.
- Ghi rõ giấy phép, nguồn thu thập, consent và điều kiện sử dụng.
- Không đưa test transcript vào quá trình chọn checkpoint hoặc chỉnh hyperparameter.

## 4. Thiết kế đánh giá

### Baseline

- Chạy mô hình FunASR/SenseVoice hiện tại trên cùng test set.
- Lưu transcript thô, transcript chuẩn hóa, thời gian chạy và phiên bản model.

### Fine-tuned model

- Chỉ thay đổi một nhóm biến mỗi lần thử.
- Chọn checkpoint bằng dev set; test set chỉ mở một lần ở bước đánh giá cuối.
- Báo cáo WER và CER theo tổng thể và theo các slice: tốc độ nói, nhiễu, vùng giọng, độ dài câu.

### Tiêu chí kết luận

Một kết luận chỉ được ghi là cải thiện khi:

- metric được tính từ cùng một bộ quy tắc chuẩn hóa;
- có số liệu baseline và fine-tuned trên cùng test set;
- có khoảng tin cậy hoặc bootstrap nếu kích thước dữ liệu cho phép;
- có artefact, hash và lệnh tái hiện trong [evidence-log.md](evidence-log.md).

## 5. Reproducibility checklist

- [ ] Commit hoặc tag code đã dùng.
- [ ] Hash manifest train/dev/test.
- [ ] Phiên bản Python, CUDA, PyTorch, FunASR và tokenizer.
- [ ] Cấu hình training và seed.
- [ ] Log loss/metric theo từng epoch.
- [ ] Checkpoint cuối và checkpoint được chọn.
- [ ] Lệnh inference đánh giá.
- [ ] Bảng kết quả và lỗi đại diện đã ẩn dữ liệu nhạy cảm.

## 6. Giới hạn cần nêu trong báo cáo

Kết quả trên một bộ âm thanh tiếng Việt không đại diện cho mọi vùng giọng, thiết bị thu hoặc môi trường triển khai. Mọi tuyên bố ngoài phạm vi dữ liệu phải được ghi là giả thuyết hoặc hướng nghiên cứu tiếp theo.

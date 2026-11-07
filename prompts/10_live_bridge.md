# PROMPT 10 — TikTok LIVE adapter (chạy chỉ khi có kết nối được phép)
DỪNG VÀ KIỂM TRA TRƯỚC: Có TikTok LIVE access? Có tài liệu/API hoặc nhà cung cấp cho phép dùng? Có quyền sử dụng cho tài khoản chưa? Nếu KHÔNG, không bịa endpoint và không triển khai production; chỉ tạo interface/test harness và trả lời điều kiện còn thiếu.
KHI ĐÃ ĐƯỢC PHÉP:
Nghiên cứu tài liệu hiện hành của provider được người dùng chọn và lưu link/version, bảo đảm tương thích điều khoản.
Implement TikTokAdapter extends LiveEventAdapter: normalize comment, gift, like, follow where source thực sự có; stable IDs; session/room; reconnect; status.
Keys từ env server-side, không log credentials/PII. Tuân thủ rate limits.
Gift streak accumulation cumulative, finalize exactly once, missing group IDs safe conservative processing; no fake funds/prices.
UI clearly shows LIVE CONNECTED / DISCONNECTED; retain Mock Mode toggle strictly for private testing, block synthetic live events in public production.
Record real integration acceptance in docs/LIVE_INTEGRATION_REPORT.md với versions, test cases and known unknowns.

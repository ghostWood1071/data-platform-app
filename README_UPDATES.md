# Cập Nhật Dự Án (Recent Updates)

Tài liệu này ghi lại các thay đổi quan trọng đã được thực hiện để hỗ trợ chạy dự án trên môi trường Windows và cải thiện độ ổn định của hệ thống.

### 1. Hỗ Trợ Windows & Môi Trường Phát Triển
- **Sửa lỗi cấu hình:** Đã sửa lỗi cú pháp trong `package.json` gốc (dấu phẩy thừa).
- **Tương thích Windows:** Cập nhật các lệnh `dev` để sử dụng `cross-env`, giúp thiết lập biến môi trường (PORT, NODE_ENV, VITE_API_URL) hoạt động trên Windows.
- **Tự động cài đặt phụ thuộc:** Đã thêm các gói native Windows cần thiết cho `rollup`, `lightningcss`, và `tailwindcss/oxide` vào workspace.
- **Cơ chế kiểm tra `cross-env`:** Thêm script tự động kiểm tra và cài đặt `cross-env` nếu chưa có trong hệ thống trước khi khởi chạy server.

### 2. Cải Thiện API & Frontend
- **Tự động chọn API Endpoint:** Frontend hiện tại có khả năng tự động chọn API URL:
  - Sử dụng `import.meta.env.VITE_API_URL` nếu được thiết lập.
  - Mặc định sử dụng đường dẫn tương đối (relative path) cho môi trường Docker/Production.
- **Lệnh chạy mới:** Thêm lệnh `pnpm --filter @workspace/data-platform-portal run dev:windows` để kết nối nhanh với API server chạy tại `localhost:8080`.
- **Sửa lỗi Runtime:** 
  - Sửa lỗi `toString()` khi `clusterData` chưa kịp tải trong trang Spark Cluster.
  - Sửa lỗi `.filter()` không phải là hàm trong trang Services bằng cách kiểm tra kiểu dữ liệu mảng.

### 3. Sửa Lỗi TypeScript
- Đồng bộ hóa các kiểu dữ liệu (`User`, `SparkCluster`, v.v.) giữa các thư viện nội bộ và ứng dụng frontend.
- Cập nhật các import để sử dụng đúng đường dẫn từ `@workspace/api-client-react`.

### 4. Hỗ trợ Deployment (K8s & Docker)
- **Dockerfile:** Đã tạo Dockerfile đa giai đoạn để đóng gói cả frontend (phục vụ bằng Nginx) và backend (Node.js) vào một image duy nhất `data-portal-app`.
- **K8s Manifests:** Thêm thư mục `k8s/` chứa các cấu hình Deployment, Service và Ingress.
- **Ingress Configuration:** Đã cấu hình Ingress với domain `portal-app.k8s.tailnet`, tích hợp với Nginx Ingress Controller trong namespace `load-balancer`.

---

## Hướng Dẫn Chạy Dự Án (Windows)

1. **Khởi chạy API Server:**
   ```powershell
   pnpm --filter @workspace/api-server run dev
   ```

2. **Khởi chạy Frontend Portal:**
   ```powershell
   pnpm --filter @workspace/data-platform-portal run dev:windows
   ```

## Hướng Dẫn Deployment (Docker & K8s)

1. **Build Docker Image:**
   ```bash
   docker build -t data-portal-app:latest .
   ```

2. **Deploy lên K8s:**
   ```bash
   kubectl apply -f k8s/deploy.yaml
   ```
   *Lưu ý: Đảm bảo Ingress Controller đã được cài đặt trong namespace `load-balancer`.*

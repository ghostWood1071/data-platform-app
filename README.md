Dựa trên việc phân tích các tệp cấu hình và mã nguồn, dự án đang sử dụng các công nghệ chính sau cho phần back-end:

- **Runtime:** `Node.js` (phiên bản 20 trở lên, được xác định trong Dockerfile).
- **Framework:** `Express.js` (phiên bản 5.x).
- **Ngôn ngữ:** `TypeScript` (toàn bộ dự án sử dụng TypeScript để đảm bảo an toàn về kiểu dữ liệu).
- **Cơ sở dữ liệu & ORM:**
  - **ORM:** `Drizzle ORM`.
  - **Database Driver:** `pg` (PostgreSQL client).
  - **Schema Validation:** `Zod` (kết hợp với `drizzle-zod` để định nghĩa và kiểm tra dữ liệu).
- **Logging:** `Pino` (cùng với `pino-http` cho Express).
- **Quản lý Workspace:** `pnpm` (sử dụng pnpm-workspace để quản lý các gói con như `@workspace/api-server`, `@workspace/db`).
- **Build Tool:** `esbuild` (được dùng để đóng gói mã nguồn back-end nhanh chóng).

---

### Cấu trúc dự án (Project Structure)

Dự án được tổ chức theo mô hình **Monorepo** sử dụng pnpm workspaces:

```text
data-platform-app/
├── artifacts/                  # Chứa các ứng dụng thực thi chính
│   ├── api-server/             # Mã nguồn Back-end (Express API)
│   │   ├── src/                # Logic xử lý API
│   │   ├── dist/               # Kết quả build (file .mjs)
│   │   └── package.json
│   └── data-platform-portal/   # Mã nguồn Front-end (React + Vite)
├── lib/                        # Các thư viện dùng chung (Internal Packages)
│   ├── api-spec/               # Định nghĩa đặc tả API
│   ├── api-zod/                # Schema xác thực dữ liệu (Zod)
│   ├── db/                     # Cấu hình Database & Drizzle Schema
│   │   ├── src/schema/         # Định nghĩa các bảng Database
│   │   └── drizzle.config.ts
│   └── api-client-react/       # Client kết nối API dành cho React
├── k8s/                        # Các tệp cấu hình Kubernetes (Deployment, Ingress)
├── scripts/                    # Các script hỗ trợ build và kiểm tra hệ thống
├── Dockerfile                  # Cấu hình đóng gói ứng dụng (Multi-stage build)
├── pnpm-workspace.yaml         # Định nghĩa các gói trong monorepo
├── package.json                # Cấu hình root dự án
└── tsconfig.base.json          # Cấu hình TypeScript dùng chung
```

### Điểm nổi bật trong kiến trúc:
1. **Chia sẻ kiểu dữ liệu:** Nhờ dùng Monorepo và Zod, các định nghĩa dữ liệu (Types) được chia sẻ trực tiếp giữa `api-server` (back-end) và `data-platform-portal` (front-end) thông qua các gói trong thư mục `lib/`.
2. **Containerization:** Dự án đã có sẵn Dockerfile và K8s manifests, hỗ trợ triển khai đồng bộ cả Front-end (Nginx) và Back-end (Node.js).
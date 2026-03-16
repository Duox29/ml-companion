# ML Companion Frontend - Tổng hợp cấu trúc, screen, endpoint backend

## 1) Cấu trúc project (tóm tắt)

```text
ml-companion-frontend/
|- android/                    # Android Capacitor project
|- data/                       # Dữ liệu/script phụ trợ ngoài src
|- dist/                       # Build output
|- scripts/                    # Script crawl/refine/bundle dữ liệu hero
|- src/
|  |- components/              # UI components dùng chung (vd: PrivateRoute)
|  |- contexts/                # React context (AuthContext)
|  |- data/wiki/               # Dữ liệu hero bundle local
|  |- hooks/                   # Custom hooks (useWikiData)
|  |- screens/                 # Các màn hình chính của app
|  |  |- Auth/
|  |  |- MainApp/
|  |  |- Wiki/
|  |  |- Community/
|  |  |- Chat/
|  |  |- Inbox/
|  |  |- Profile/
|  |- services/                # API client, websocket chat, storage, cache...
|  |- App.tsx                  # Root app flow (session + auth/guest routing)
|  |- main.tsx                 # Entry point + BrowserRouter
|  |- types.ts                 # Kiểu dữ liệu dùng chung
|- .env                        # Biến môi trường (VITE_API_URL, ...)
|- capacitor.config.ts         # Capacitor config
|- vite.config.ts              # Vite config
|- ARCHITECTURE.md             # Tài liệu kiến trúc hiện có
|- README.md
```

## 2) Screens và route

### Luồng root
- `App.tsx`
  - Restore session từ storage.
  - Nếu chưa hoàn tất onboarding (`app_onboarding_version !== v2`) thì luôn vào `AuthFlow` để chạy intro/onboarding, kể cả khi đang ở route Wiki.
  - Nếu đã hoàn tất onboarding: chưa auth nhưng ở route Wiki có thể vào app ở chế độ guest.
  - Nếu chưa auth và không ở route Wiki thì vào `AuthFlow`.
  - Còn lại vào `MainApp`.

### Tabs trong MainApp
- `/wiki/*` -> `WikiTab`
- `/community` -> `CommunityTab`
- `/chat` -> `ChatTab`
- `/inbox` -> `InboxTab`
- `/profile` -> `ProfileTab`
- `/` -> redirect `/wiki`
- `*` -> redirect `/wiki`

### Chi tiết từng screen
- `Auth`
  - Step nội bộ: `splash`, `onboarding`, `login`, `register`, `forgot`.
  - Không dùng route riêng, hiển thị theo state của `App.tsx`.
- `Wiki`
  - `/wiki` (All)
  - `/wiki/heroes`
  - `/wiki/heroes/:slug?section=skills|stats|lore|combos`
  - `/wiki/event`
  - `/wiki/news`
  - News/Event detail render rich content theo format backend (`contentFormat`/`descriptionFormat`)
- `Community`
  - Feed + create post UI (hiện tại mock, chưa gọi backend).
- `Chat`
  - Channel list + chat room realtime (có gọi backend HTTP + WebSocket).
- `Inbox`
  - Danh sách chat + direct message UI (hiện tại mock, chưa gọi backend).
- `Profile`
  - Profile + settings UI (logout local, chưa gọi backend profile APIs).

## 3) Endpoint frontend gọi backend

Base URL dùng chung:
- `VITE_API_URL` (fallback: `http://localhost:8080`)

### 3.1 Auth

- `POST /auth/login`
  - File: `src/screens/Auth/Auth.tsx`
  - Mục đích: đăng nhập bằng username/email + password.

- `POST /auth/register`
  - File: `src/screens/Auth/Auth.tsx`
  - Mục đích: tạo tài khoản.

- `POST /auth/google`
  - File: `src/screens/Auth/Auth.tsx`
  - Mục đích: đăng nhập bằng Google ID token.

- `POST /auth/refresh`
  - File: `src/services/api.ts`
  - Mục đích: refresh access token khi token hết hạn.

Ghi chú:
- `src/services/api.ts` có khai báo danh sách public auth endpoints:
  - `/auth/login`, `/auth/register`, `/auth/google`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`
- Hiện tại UI `ForgotPassword` chưa gọi API thực tế (chưa gọi `/auth/forgot-password`).

### 3.2 Global Chat (HTTP)

- `GET /channels`
  - File: `src/services/globalChat.ts`
  - Hàm: `fetchGlobalChannels()`
  - Mục đích: lấy danh sách channel.

- `GET /channels/:channelId/messages?page=&limit=`
  - File: `src/services/globalChat.ts`
  - Hàm: `fetchGlobalChannelMessages()`
  - Mục đích: lấy lịch sử message theo channel.

- `POST /channels/:channelId/messages`
  - File: `src/services/globalChat.ts`
  - Hàm: `sendGlobalChannelMessage()`
  - Mục đích: gửi message qua REST.

### 3.3 Global Chat (WebSocket/STOMP)

- Handshake URL: `/ws` (quy đổi từ http/https sang ws/wss theo `VITE_API_URL`)
  - File: `src/services/globalChat.ts`

- Subscribe topic: `/topic/channels/:channelId`
  - File: `src/services/globalChat.ts`
  - Dùng để nhận message realtime.

- Publish destination: `/app/channels/:channelId/send`
  - File: `src/services/globalChat.ts`
  - Hàm `sendGlobalChannelMessageRealtime()`.

### 3.4 Wiki data sync

- Version check (thử lần lượt endpoint backend hỗ trợ):
  - `GET /wiki/heroes/version`
  - `GET /mlbb/wiki/heroes/version`
  - File: `src/hooks/useWikiData.ts`

- Bundle data (thử lần lượt endpoint backend hỗ trợ):
  - `GET /wiki/heroes/bundle`
  - `GET /mlbb/wiki/heroes/bundle`
  - File: `src/hooks/useWikiData.ts`

### 3.6 Wiki content APIs (News/Event)

- `GET /wiki/news`, `GET /wiki/news/:id` (và alias `/mlbb/wiki/news*`)
  - File: `src/hooks/useWikiData.ts`
  - Parse thêm field `contentFormat` (`MARKDOWN` | `PLAIN`) để render nội dung.

- `GET /wiki/events`, `GET /wiki/events/:id` (và alias `/mlbb/wiki/events*`)
  - File: `src/hooks/useWikiData.ts`
  - Parse thêm field `descriptionFormat` (`MARKDOWN` | `PLAIN`) để render nội dung.

### 3.5 Image fallback proxy (Wiki)

- `GET /wiki/heroes/image-fallback?url=<encoded-url>`
  - File: `src/services/imageCache.ts`
  - Mục đích: backend proxy trả base64 image khi frontend không fetch/caching trực tiếp được.

## 4) Mapping nhanh: screen -> backend

- `Auth` -> gọi Auth APIs (`/auth/login`, `/auth/register`, `/auth/google`)
- `Wiki` -> gọi Wiki sync APIs (version + bundle), image fallback proxy
- `Chat` -> gọi Channels/Messages APIs + WebSocket STOMP
- `Community` -> chưa gọi backend (mock data)
- `Inbox` -> chưa gọi backend (mock data)
- `Profile` -> chưa gọi backend profile (chủ yếu UI + local logout)

## 5) Ghi chú kỹ thuật

- Axios interceptor tự gắn Bearer token và tự refresh token khi gặp 401/403.
- Nếu refresh thất bại, app phát event `auth:logout` để đưa người dùng về trạng thái guest.
- Một số endpoint đã được chuẩn bị trong code nhưng chưa có luồng UI dùng thực tế (`/auth/forgot-password`, `/auth/reset-password`).
- Wiki News/Event detail dùng rich content renderer:
  - Hỗ trợ hyperlink (`[text](url)` hoặc URL trực tiếp)
  - Hỗ trợ image URL (dòng chứa URL ảnh hoặc markdown image `![alt](url)`)
  - Hỗ trợ YouTube embed (dòng chứa YouTube URL)

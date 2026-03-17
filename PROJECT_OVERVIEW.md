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
|  |- contexts/                # React context
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
|- PROJECT_OVERVIEW.md         # Tài liệu tổng quan dự án
|- README.md
```

## 2) Screens và route

### Luồng root
- `App.tsx`
  - Restore session từ storage.
  - Nếu chưa hoàn tất onboarding (`app_onboarding_version !== v2`) thì luôn vào `AuthFlow`.
  - Nếu đã onboarding xong: chưa auth vẫn có thể vào app ở chế độ guest.
  - Nếu gặp invalidate token (event `auth:logout`), app chuyển về anonymous mode.

### Tabs trong MainApp
- `/wiki/*` -> `WikiTab`
- `/community` -> `CommunityTab`
- `/chat` -> `ChatTab` (channel list)
- `/chat/:channelId` -> `ChatTab` (deep link trực tiếp vào channel)
- `/inbox` -> `InboxTab`
- `/profile` -> `ProfileTab`
- `/` -> redirect `/wiki`
- `*` -> redirect `/wiki`

### Chi tiết từng screen
- `Auth`
  - Step nội bộ: `splash`, `onboarding`, `login`, `register`, `forgot`.
  - Không dùng route riêng, hiển thị theo state của `App.tsx`.
  - Login:
    - Web: Google Identity Services button (`/auth/google`).
    - Native Android: `@capgo/capacitor-social-login` -> lấy `idToken` -> `/auth/google`.
  - Register đã gọi API thật (`/auth/register`).
  - Forgot password hiện chỉ có UI, chưa gọi API runtime.
- `Wiki`
  - `/wiki` (All)
  - `/wiki/heroes`
  - `/wiki/heroes/:slug?section=skills|stats|lore|combos`
  - `/wiki/event`
  - `/wiki/event/:id`
  - `/wiki/news`
  - `/wiki/news/:id`
  - News/Event detail render rich content theo format backend (`contentFormat`/`descriptionFormat`).
  - Heroes list có incremental loading theo lô.
- `Community`
  - Feed + create post UI hiện tại là mock data, chưa gọi backend posts APIs.
- `Chat`
  - Channel list + chat room realtime (có gọi backend HTTP + WebSocket).
  - Route detail `/chat/:channelId` để mở phòng trực tiếp.
  - Khi đang ở channel detail, bottom navigation được ẩn.
  - Trong room:
    - Load 50 tin nhắn mới nhất (`page=1&limit=50`).
    - Kéo lên để load thêm lịch sử (`page=2,3,...`).
    - Gửi tin nhắn qua REST `POST /channels/{id}/messages`.
    - Subscribe realtime qua STOMP `/topic/channels/{id}`.
    - Có emoji/sticker tokens và hỗ trợ gửi ảnh (URL hoặc upload local, encode `[img]...[/img]`).
- `Inbox`
  - Danh sách hội thoại + direct message UI hiện tại mock, chưa gọi backend.
- `Profile`
  - Profile/settings UI hiện tại mock.
  - Logout là local logout (xóa token/session local).

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
  - Mục đích: đăng nhập bằng Google ID token (web + android native).
- `POST /auth/refresh`
  - File: `src/services/api.ts`
  - Mục đích: refresh access token khi access token hết hạn.

Ghi chú:
- `src/services/api.ts` khai báo public auth endpoints:
  - `/auth/login`, `/auth/register`, `/auth/google`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`
- Hiện tại UI Forgot Password chưa gọi API thực tế (`/auth/forgot-password`).

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
- Handshake URL: `/ws` (tự quy đổi http/https sang ws/wss theo `VITE_API_URL`)
  - File: `src/services/globalChat.ts`
- Subscribe topic: `/topic/channels/:channelId`
  - File: `src/services/globalChat.ts`
- Publish destination: `/app/channels/:channelId/send`
  - File: `src/services/globalChat.ts`
  - Hàm: `sendGlobalChannelMessageRealtime()`

Ghi chú verify backend:
- Backend hiện implement `@MessageMapping("/channels/{id}/send")`.
- Frontend Chat screen hiện gửi chủ yếu qua REST, đồng thời vẫn subscribe realtime để nhận broadcast.

### 3.4 Wiki data sync (Heroes)
- Version check (thử lần lượt):
  - `GET /wiki/heroes/version`
  - `GET /mlbb/wiki/heroes/version`
  - File: `src/hooks/useWikiData.ts`
- Bundle data (thử lần lượt):
  - `GET /wiki/heroes/bundle`
  - `GET /mlbb/wiki/heroes/bundle`
  - File: `src/hooks/useWikiData.ts`

### 3.5 Wiki content APIs (News/Event)
- `GET /wiki/news`, `GET /wiki/news/:id` (và alias `/mlbb/wiki/news*`)
  - File: `src/hooks/useWikiData.ts`
  - Parse `contentFormat` (`MARKDOWN` | `PLAIN`) để render nội dung.
- `GET /wiki/events`, `GET /wiki/events/:id` (và alias `/mlbb/wiki/events*`)
  - File: `src/hooks/useWikiData.ts`
  - Parse `descriptionFormat` (`MARKDOWN` | `PLAIN`) để render nội dung.

### 3.6 Image fallback proxy (Wiki)
- `GET /wiki/heroes/image-fallback?url=<encoded-url>`
  - File: `src/services/imageCache.ts`
  - Mục đích: backend proxy trả base64 image khi frontend không fetch/caching trực tiếp được.

## 4) Mapping nhanh: screen -> backend

- `Auth` -> Auth APIs (`/auth/login`, `/auth/register`, `/auth/google`, refresh trong interceptor)
- `Wiki` -> Wiki heroes sync APIs, wiki news/event APIs, image fallback proxy
- `Chat` -> Channels/Messages APIs + WebSocket STOMP
- `Community` -> hiện chưa gọi backend (mock)
- `Inbox` -> hiện chưa gọi backend (mock)
- `Profile` -> hiện chưa gọi backend profile APIs (UI + local logout)

## 5) Ghi chú kỹ thuật

- Axios interceptor tự gắn Bearer token và tự refresh token khi gặp 401/403.
- Nếu refresh thất bại, app phát event `auth:logout` để đưa người dùng về anonymous mode.
- `MainApp` có gesture native Android:
  - Hardware back button gọi `navigate(-1)` khi có history.
  - Swipe ngang trái/phải trên vùng nội dung để chuyển tab liền kề.
  - Chuyển tab có animation fade + slide, có tôn trọng `prefers-reduced-motion`.
- Luồng dữ liệu Heroes của Wiki:
  - Có local bundle fallback trong `src/data/wiki/heroes.bundle.json`.
  - Ưu tiên render nhanh preview, parse full bundle theo chunk để tránh block UI.
  - Chỉ eager full load khi vào khu vực heroes.
  - Ảnh heroes có pre-cache theo mức ưu tiên.
- Luồng dữ liệu Wiki News/Event có client cache:
  - Cache list `news/events` và detail theo `id` trong local storage.
  - Ưu tiên render cache trước, sau đó revalidate nền từ API.
- Wiki detail dùng rich content renderer:
  - Hỗ trợ markdown cơ bản, hyperlink, image URL, YouTube embed.
- Chat room:
  - Dùng `flex-col-reverse` để giữ UX kiểu chat mới nhất gần vùng input.
  - Có infinite load lịch sử cũ dựa trên scroll threshold.
  - Có bộ assets emoji/sticker tùy chỉnh từ service `chatAssets`.

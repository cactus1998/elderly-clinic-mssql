---
name: vue-conventions
description: 本專案前端（web/，Vue 3 + TypeScript + Tailwind CSS v4 + Pinia + Vite）的撰寫規範：元件、Pinia store、API 呼叫、型別共用、畫面狀態、樣式與病人資料處理。使用時機：在 web/src 下撰寫或修改任何 .vue / .ts 檔案時。
---

# Vue 撰寫規範（web/）

## 目錄

```
web/src/
  api/client.ts     唯一呼叫 fetch 的地方；自動帶 Bearer token，收到 401 通知 auth store 登出
  router/index.ts   vue-router（hash 模式）；頁面 lazy load；beforeEach 檢查登入
  views/            路由頁面（XxxView.vue）
  components/       畫面元件（PascalCase，至少兩個單字）與共用元件（AppLayout、AppDialog、PaginationBar、StatusBadge…）
  composables/      usePagedQuery（分頁查詢）、useListRoute（清單與網址同步）、routeQuery（解析 query）
  stores/           Pinia setup store（useXxxStore）
  App.vue           只放 RouterView
```

## 路由與頁面

- 新頁面加在 `router/index.ts` 的 AppLayout children，元件用 `() => import(...)` lazy load，`meta.title` 設定分頁標題。
- 只有 `/login` 標 `meta.public`；其餘頁面都要登入。登入後導回的 `redirect` 一律經過 `safeRedirect`。
- 路由參數用 `props` 傳給頁面（例如 `props: (r) => ({ id: Number(r.params.id) })`），頁面不直接讀 `route.params`。
- 清單頁的分頁與篩選放網址 query，用 `useListRoute` 同步：使用者操作改網址，網址變動才查詢。病人搜尋關鍵字等個資不放網址，只存在 store。
- 刪除、停用等不可逆或影響大的操作用 `useUiStore().confirm(...)`（自訂對話框），不用瀏覽器 `confirm()`；完成後用 `showToast(...)` 提示。
- 對話框用 `AppDialog`（原生 `<dialog>` + `showModal()`，焦點與 Esc 由瀏覽器處理）。

## 型別

- API 的型別一律從 `@api-types/clinic-api`（即 `api/types/clinic-api.ts`）`import type`，不在 `web/` 重複定義。
- 後端 DTO 改了，先改 `api/types/clinic-api.ts`，再讓 `npm run build` 的型別檢查找出前端要跟著改的地方。
- 不用 `any`；外部資料用 `unknown` 再縮小型別。避免不必要的 `as` 與 `!`。
- 列舉值的對照表用 `Record<聯集型別, string>`（參考 `ClinicList.vue` 的 `statusLabel`），新增狀態時型別檢查會提醒補上。

## 元件

- 一律 `<script setup lang="ts">`；區塊順序 script、template。
- Props：`defineProps<{ ... }>()` 純型別宣告，預設值用解構預設值。
- Emits：`defineEmits<{ select: [id: number] }>()` tuple 寫法。
- 自訂 v-model 用 `defineModel<T>()`。
- 元件只負責畫面；資料取得與業務邏輯放 store。
- 列表 `:key` 用資料主鍵（`appointmentId`、`vitalId`），不用 index。
- 可點擊元素用 `<button>`；巢狀在可點擊列內的按鈕用 `@click.stop`。

## Pinia store

- setup store 寫法，所有 state 都要 return（devtools 才看得到）。
- 衍生資料用 `computed`，不用 watch 手動賦值。
- 元件中解構 state / getters 用 `storeToRefs(store)`；actions 直接從 store 呼叫。直接用 `store.xxx` 也可以，但不要直接解構 store。
- 每個非同步 action 管理自己的 `loading` 與 `error`，用 `try / finally` 確保 loading 會被關掉。
- 同一份資料可能被連續觸發（例如快速切換病人）時，用請求序號或 `AbortController` 丟棄過期的回應。

## API 呼叫

- 元件與 store 只呼叫 `api/client.ts` 匯出的 `api.xxx()`，不直接 `fetch`。
- 新增 API 方法時路徑與參數對照 `api/api.http`；query 用 `URLSearchParams` 組，不手動串字串。
- 錯誤訊息從 `ApiError.message` 顯示（已依 ProblemDetails 的 `errors` / `detail` / `title` 取值）。

## 畫面狀態

每個查詢區塊都要有四種狀態：載入中、空資料、錯誤訊息、正常資料。數值為 `null` 時顯示「—」。

## 時間

- 後端 `DateTime` 序列化為不含時區的 ISO 字串（`2026-11-05T08:00:00`），代表台灣當地時間，不要用 `new Date()` 轉成 UTC。
- 送給 API 的日期用本地日期 `yyyy-MM-dd`；不要用 `toISOString()`（會變成 UTC 日期）。

## 樣式（UI 規範見 `docs/PRD-ui-standards.md`）

- 按鈕、表單、卡片、表格、提示一律用 `src/assets/main.css` 的共用 class，不要在元件裡重新拼一套：
  - 按鈕：`btn` 加 `btn-primary` / `btn-secondary` / `btn-danger` / `btn-danger-outline`，小尺寸再加 `btn-sm`；表格列內操作用 `link-action` / `link-action-danger`
  - 表單：`form-label`、`form-control`、`form-hint`，必填用 `required-mark` 加 `sr-only`「（必填）」
  - 卡片：`card`、`card-header`、`card-title`、`card-body`、`card-footer`、`toolbar`
  - 表格：`data-table`；數值欄 `num`、單位 `unit`、操作欄 `col-actions`
  - 狀態：`alert-error`、`alert-info`、`empty-state` / `empty-state-title`、`badge`
- Tailwind utility 只用在版面（flex、grid、間距、寬度）。
- 每頁用 `PageHeader` 放唯一的 `h1` 與主要操作；一個區塊只有一個主要按鈕。
- 分頁放卡片頁尾：`<PaginationBar class="card-footer mt-auto" />`，卡片加 `flex flex-col`。
- 表單與對話框的按鈕靠右，順序是「取消、主要按鈕」。
- 狀態徽章顏色集中在對照表，同一狀態全站同一顏色，且一定附文字，不只靠顏色。
- 版面 mobile-first：手機單欄，`lg:` 以上才分欄；寬表格外層加 `overflow-x-auto`。
- 畫面文案不寫方位（左側、右側、上方、下方），RWD 換版後方位會錯。改用區塊名稱，例如「門診清單中的病人」「生命徵象面板」。

## 病人資料（個資）

- 病人姓名、病歷號不寫入 `localStorage` / `sessionStorage`、不放進 URL query、不 `console.log`。
- `localStorage` 只能存 UI 偏好（例如預設天數）。
- access token 只存在 `sessionStorage`，由 `stores/auth.ts` 管理；元件不直接讀寫 token。
- 登出時呼叫各 store 的 `reset()` 清掉病人資料，避免下一位使用者看到。

## 驗證

```powershell
cd web
npm run build      # vue-tsc 型別檢查 + vite build，必須無錯誤
```

不新增套件，除非先說明理由並取得同意。

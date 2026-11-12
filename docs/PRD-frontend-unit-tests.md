# PRD：前端單元測試（frontend-unit-tests）

> 版本：1.1.0 ｜ 狀態：進行中（待使用者驗收） ｜ 最後更新：2026-11-12

## 目標

前端目前只靠瀏覽器手動驗證，改一個共用函式（例如分頁、網址參數）就要重新點過所有頁面，也無法證明安全相關的邏輯（登入後導向、token 過期登出）在每次修改後仍然正確。本功能建立 Vitest 測試環境，替最關鍵的邏輯補上單元測試與元件測試，之後每次修改都能在幾秒內確認沒有改壞。

## 範圍

**包含**
- 測試環境：Vitest + @vue/test-utils + jsdom，`npm run test:run` 執行，測試檔也做型別檢查。
- 純函式：`composables/routeQuery.ts`。
- 清單與網址同步：`composables/useListRoute.ts`（以記憶體路由測試）。
- api client：`api/client.ts`（token、ProblemDetails、401 處理、query 組法）。
- composable：`usePagedQuery`。
- Pinia store：`auth`、`clinic`、`ui`、`masterData`、`vitals`。
- 元件：`PaginationBar`、`VitalForm`、`StatusBadge`。

**不包含**
- 後端測試（之後另外規劃 xUnit）。
- 端對端測試（Cypress / Playwright）；畫面流程仍以瀏覽器驗證。
- CI 自動執行（repo 尚未設定 CI）。
- 覆蓋率套件（`@vitest/coverage-v8`），需要時再裝。

## 決策

| 項目 | 決定 | 理由 |
|------|------|------|
| 測試框架 | Vitest | 沿用 Vite 設定與路徑別名，不需要 Babel；API 與 Jest 相同 |
| 元件掛載 | @vue/test-utils | Vue 官方工具；不另外加 Testing Library，以 `aria-label` 與文字找元素達到相同原則 |
| DOM | jsdom | 社群最常用，`sessionStorage`、`Response` 都可用 |
| 設定檔 | 獨立 `vitest.config.ts` | 不載入 devtools 外掛；別名與 `vite.config.ts` 一致 |
| 型別檢查 | `tsconfig.vitest.json` 加入 `vue-tsc --build` | 測試檔型別錯誤也會讓 `npm run build` 失敗；正式版仍排除測試檔 |
| Mock 範圍 | 只 mock 邊界：`@/api/client` 的 `api`、全域 `fetch`、時間 | 測試不打網路，被測程式本身不 mock |
| 規範 | `unit-test` skill | 撰寫流程與規則集中一處 |

## 驗收標準

- [x] AC-01：`npm run test:run` 全部通過，不需要啟動 API 或資料庫
- [x] AC-02：`npm run build` 包含測試檔型別檢查且無錯誤；`dist/` 不含測試程式
- [x] AC-03：`safeRedirect` 擋下其他網站、協定相對網址、反斜線、登入頁，只放行站內路徑
- [x] AC-04：網址參數非法時（`abc`、`0`、`-1`、`1.5`、不在選項內的每頁筆數）回到預設值
- [x] AC-05：api client 帶 token、解析 ProblemDetails（`errors`、`detail`、`title`、空 body），有 token 的 401 才觸發登出
- [x] AC-06：分頁查詢丟棄較舊的回應；超過最後一頁時自動跳到最後一頁
- [x] AC-07：登入失敗顯示正確訊息（401、429）；token 過期時登出並清空所有 store
- [x] AC-08：報到成功更新狀態，失敗保留原狀態並顯示錯誤；重新查詢門診清單時清空選取
- [x] AC-09：分頁列頁碼與省略號正確、第一頁與最後一頁停用對應按鈕、切換頁碼與每頁筆數送出事件
- [x] AC-10：量測表單空白欄位送出 `null`、備註去除空白、編輯時帶入原值
- [x] AC-11：每個測試在故意改壞被測程式時會失敗（抽查）

## 開發紀錄

日期：2026-11-12。

**實際做法**
- 套件：`vitest`、`@vue/test-utils`、`jsdom`（devDependencies）。
- `web/vitest.config.ts`：jsdom、只收集 `src/**/__tests__/*.test.ts`、每個測試後還原 mock 與全域 stub。
- `web/tsconfig.vitest.json` 加進 `tsconfig.json` 的 references，`npm run build` 會一起檢查測試檔型別；`tsconfig.app.json` 仍排除 `__tests__/`。
- `package.json`：`test`（監看）、`test:run`（執行一次）。
- 共用工具 `src/__tests__/helpers.ts`：`deferred()`（手動控制回應順序）、`paged()`、`makeClinicRow()`、`makeVital()`，資料都是明顯的假資料。

**測試清單（12 個檔案、127 個測試）**

| 檔案 | 測試數 | 對應 AC |
|------|--------|---------|
| `composables/__tests__/routeQuery.test.ts` | 36 | AC-03、AC-04 |
| `composables/__tests__/useListRoute.test.ts` | 9 | AC-06（網址修正與請求次數）、上一頁、離開頁面 |
| `api/__tests__/client.test.ts` | 12 | AC-05 |
| `composables/__tests__/usePagedQuery.test.ts` | 8 | AC-06 |
| `stores/__tests__/auth.test.ts` | 10 | AC-07 |
| `stores/__tests__/clinic.test.ts` | 10 | AC-08 |
| `stores/__tests__/vitals.test.ts` | 7 | 新增回第 1 頁、修改停在原頁、錯誤訊息 |
| `stores/__tests__/masterData.test.ts` | 6 | 關鍵字去空白、科別選項快取清除 |
| `stores/__tests__/ui.test.ts` | 6 | toast 類型與計時、確認對話框 |
| `components/__tests__/PaginationBar.test.ts` | 12 | AC-09 |
| `components/__tests__/VitalForm.test.ts` | 9 | AC-10 |
| `components/__tests__/StatusBadge.test.ts` | 2 | 狀態一定有文字 |

**驗證方式**
- `npm run test:run`：127 個全部通過；不需要 API 與資料庫，約 2 秒。
- `npm run build` 無錯誤（含測試檔型別檢查）；`dist/` 不含測試程式與測試資料。
- AC-11 抽查：暫時改壞程式再跑測試，三處都被抓到後改回。
  - `safeRedirect` 拿掉 `//` 檢查：「協定相對網址」測試失敗。
  - `usePagedQuery` 拿掉舊回應檢查：競態與 reset 兩個測試失敗。
  - api client 未登入的 401 也觸發登出：「登入失敗不觸發登出」測試失敗。

**發現並修正的問題**
- `queryKey` 註解寫「預設值不列入比較」，但網址來的值是字串，`cleanQuery` 只在 `page === 1`（數字）時省略，網址 `?page=1` 會多查一次 API。修正：`cleanQuery` 一律以字串比較預設值。
- 瀏覽器驗證時發現：`page=99` 自動修正為最後一頁後，改寫網址又觸發一次相同查詢（共 3 次請求）。先補 `useListRoute.test.ts`（紅燈：查詢 2 次），再修正 `useListRoute`：因修正而改寫的網址不再重新查詢。現在只有必要的 2 次請求。
- 兩項修正記錄於 [PRD-master-data.md](PRD-master-data.md) 1.2.2。

**瀏覽器驗證（2026-11-12，以 Network 紀錄計算 API 請求次數）**
- `#/patients?page=1&pageSize=20`：1 次請求，網址不改寫。
- 點第 2 頁、切換每頁 50 筆、瀏覽器上一頁：每次 1 次請求，上一頁回到原本的捲動位置。
- `#/patients?page=99`：2 次請求（第 99 頁、第 3 頁），網址改為 `?page=3`。
- `#/doctors?page=abc&pageSize=25`：醫師清單 1 次請求，網址改為 `#/doctors`。
- 王阿明詳細頁：生命徵象 30 天 116 筆，每頁 50 筆共 3 頁，第 3 頁為第 101–116 筆，每次操作 1 次請求。
- 門診作業：選取病人顯示生命徵象，重新查詢後清空面板。console 沒有錯誤。

## 變更紀錄

| 版本 | 日期 | 類型 | 內容 | 原因 | 影響 |
|------|------|------|------|------|------|
| 1.1.0 | 2026-11-12 | 需求調整 | 範圍加入 `useListRoute` 測試；修正測試發現的兩個問題 | 測試與瀏覽器驗證發現重複查詢 | `routeQuery`、`useListRoute` |
| 1.0.0 | 2026-11-12 | 初版 | 前端單元測試範圍與驗收標準 | 使用者要求補單元測試 | `web/` 測試環境 |

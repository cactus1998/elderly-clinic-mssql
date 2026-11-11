---
name: add-tests
description: 為前端（web/）的 store、api client 或元件加上單元與元件測試（Vitest + @vue/test-utils）。第一次使用時會先徵求同意再安裝測試套件。使用時機：/add-tests <檔案路徑或功能>，或使用者說「幫前端寫測試」「補測試」。
argument-hint: <檔案路徑 | 功能描述>
---

# 前端測試

測試驗證行為，不驗證實作細節。

## 首次設定（`web/package.json` 沒有 vitest 時）

本專案規定新增套件要先取得同意。先告知使用者要安裝的套件與用途，同意後再執行：

```powershell
cd web
npm i -D vitest @vue/test-utils jsdom
```

1. `vite.config.ts` 頂端加 `/// <reference types="vitest/config" />`，設定：
   ```ts
   test: {
     environment: 'jsdom',
     include: ['src/**/*.test.ts'],
   },
   ```
2. `package.json` scripts 加 `"test": "vitest"`、`"test:run": "vitest run"`。
3. `tsconfig.app.json` 已排除 `src/**/__tests__/*`；測試檔放 `__tests__/` 並明確 `import { describe, it, expect, vi } from 'vitest'`。需要時建立 `tsconfig.vitest.json` 讓測試檔也做型別檢查。

## 撰寫測試

位置：被測檔案同層的 `__tests__/`，例如 `src/stores/__tests__/clinic.test.ts`。

有 `docs/specs/<slug>.md` 時，每條驗收標準至少對應一個測試。

優先順序：

1. **Pinia store**（最能證明邏輯正確）：
   - 每個測試前 `setActivePinia(createPinia())`。
   - 用 `vi.mock('@/api/client')` mock `api`，不打真的 API。
   - 涵蓋：成功、空陣列、API 丟 `ApiError`（400 / 404 / 409）時 `error` 有訊息且 `loading` 回到 false。
   - 報到：成功後該列 `status` 變成 `CHECKED_IN`；409 時狀態不變並顯示錯誤。
   - 競態：較早的請求較晚回來時，不覆蓋較新的結果。
2. **api client**：mock `fetch`（`vi.stubGlobal('fetch', ...)`），測 query 組法與 ProblemDetails 解析（有 `errors`、只有 `title`、body 不是 JSON）。
3. **元件**：`mount` 時用 `createTestingPinia` 或真的 store 搭配 mock api，模擬點擊，斷言畫面：
   - 只有 `BOOKED` 的列有「報到」按鈕。
   - 點列不會觸發報到，點按鈕不會觸發選取（`@click.stop`）。
   - `null` 數值顯示「—」。

原則：

- 測試名稱描述行為，例如 `it('keeps status unchanged and shows error when check-in returns 409')`。
- 測試資料用假名與假病歷號，不使用真實個資。
- 不測 Vue 本身的功能，不做大量 snapshot；每個測試獨立。

## 驗證

`npx vitest run <測試路徑>` 全部通過後，再 `npm run build` 確認型別無誤。回報測試數量與涵蓋的情境。
發現產品程式碼有 bug 時先回報並詢問是否修正，不要為了讓測試通過而改掉斷言。

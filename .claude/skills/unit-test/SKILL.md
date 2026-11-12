---
name: unit-test
description: 為前端（web/）撰寫單元測試與元件測試（Vitest + @vue/test-utils）：依 PRD 驗收標準列測試案例，AAA 結構，只在邊界 mock（api client、fetch、時間、router），用使用者看得到的文字與 aria 屬性找元素，新功能採 Red / Green / Refactor。第一次使用時先徵求同意再安裝套件。使用時機：/unit-test <檔案路徑或功能>，或使用者說「寫單元測試」「補測試」「幫前端寫測試」「TDD」。
argument-hint: <檔案路徑 | 功能描述>
---

# 前端單元測試

測試證明「行為符合 PRD」，不是證明「程式碼長這樣」。重構時測試不用改，行為改壞時測試一定會紅。

## 業界做法（本 skill 的依據）

| 做法 | 在本專案的落實 |
|------|----------------|
| 測試金字塔 | 大量單元測試（純函式、composable、store、api client），少量元件測試；端對端流程目前由 `frontend-feature` 的瀏覽器驗證負責，不在本 skill 範圍 |
| AAA（Arrange / Act / Assert） | 每個測試分三段，中間空一行 |
| 測行為，不測實作 | 只透過公開介面（匯出的函式、store 的 state 與 action、元件的 props、事件與畫面）斷言，不讀私有變數 |
| Testing Library 選擇器原則 | 用角色、`aria-label`、文字找元素；不用 Tailwind class 或 DOM 層級 |
| TDD（Red / Green / Refactor） | 新功能、修 bug 先寫會失敗的測試，再寫最少的程式讓它通過，最後整理 |
| 需求追溯 | 每條驗收標準至少一個測試，PRD 的「驗證方式」寫出測試檔名 |
| F.I.R.S.T. | 快（不打網路、不連資料庫）、獨立（不共用狀態）、可重複（固定時間與資料）、自我驗證（只看斷言，不看 log） |

## 首次設定（`web/package.json` 沒有 vitest 時）

本專案規定新增套件要先取得同意。先告訴使用者要裝什麼、用途，同意後才執行：

| 套件 | 用途 |
|------|------|
| `vitest` | 測試執行器，直接沿用 Vite 的設定與別名 |
| `@vue/test-utils` | 掛載 Vue 元件、觸發事件 |
| `jsdom` | 在 Node 模擬瀏覽器 DOM |
| `@vitest/coverage-v8`（選用） | 覆蓋率報告，使用者要看覆蓋率時才裝 |

```powershell
cd web
npm i -D vitest @vue/test-utils jsdom
```

1. 新增 `web/vitest.config.ts`（不放在 `vite.config.ts`，避免載入 devtools 外掛）：
   ```ts
   import { fileURLToPath, URL } from 'node:url'
   import { defineConfig } from 'vitest/config'
   import vue from '@vitejs/plugin-vue'

   export default defineConfig({
     plugins: [vue()],
     resolve: {
       alias: {
         '@': fileURLToPath(new URL('./src', import.meta.url)),
         '@api-types': fileURLToPath(new URL('../api/types', import.meta.url)),
       },
     },
     test: {
       environment: 'jsdom',
       include: ['src/**/__tests__/*.test.ts'],
       restoreMocks: true,
       unstubGlobals: true,
     },
   })
   ```
   別名要和 `vite.config.ts` 一致，改一邊就要改另一邊。
2. 新增 `web/tsconfig.vitest.json`，讓測試檔也做型別檢查，並加進 `tsconfig.json` 的 `references`：
   ```json
   {
     "extends": "./tsconfig.app.json",
     "include": ["env.d.ts", "src/**/*", "src/**/*.vue", "../api/types/*.ts"],
     "exclude": [],
     "compilerOptions": {
       "types": ["node"],
       "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.vitest.tsbuildinfo"
     }
   }
   ```
   `tsconfig.app.json` 維持排除 `src/**/__tests__/*`，測試程式不會打包進正式版。
3. `package.json` scripts 加：`"test": "vitest"`、`"test:run": "vitest run"`（有裝覆蓋率時再加 `"test:coverage": "vitest run --coverage"`）。
4. 不開 `globals`，測試檔一律明確 `import { describe, it, expect, vi, beforeEach } from 'vitest'`。

## 步驟

1. **找依據**：讀對應的 `docs/PRD-<slug>.md`（驗收標準、邊界情況、決策）。沒有 PRD 的既有程式，以目前行為加上程式註解為準。
2. **列案例**：先在回覆裡列出要測的案例，每個被測單位至少涵蓋：
   - 正常情況（happy path）
   - 錯誤情況（API 回 400 / 401 / 404 / 409 / 429、網路錯誤、body 不是 JSON）
   - 邊界（空陣列、`null` 數值、第一頁與最後一頁、上下限數值、非法輸入）
   - 標出每個案例對應的驗收標準編號（例如 `AC-04`）。
3. **Red**：
   - 新功能或修 bug：先寫測試，跑一次確認是紅燈，而且失敗原因是「功能還沒做／bug 還在」，不是打錯字或 import 錯誤。
   - 替既有程式補測試：測試通過後，暫時把被測程式改壞（例如把 `<` 改成 `<=`），確認測試會紅，再改回來。抓不到錯的測試沒有價值。
4. **Green**：只寫讓測試通過的最少程式。
5. **Refactor**：整理測試與程式（抽共用的建立資料函式、改善命名），測試維持全綠。
6. **驗證**：`npm run test:run` 全部通過，再跑 `npm run build`（含 `vue-tsc`）確認型別無誤。
7. **同步 PRD**：依 `prd-sync`，在 PRD「開發紀錄」的驗證方式寫上測試檔與涵蓋的驗收標準；因為測試而發現並修正的 bug 也寫進開發紀錄。
8. **回報**：測試檔數、測試數、涵蓋的驗收標準、發現的問題。

## 撰寫規則

**檔案與命名**
- 放在被測檔案同層的 `__tests__/`，檔名 `<被測檔名>.test.ts`，例如 `src/composables/__tests__/routeQuery.test.ts`。
- `describe` 寫被測單位（函式名稱、store 名稱、元件名稱），`it` 用繁體中文描述行為與條件，讀起來像規格：`it('API 回 409 時保留原本狀態並顯示錯誤')`。
- 一個 `it` 只驗證一個行為。同一個行為需要多個 `expect` 可以，不同行為拆開。

**AAA 結構**

```ts
import { describe, it, expect } from 'vitest'
import { safeRedirect } from '@/composables/routeQuery'

describe('safeRedirect', () => {
  it('站內路徑原樣保留', () => {
    // Arrange
    const target = '/patients?page=2'

    // Act
    const result = safeRedirect(target)

    // Assert
    expect(result).toBe('/patients?page=2')
  })

  it.each([
    ['其他網站', 'https://evil.example'],
    ['協定相對網址', '//evil.example'],
    ['反斜線', '/\\evil.example'],
    ['登入頁本身', '/login'],
    ['空值', undefined],
  ])('%s 一律導回門診作業', (_label, target) => {
    expect(safeRedirect(target)).toBe('/clinic')
  })
})
```

- 同一個行為的多組輸入用 `it.each`，不要複製貼上多個 `it`。

**Mock：只 mock 邊界**

| 邊界 | 做法 |
|------|------|
| 後端 API（測 store、元件） | `vi.mock('@/api/client', ...)` 只換掉 `api` 物件的方法，`ApiError` 用 `vi.importActual` 保留真的類別，讓 `instanceof` 判斷正常 |
| `fetch`（測 api client） | `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(...)))`，斷言網址、method、header 與 body |
| 時間（今天日期、token 到期） | `vi.useFakeTimers()` 加 `vi.setSystemTime(new Date('2026-11-11T09:00:00+08:00'))`，測完 `vi.useRealTimers()` |
| 路由 | `createRouter({ history: createMemoryHistory(), routes })`，先 `await router.push(...)`、`await router.isReady()` 再掛載 |
| `localStorage` | jsdom 內建，每個測試前 `localStorage.clear()` |

- 不 mock 被測單位自己的內部函式，也不 mock Vue、Pinia、vue-router 本身。
- `src/api/client.ts` 有模組層級狀態（token、401 處理函式）：測試間用 `setAccessToken(null)` 重設，或 `vi.resetModules()` 後重新 import。
- 每個 store 測試前 `setActivePinia(createPinia())`，不共用 store。

**非同步**
- 等 Promise 用 `await flushPromises()`（`@vue/test-utils`）或 `await nextTick()`，不要用 `setTimeout` 等固定時間。
- 競態測試：用手動控制的 Promise（先建立 `resolve` 函式，依序決定哪個請求先回來），確認較舊的回應不會覆蓋較新的結果。

**元件測試：用使用者看得到的方式找元素**
- 優先順序：`aria-label`／角色 > 看得到的文字 > `label` 對應的欄位 > `data-testid`（真的沒有其他辦法時才加）。
- 不用 Tailwind class、`nth-child`、DOM 層級當選擇器；樣式改了測試不應該壞。
- 例：`wrapper.get('button[aria-label="下一頁"]')`、`wrapper.findAll('button').find((b) => b.text() === '儲存')`、`wrapper.get('#' + wrapper.get('label').attributes('for'))`。
- 斷言使用者會看到的結果：畫面文字、按鈕是否 `disabled`、`emitted()` 的事件與參數、呼叫了哪個 api 方法與參數。
- 子元件不影響被測行為時可用 `shallowMount` 或 `global.stubs`；需要子元件互動時用 `mount`。

**測試資料**
- 共用的工廠函式與 `deferred()` 放在 `src/__tests__/helpers.ts`，例如 `makeClinicRow({ status: 'CHECKED_IN' })`，只寫跟本測試有關的欄位，其餘給預設值。
- 型別從 `@api-types/clinic-api` 引用，假資料要符合 DTO 型別。
- 姓名、病歷號、電話一律用明顯的假資料（`測試病人`、`T000001`、`0900-000-000`），不複製真實個資，也不在測試裡 `console.log` 病人資料。

## 本專案的優先順序

1. **純函式**（最快、最值得）：`composables/routeQuery.ts`（`queryInt`、`queryPage`、`queryPageSize` 的非法值與上下限、`cleanQuery`、`queryKey`、`safeRedirect` 防止導向其他網站）。`api/client.ts` 的 `qs` 沒有匯出，透過 `api.listPatients` 等方法送出的網址測試。
2. **api client**：mock `fetch`，測 token header、204 回傳、ProblemDetails 解析（有 `errors`、只有 `title`、body 空白或不是 JSON）、401 且有 token 時才呼叫 `onUnauthorized`。
3. **Pinia store**：`auth`（登入、還原、token 過期登出）、`clinic`（查詢後清空選取、報到成功更新狀態、報到 409 保留原狀態）、`vitals`、`masterData`（`departmentsChanged` 清除選項快取）、`ui`（toast 類型）。
4. **composable**：`usePagedQuery`（成功與錯誤時的 `loading` / `error`、較舊的回應晚回來時被丟棄、`reset` 後舊回應不寫入）、`useListRoute`（網址是唯一依據、離開頁面時不再寫回網址）。
5. **元件**：`PaginationBar`（頁碼與省略號、第一頁停用上一頁、切換每頁筆數）、`VitalForm`（範圍驗證、空白欄位送出 `null`）、`StatusBadge`（狀態文字）、`ConfirmDialog`（取消與確定的事件）。

`views/` 主要是組合，交給瀏覽器驗證；有獨立邏輯時先抽到 composable 再測。

## 覆蓋率

- 目標：`composables/`、`stores/`、`api/` 行覆蓋率 80% 以上；元件看關鍵行為，不追求數字。
- 覆蓋率只是找漏測的工具，不為了數字寫沒有斷言的測試。

## 不要做

- 為了讓測試通過而修改斷言。發現產品程式碼有 bug 時，先回報並詢問是否修正（修正時依 `prd-sync` 記錄）。
- 大量 snapshot。只有輸出格式本身就是需求時才用，而且要小。
- 測 Vue、Pinia、vue-router 本身的功能（例如「`ref` 改了畫面會更新」）。
- 測試之間共用狀態，或依賴執行順序。
- 打真的 API 或資料庫；需要整合測試時另外討論。
- 在測試裡 `it.skip` / `it.only` 後就提交。

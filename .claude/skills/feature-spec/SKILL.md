---
name: feature-spec
description: 實作功能前先寫功能 PRD：目標、範圍、使用情境、前後端與資料庫介面、狀態流程、邊界情況、非功能需求與 Given-When-Then 驗收標準，存成 docs/PRD-<slug>.md，並同步總規格與文件清單。使用時機：/feature-spec <功能描述>，或使用者說「寫 PRD」「先規劃這個功能」「需求拆解」。只牽涉單一支 API、沒有畫面時改用 api-spec。
argument-hint: <功能名稱或描述>
---

# 功能 PRD

PRD 要短：一頁內寫完，重點是讓前端、後端、資料庫的實作與驗證有明確依據。

## 與其他文件的關係

- **總規格** `docs/PRD-elderly-clinic.md`：功能範圍必須落在總規格的 Must / Should / Could 之內。需要超出時，先詢問使用者，同意後更新總規格的範圍與變更紀錄。
- **功能 PRD** `docs/PRD-<slug>.md`：一個功能一份，slug 用 kebab-case（例如 `vital-audit`）。
- **API 規格** `docs/specs/<slug>.md`（`api-spec`）：只有後端、沒有畫面的小功能使用。
- **文件清單** `docs/README.md`：新增一列，狀態 Draft；實作完成改成「完成」，有未達成項目寫在括號內。

## 原則

- **以現況為準**：先讀 `database/schema.sql`、`api/types/clinic-api.ts`、相關 Controller 與 `web/src`，不虛構不存在的欄位或 API。
- **明確**：不寫「合理範圍」「適當提示」，要寫具體數值、狀態碼、畫面文字。
- **前後端一起想**：寫出 API 路徑、參數、DTO、狀態碼，以及前端的 store action、元件與四種畫面狀態（載入中、空資料、錯誤、正常）。
- **涵蓋邊界**：資料不存在、狀態不允許、重複操作、併發、參數格式錯誤、未登入或 token 過期、快速重複點擊、舊回應晚到。
- **醫療資料**：寫出是否需要稽核、刪除是硬刪還是軟刪、哪些欄位屬於個資。
- **可驗收**：每個 Must 至少一條驗收標準，能直接寫成 `api.http` 請求或瀏覽器操作步驟。
- **先澄清**：需求只有一句話時，先列出 3 到 5 個關鍵決策與建議選項，跟使用者確認後再寫。

## 步驟

1. 讀總規格，確認功能在範圍內，以及依賴的功能已完成。
2. 必要時提出關鍵決策問題。
3. 依下方模板寫入 `docs/PRD-<slug>.md`。
4. 更新 `docs/README.md`；總規格範圍有變時同步更新總規格。
5. 回報 PRD 摘要與建議的實作順序：`db-change`（需要時）、`add-api-endpoint`、`frontend-feature`、`his-security-check`、`ui-review`。
6. 實作完成後回到 PRD：勾選驗收標準，填寫「開發紀錄」，總規格的範圍與變更紀錄同步更新。
7. 之後任何修改都用 `prd-sync` 同步回 PRD（升版、變更紀錄、重新驗證受影響的驗收標準）。

## 模板

```markdown
# PRD：<功能名稱>（<slug>）

> 版本：0.1.0 ｜ 狀態：Draft ｜ 最後更新：<yyyy-MM-dd>

## 目標
<解決什麼問題、給誰用、對應總規格哪一項（2 到 3 句）>

## 範圍
- **Must**：
- **Should**：
- **Won't**：

## 使用情境
- 身為 <門診護理師／醫師／管理者>，我想要 <操作>，以便 <目的>。

## 資料與介面
- 資料庫：<讀寫的資料表；新欄位、約束、索引；是否需要交易；對既有資料的影響>
- API：<方法 路徑、參數與範圍、成功回應 DTO、每個錯誤狀態碼的情境>
- 型別：<api/types/clinic-api.ts 新增或修改的 interface>
- 前端：<store state 與 action、元件、畫面文字>

## 狀態與流程
\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : 送出
    Loading --> Success : 2xx
    Loading --> Error : 4xx / 5xx
    Error --> Loading : 重試
\`\`\`

## 邊界情況
| 編號 | 情境 | 預期行為 |
|------|------|----------|
| EC-01 | | |

## 非功能需求
- 資安：<驗證、授權、輸入驗證、個資、稽核>
- RWD：<400px 寬不破版；文案不寫方位詞>

## 驗收標準
- [ ] AC-01：Given <前置條件>，When <操作或請求>，Then <畫面或狀態碼與資料庫結果>

## 開發紀錄
<完成後補：實際做法、與 PRD 的差異、驗證方式>

## 變更紀錄

| 版本 | 日期 | 類型 | 內容 | 原因 | 影響 |
|------|------|------|------|------|------|
| 0.1.0 | <yyyy-MM-dd> | 初版 | 建立 PRD | — | — |
```

## 與實作 skill 的關係

- `db-change`、`add-api-endpoint`、`frontend-feature`：實作以 PRD 的 Must 範圍為準，不額外擴充。
- `unit-test`：每條 AC 與 EC 至少對應一個測試或 `api.http` 請求。
- `ui-review`、`his-security-check`：完成前檢查，結果寫入開發紀錄。

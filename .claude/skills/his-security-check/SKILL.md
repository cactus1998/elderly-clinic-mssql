---
name: his-security-check
description: 檢查本專案變更是否符合醫療資料安全要求。使用時機：提交前、新增或修改 API 或 SQL 後、使用者要求安全檢查時。只回報問題與位置，不擅自大改。
---

# 醫療資料安全檢查

病人資料屬於敏感個資。逐項檢查本次變更（`git diff`，沒有 git 時檢查使用者指定的檔案），
每項回報「通過」或「問題 + 檔案:行號 + 建議修法」。

## 檢查項目

### 1. SQL Injection

- 所有 SQL 都用 Dapper 參數（`@Name` 搭配匿名物件）。
- 搜尋可疑寫法：SQL 字串裡的 `$"`、`+` 串接、`string.Format`。
- 動態排序或欄位名稱不能直接來自使用者輸入，要用白名單對應。

### 2. 輸入驗證

- 路由參數有型別限制（例如 `{id:int}`）。
- 數值參數有範圍檢查（參考 `PatientsController` 的 `days` 1 到 365）。
- 日期參數格式錯誤回 400，不是 500。

### 3. 錯誤回應

- 只回傳 ProblemDetails，不包含例外訊息、堆疊、SQL 內容、連線字串。
- `Program.cs` 在非 Development 環境使用 `UseExceptionHandler()`。

### 4. 個資保護

- log 不寫入病人姓名、病歷號、生日、身分證號。
- API 只回傳畫面需要的欄位，不直接回傳整列資料。
- `seed.sql` 與測試資料沒有真實個資。

### 5. 設定與機密

- 連線字串只在設定檔或環境變數，程式碼中沒有寫死。
- 沒有提交密碼、金鑰、Token；含真實連線資訊的設定檔已列入 `.gitignore`。

### 6. 身分驗證與授權

- 新增的 Controller 或 action 沒有 `[AllowAnonymous]`（只有登入 API 可以）；`Program.cs` 的 `FallbackPolicy` 仍在。
- 登入失敗回同一個 401 訊息，不透露是帳號還是密碼錯誤；登入 API 仍有 `[EnableRateLimiting]`。
- 密碼只以 `PasswordHasher` 雜湊後存入；程式碼、log、回應中沒有明碼密碼或 token。
- 前端 token 只存在 `sessionStorage`，病人資料不寫入任何 storage；登出會清除畫面資料。

### 7. 資料一致性

- 多步驟寫入在交易內，例外時 `Rollback`。
- 狀態變更用條件式 `UPDATE ... WHERE Status = ...` 並檢查影響筆數，避免競態。

## 輸出格式

先列有問題的項目（依嚴重程度排序），再列通過的項目。
修正前先詢問使用者，只改有問題的那幾行。

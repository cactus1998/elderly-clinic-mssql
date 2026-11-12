# CLAUDE.md

門診資訊系統：MS SQL Server + ASP.NET Core 8 Web API（Dapper）+ Vue 3 前端。
資料全部是假資料。功能與執行方式見 `README.md`，範圍與驗收標準見 `docs/PRD-elderly-clinic.md`。

## 架構分層

- `api/Controllers/`：只處理 HTTP。參數驗證、呼叫 Repository、決定狀態碼。不寫 SQL。
- `api/Repositories/`：SQL 與 Dapper 參數。一個資料表或一個業務主題一個 Repository。
- `api/Dtos/`：回傳給前端的資料類別。屬性名稱與 SQL 欄位名稱一致（Dapper 依名稱對應）。
- `api/Data/SqlConnectionFactory.cs`：唯一建立連線的地方。連線字串只從設定讀取。
- `api/Security/`：密碼雜湊（PBKDF2）與限流政策名稱。驗證、授權、限流在 `Program.cs` 設定。
- `api/types/clinic-api.ts`：對應 DTO 的 TypeScript interface，DTO 改了這裡要同步（camelCase）。
- `web/`：Vue 3 + TypeScript + Tailwind CSS v4 + Pinia。API 呼叫集中在 `src/api/client.ts`，狀態放 `src/stores/`。型別用 `@api-types/clinic-api` 引用 `api/types`，不要在 `web/` 重複定義。開發時 `/api` 由 Vite proxy 轉到 5268。
- `database/`：`schema.sql`（重建資料表）、`seed.sql`（假資料）、`procedures.sql`（預存程序）。

## 規則

- 新功能先寫 PRD（`feature-spec`，只有後端時用 `api-spec`），範圍確認後才實作；實作以 PRD 的範圍為準，完成後回填 PRD 的驗收標準與開發紀錄。
- 每次修改（包含使用者事後的小調整，例如每頁筆數、測試資料、UI 樣式）都要在同一輪同步更新 PRD：對應功能 PRD 的規格、驗收標準與開發紀錄（「與 PRD 的差異」或「變更紀錄」），以及 `docs/PRD-elderly-clinic.md` 的變更紀錄。流程見 `prd-sync`；程式與 PRD 放同一個 commit，回滾時一起 revert。回覆前確認 PRD 與實作一致。
- SQL 一律參數化（Dapper 匿名物件），禁止字串串接或插值組 SQL。
- 多步驟寫入放在交易內；條件式更新用 `WHERE` 加條件，再依影響筆數判斷結果，不要先查再改。
- 錯誤回應用 `Problem(...)` 或 `ValidationProblem(...)`（ProblemDetails），不回傳例外訊息或堆疊。
- 病人姓名、病歷號等個資不寫進 log；登入失敗不記錄輸入的帳號與密碼。
- 所有 API 預設需要登入（`Program.cs` 的 `FallbackPolicy`）。只有登入 API 可以 `[AllowAnonymous]`，新增匿名 API 前先詢問。
- 密碼只存 `api/Security/PasswordHasher.cs` 產生的雜湊，不存明碼。
- Repository 註冊為 Scoped，`SqlConnectionFactory` 為 Singleton，在 `Program.cs` 註冊。
- 新增或修改 API 時，同步更新 `api/api.http` 與 `README.md` 的 API 表格。
- 不新增套件，除非先說明理由並取得同意。
- 程式碼註解用繁體中文或英文，識別名稱用英文。

## 驗證指令

```powershell
cd api
dotnet build                 # 必須 0 error、0 warning
dotnet run                   # Swagger: http://localhost:5268/swagger
```

前端：

```powershell
cd web
npm run test:run             # Vitest 單元測試，必須全部通過
npm run build                # vue-tsc 型別檢查（含測試檔）+ vite build，必須無錯誤
npm run dev                  # http://localhost:5173（API 要先啟動）
```

資料庫（本機 `localhost\SQLEXPRESS`，Windows 驗證）：

```powershell
cd database
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i schema.sql
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i seed.sql
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i procedures.sql
```

`schema.sql` 會刪除資料表，執行前先確認。sqlcmd 必須加 `-I`（篩選索引需要 QUOTED_IDENTIFIER ON）。

## 專案 Skill

一般流程：`feature-spec`（只有後端時用 `api-spec`）、`prd-sync`（每次修改後）、`add-api-endpoint`（需要時搭配 `db-change`）、`frontend-feature`、`his-security-check`、`git-commit`。

- `feature-spec`：實作前寫功能 PRD（前後端與資料庫），存在 `docs/PRD-<slug>.md`，範圍以總規格為準。
- `prd-sync`：每次修改後把變更同步回 PRD（變更分級、版本、變更紀錄、回滾）。
- `api-spec`：只有後端的小功能寫 API 規格，存在 `docs/specs/`。
- `add-api-endpoint`：新增一支 API。
- `db-change`：修改資料表、約束、索引或預存程序。
- `his-security-check`：提交前檢查醫療資料安全。
- `git-commit`：預檢、機密檢查、繁體中文 Angular 規範 commit 訊息。不自動 push。

前端（`web/`）：

- `vue-conventions`：撰寫或修改 `web/src` 時套用的規範（元件、Pinia、API 呼叫、型別共用、個資）。
- `frontend-feature`：新增前端功能區塊；後端不夠時先走 `add-api-endpoint`。
- `unit-test`：前端單元與元件測試（Vitest + @vue/test-utils）：依 PRD 驗收標準列案例、AAA、只 mock 邊界、新功能採 TDD。首次使用需同意安裝套件。
- `ui-review`：展示前的前端檢查清單，只回報，確認後才改。

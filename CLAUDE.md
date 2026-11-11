# CLAUDE.md

樂齡門診掛號與健康追蹤系統：MS SQL Server + ASP.NET Core 8 Web API（Dapper）+ Vue 3 前端。
資料全部是假資料。功能與執行方式見 `README.md`。

## 架構分層

- `api/Controllers/`：只處理 HTTP。參數驗證、呼叫 Repository、決定狀態碼。不寫 SQL。
- `api/Repositories/`：SQL 與 Dapper 參數。一個資料表或一個業務主題一個 Repository。
- `api/Dtos/`：回傳給前端的資料類別。屬性名稱與 SQL 欄位名稱一致（Dapper 依名稱對應）。
- `api/Data/SqlConnectionFactory.cs`：唯一建立連線的地方。連線字串只從設定讀取。
- `api/types/clinic-api.ts`：對應 DTO 的 TypeScript interface，DTO 改了這裡要同步（camelCase）。
- `web/`：Vue 3 + TypeScript + Tailwind CSS v4 + Pinia。API 呼叫集中在 `src/api/client.ts`，狀態放 `src/stores/`。型別用 `@api-types/clinic-api` 引用 `api/types`，不要在 `web/` 重複定義。開發時 `/api` 由 Vite proxy 轉到 5268。
- `database/`：`schema.sql`（重建資料表）、`seed.sql`（假資料）、`procedures.sql`（預存程序）。

## 規則

- SQL 一律參數化（Dapper 匿名物件），禁止字串串接或插值組 SQL。
- 多步驟寫入放在交易內；條件式更新用 `WHERE` 加條件，再依影響筆數判斷結果，不要先查再改。
- 錯誤回應用 `Problem(...)` 或 `ValidationProblem(...)`（ProblemDetails），不回傳例外訊息或堆疊。
- 病人姓名、病歷號等個資不寫進 log。
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
npm run build                # vue-tsc 型別檢查 + vite build，必須無錯誤
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

一般流程：`api-spec`、`add-api-endpoint`（需要時搭配 `db-change`）、`frontend-feature`、`his-security-check`、`git-commit`。

- `api-spec`：實作前寫規格與驗收標準，存在 `docs/specs/`。
- `add-api-endpoint`：新增一支 API。
- `db-change`：修改資料表、約束、索引或預存程序。
- `his-security-check`：提交前檢查醫療資料安全。
- `git-commit`：預檢、機密檢查、繁體中文 Angular 規範 commit 訊息。不自動 push。

前端（`web/`）：

- `vue-conventions`：撰寫或修改 `web/src` 時套用的規範（元件、Pinia、API 呼叫、型別共用、個資）。
- `frontend-feature`：新增前端功能區塊；後端不夠時先走 `add-api-endpoint`。
- `add-tests`：Vitest 測試 store、api client、元件。首次使用需同意安裝套件。
- `ui-review`：展示前的前端檢查清單，只回報，確認後才改。

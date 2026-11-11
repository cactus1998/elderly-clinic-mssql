# 樂齡門診掛號與健康追蹤系統

以長者門診為情境的練習專案：MS SQL Server 資料庫、ASP.NET Core 8 Web API（Dapper），加上 Vue 3 前端。
資料全部是假資料，不含任何真實個資。

## 功能

### 資料庫（`database/`）

- 6 張資料表：Departments 科別、Doctors 醫師、Patients 病人、Appointments 掛號、VitalSigns 生命徵象、Users 系統使用者
- 約束：主鍵、外鍵、UNIQUE、CHECK（性別、診別、掛號狀態、生命徵象合理範圍）
- 篩選唯一索引：同一病人在同一醫師同一診只能有一筆有效掛號（已取消的不算）
- 預存程序 `dbo.usp_GetClinicList`：查某天（某科）的門診清單（`procedures.sql`）

### Web API（`api/`）

除了登入，所有 API 都要帶 `Authorization: Bearer {accessToken}`，沒帶或過期回 401。

| 方法 | 路徑 | 說明 | 回應 |
|---|---|---|---|
| POST | `/api/auth/login` | 登入，回傳 `accessToken`（60 分鐘有效） | 200；帳號或密碼錯誤 401；同一 IP 1 分鐘超過 5 次 429 |
| GET | `/api/auth/me` | 目前登入的使用者 | 200；401 |
| GET | `/api/clinic?date=2026-11-05&deptId=1` | 呼叫 `usp_GetClinicList` 取得門診清單，`deptId` 可不傳 | 200；date 缺少或格式錯誤 400 |
| GET | `/api/patients/{id}/vitals?days=14` | 病人最近 N 天生命徵象，依量測時間由新到舊 | 200；days 不在 1 到 365 為 400；病人不存在 404 |
| POST | `/api/patients/{id}/vitals` | 新增一筆生命徵象 | 201；驗證失敗 400；病人不存在 404 |
| PUT | `/api/vitals/{vitalId}` | 修改一筆生命徵象（整筆取代） | 200；驗證失敗 400；紀錄不存在 404 |
| DELETE | `/api/vitals/{vitalId}` | 刪除一筆生命徵象 | 204；紀錄不存在 404 |
| PATCH | `/api/appointments/{id}/checkin` | 報到：只有 `BOOKED` 能改成 `CHECKED_IN`，在交易內依影響筆數判斷結果 | 200；掛號不存在 404；狀態不是 BOOKED 409 |

錯誤回應統一使用 ProblemDetails（RFC 9110）格式。

生命徵象驗證：數值範圍與資料表 CHECK 約束相同；至少要有一項數值；收縮壓與舒張壓要一起填；量測時間不能是未來。

### 登入與資安設計

| 項目 | 做法 |
|---|---|
| 身分驗證 | 登入後發 Bearer token（ASP.NET Core 8 內建，以 Data Protection 加密），60 分鐘到期 |
| 預設拒絕 | `FallbackPolicy` 要求所有 API 登入，只有登入 API 標 `[AllowAnonymous]`；新增 API 忘了加 `[Authorize]` 也不會變公開 |
| 密碼儲存 | PBKDF2-SHA256、每個帳號獨立 salt、10 萬次迭代；資料庫不存明碼 |
| 防暴力破解 | 登入 API 限流：同一 IP 每分鐘 5 次，超過回 429 |
| 防帳號列舉 | 帳號不存在或密碼錯誤回同一個 401 訊息，並同樣執行雜湊運算，回應時間一致 |
| 時序攻擊 | 雜湊比對用 `CryptographicOperations.FixedTimeEquals` |
| log | 登入失敗只記錄來源 IP，不記錄輸入的帳號與密碼 |
| SQL Injection | 全部參數化查詢 |
| 前端 token | 存在 `sessionStorage`（關閉分頁即清除），收到 401 自動登出；登出時清除畫面上的病人資料 |
| 帳號停用 | `Users.IsActive = 0` 不能登入，帳號保留供稽核 |

部署到外部前還需要：HTTPS、更換或刪除測試帳號、CORS 只允許自己的前端網域、反向代理後依 `X-Forwarded-For` 限流。

### 測試帳號

本機練習用，由 `seed.sql` 建立：帳號 `demo`，密碼 `Demo@2026`。資料庫只存雜湊值。

### 前端（`web/`）

Vue 3 + TypeScript + Tailwind CSS + Pinia（Vite）。

- 登入畫面：登入後才能使用，右上角可登出；重新整理維持登入，token 過期自動回到登入畫面
- 門診清單：選日期查詢，可依科別篩選；狀態為「已掛號」的列可直接按「報到」
- 點選病人：生命徵象面板顯示最近 7 / 14 / 30 / 90 天生命徵象，可新增、編輯、刪除（刪除前確認）
- API 錯誤（ProblemDetails）直接顯示在畫面上
- 型別直接引用 `api/types/clinic-api.ts`，與後端 DTO 共用同一份定義

## 架構

```mermaid
flowchart LR
    Vue["Vue 3 前端<br/>TypeScript / Tailwind / Pinia"] -- "HTTP / JSON" --> Ctrl
    subgraph API["ASP.NET Core 8 Web API"]
        Ctrl["Controllers<br/>只處理 HTTP：參數驗證、狀態碼"] --> Repo["Repositories<br/>SQL 與 Dapper 參數"]
    end
    Repo -- "Microsoft.Data.SqlClient<br/>參數化查詢 / 預存程序" --> DB[("MS SQL Server<br/>ElderlyClinic")]
```

```
api/
├─ Controllers/     ClinicController、PatientsController、AppointmentsController
├─ Repositories/    ClinicRepository、PatientRepository、AppointmentRepository
├─ Dtos/            回傳給前端的資料類別
├─ Data/            SqlConnectionFactory（從 appsettings 讀連線字串）
├─ types/           對應 DTO 的 TypeScript interface，給前端使用
└─ api.http         VS Code / Visual Studio 可直接送出的測試請求

web/src/
├─ api/client.ts    fetch 包裝：自動帶 Bearer token，非 2xx 時解析 ProblemDetails 丟出 ApiError
├─ stores/auth.ts   Pinia store：登入、登出、token 保存與驗證
├─ stores/clinic.ts Pinia store：門診清單、報到、生命徵象 CRUD
└─ components/      LoginForm、ClinicList、VitalsPanel、VitalForm（新增與編輯共用）
```

## 如何執行

### 需求

- SQL Server Express（執行個體 `localhost\SQLEXPRESS`，Windows 驗證）
- .NET 8 SDK（`dotnet --list-sdks` 要看到 `8.0.xxx`）
- Node.js 22.18 以上（前端）

### 1. 建立資料庫與假資料

SSMS：依序開啟 `database/schema.sql`、`database/seed.sql`、`database/procedures.sql`，按 F5。

或用 sqlcmd（`-I` 開啟 QUOTED_IDENTIFIER，篩選索引需要）：

```powershell
cd database
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i schema.sql
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i seed.sql
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i procedures.sql
```

`schema.sql` 會刪除並重建資料表，只能用在本機練習環境（預存程序不受影響）。
`procedures.sql` 使用 `CREATE OR ALTER`，可以重複執行。

### 2. 啟動 API

```powershell
cd api
dotnet run
```

瀏覽器會自動開啟 Swagger：<http://localhost:5268/swagger>

連線字串在 `api/appsettings.json` 的 `ConnectionStrings:ElderlyClinic`，
也可以用環境變數 `ConnectionStrings__ElderlyClinic` 覆蓋。

### 3. 啟動前端

API 保持執行，另開一個終端機：

```powershell
cd web
npm install
npm run dev
```

開啟 <http://localhost:5173>。Vite 開發伺服器會把 `/api` 轉送到 `http://localhost:5268`，
所以 API 不需要設定 CORS。

### 4. 測試

- Swagger：先用 `POST /api/auth/login` 取得 `accessToken`，按右上角「Authorize」貼上，再測其他 API。
- `api/api.http`：先送「登入」，其他請求會自動帶入 token。

報到與生命徵象的新增、修改、刪除都會真的寫入資料庫。測完想還原，依序重跑 `schema.sql`、`seed.sql`
（`seed.sql` 發現已有資料會停止，所以要先跑 `schema.sql` 清空）。

## AI 輔助開發（Claude Code）

本專案用 [Claude Code](https://claude.com/claude-code) 協作開發，專案規範寫成 AI 可讀的設定檔，
讓 AI 產出的程式碼遵守同一套架構與安全規則，而不是每次重新說明：

```
CLAUDE.md                          專案規範：架構分層、SQL 安全規則、驗證指令
.claude/skills/
├─ api-spec/           實作前寫規格：介面、狀態碼、資料庫影響、邊界情況、Given-When-Then 驗收標準
├─ add-api-endpoint/   新增 API：Controller、Repository、DTO、TS 型別、api.http、README 一次到位
├─ db-change/          修改資料表或預存程序：同步 seed、DTO、前端型別，並說明對既有資料的影響
├─ his-security-check/ 醫療資料安全檢查：參數化查詢、個資不進 log、錯誤不洩漏內部資訊
├─ git-commit/         提交前預檢與機密掃描，產生繁體中文 Angular 規範的 commit 訊息
├─ vue-conventions/    前端規範：元件、Pinia、API 呼叫、共用型別、病人個資不進 localStorage / URL
├─ frontend-feature/   新增前端功能：API 方法、store、元件、四種畫面狀態、瀏覽器實測
├─ add-tests/          前端測試（Vitest + @vue/test-utils）：store、api client、元件
└─ ui-review/          展示前前端檢查：型別一致、競態、錯誤處理、個資、無障礙、RWD
```

開發流程：`api-spec` 寫規格，`add-api-endpoint` 實作後端，`frontend-feature` 實作前端，`his-security-check` 與 `ui-review` 檢查，`git-commit` 提交。

AI 負責產生草稿，所有變更都經過人工閱讀、`dotnet build` 與實際呼叫 API 驗證。

## 注意事項

- 假資料的掛號與量測日期由 `seed.sql` 依「執行當天」計算。文件中的 `date=2026-11-05` 只是範例，請換成你執行 seed 的那一天；隔天測試前先重跑 `schema.sql` 和 `seed.sql`。
- vitals 的「最近 N 天」以資料庫當下時間 `SYSDATETIME()` 往回算。
- `usp_GetClinicList` 回傳 `AppointmentId`、`PatientId`，前端用來直接報到與查詢生命徵象。更新預存程序後要重跑 `procedures.sql`。

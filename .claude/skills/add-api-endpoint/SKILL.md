---
name: add-api-endpoint
description: 在本專案新增或修改一支 Web API。使用時機：新增路由、改變回應格式或狀態碼、加查詢參數。確保 Controller、Repository、DTO、TypeScript 型別、api.http、README 一起更新。
---

# 新增 API

依本專案既有的三支 API 為範本，不自創新架構。先讀最接近的範例：

- 查詢加參數驗證：`api/Controllers/PatientsController.cs`、`api/Repositories/PatientRepository.cs`
- 呼叫預存程序：`api/Controllers/ClinicController.cs`、`api/Repositories/ClinicRepository.cs`
- 交易與條件式更新：`api/Controllers/AppointmentsController.cs`、`api/Repositories/AppointmentRepository.cs`

## 步驟

1. **確認規格**：有 `docs/specs/<slug>.md` 時以它的 Must 範圍為準。沒有規格時，至少確認 HTTP 方法、路徑、參數與範圍、成功回應、每種錯誤的狀態碼；需求複雜就先執行 `api-spec`。不清楚就先問，不要猜。
2. **SQL 先行**：在 SSMS 或 sqlcmd 用假資料跑過 SQL，確認結果正確再寫 C#。
3. **DTO**（`api/Dtos/`）：屬性名稱與 SELECT 欄位一致；欄位名稱不同時在 SQL 用 `AS` 取別名。
4. **Repository**（`api/Repositories/`）：
   - 透過 `SqlConnectionFactory.Create()` 取得連線，`using` 釋放。
   - 參數用匿名物件傳入，禁止字串組 SQL。
   - 寫入操作：交易內執行，依影響筆數判斷結果；需要區分「不存在」與「狀態不允許」時回傳 enum（參考 `CheckInOutcome`）。
   - 預存程序：`commandType: CommandType.StoredProcedure`。
5. **Controller**（`api/Controllers/`）：
   - 只做參數驗證、呼叫 Repository、對應狀態碼。
   - 400 用 `ValidationProblem(ModelState)`；404、409 用 `Problem(statusCode: ..., title: ...)`。
   - 加 `/// <summary>`、`<response>` 註解與 `[ProducesResponseType]`，讓 Swagger 顯示完整。
6. **註冊**：新的 Repository 在 `Program.cs` 用 `AddScoped` 註冊。
7. **前端型別**：`api/types/clinic-api.ts` 加對應 interface（camelCase，日期為 ISO 8601 字串）。
8. **測試請求**：`api/api.http` 加成功與每種錯誤情境的請求。
9. **文件**：`README.md` 的 API 表格加一列。

## 完成條件

- `dotnet build` 0 error、0 warning。
- `dotnet run` 後，`api.http` 裡新增的每個請求都回傳預期狀態碼。
- 執行 `his-security-check` skill 沒有未處理的項目。

不要順手重構其他 API，不要新增套件。

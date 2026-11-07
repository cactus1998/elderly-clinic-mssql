---
name: db-change
description: 修改本專案的資料庫結構或預存程序。使用時機：新增或修改資料表、欄位、約束、索引、預存程序。確保 schema、seed、procedures、DTO 與前端型別保持一致，並說明對既有資料的影響。
---

# 資料庫變更

醫院資料庫通常已有大量資料與多套系統共用，變更前先想清楚影響範圍。

## 先回答這三個問題

1. **影響哪些既有資料？** 新增 NOT NULL 欄位要有預設值；新增 CHECK 或 UNIQUE 前，先查既有資料是否違反。
2. **誰在用這個物件？** 用 Grep 搜尋資料表、欄位、預存程序名稱在 `api/` 和 `database/` 的所有出現位置。
3. **能不能回復？** 寫出回復用的 SQL（例如 `ALTER TABLE ... DROP COLUMN`）。

在回覆中列出答案，再開始改。

## 檔案分工

- `database/schema.sql`：資料表、約束、索引。會刪除並重建，只用於本機。
- `database/seed.sql`：假資料。日期依執行當天計算，新增欄位時一起補上合理的假值。
- `database/procedures.sql`：預存程序，一律 `CREATE OR ALTER`，可重複執行。

## 規則

- 命名：資料表複數 PascalCase（`Appointments`），預存程序 `usp_` 開頭，加 `dbo.` 前綴。
- 約束要具名（`PK_`、`FK_`、`UQ_`、`CK_`、`DF_`、`IX_` 開頭，與 `schema.sql` 一致），方便日後修改。
- 預存程序開頭 `SET NOCOUNT ON;`，參數有預設值時寫在定義中。
- 篩選索引需要 `QUOTED_IDENTIFIER ON`，sqlcmd 執行時加 `-I`。
- 只使用假資料，不放任何真實姓名、身分證號、病歷號。

## 同步更新

欄位或回傳結果改變時，依序檢查：

1. `api/Repositories/` 的 SELECT 欄位
2. `api/Dtos/` 的屬性
3. `api/types/clinic-api.ts` 的 interface
4. `README.md` 的資料庫說明

## 驗證

```powershell
cd database
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i schema.sql
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i seed.sql
sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i procedures.sql
```

`schema.sql` 會刪除所有資料表，執行前先取得使用者同意。
三個檔案都要無錯誤執行完；接著 `cd api; dotnet build`，再用 `api/api.http` 測試受影響的 API。

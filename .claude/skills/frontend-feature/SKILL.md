---
name: frontend-feature
description: 在前端（web/）新增一個功能區塊或畫面：API 方法、Pinia store、元件、四種畫面狀態，並在瀏覽器實際操作驗證。使用時機：/frontend-feature <功能描述>，或使用者說「前端加一個 xxx」「畫面上要能 xxx」。
argument-hint: <功能描述>
---

# 新增前端功能

依既有的門診清單（`ClinicList.vue`）與生命徵象（`VitalsPanel.vue`）為範本，不自創新架構。撰寫時套用 `vue-conventions`。

## 步驟

1. **確認規格**：有 `docs/specs/<slug>.md` 時以它的 Must 範圍為準。沒有時至少確認：畫面要顯示哪些欄位、使用者能做哪些操作、每種錯誤要怎麼呈現。不清楚就先問。
2. **確認 API**：
   - 需要的端點已存在：對照 `api/api.http` 與 Swagger 確認參數與回應。
   - 端點不存在或回傳欄位不夠（例如缺 ID）：先用 `add-api-endpoint`（改預存程序時搭配 `db-change`）完成後端，再回來做前端。不要在前端用其他欄位拼湊或寫死 ID。
3. **型別**：確認 `api/types/clinic-api.ts` 有對應 interface，沒有就加（camelCase，日期為字串）。
4. **API 方法**：在 `web/src/api/client.ts` 的 `api` 物件加方法，回傳型別明確標註。
5. **Store**：
   - 屬於既有主題（門診、病人）就加在 `stores/clinic.ts`；新主題才建新的 `stores/<name>.ts`。
   - action 管理 `loading` / `error`；寫入操作（例如報到）成功後更新畫面上的資料，不必整頁重查。
   - 可能連續觸發的查詢要處理競態。
6. **元件**：
   - 新元件放 `web/src/components/`，在 `App.vue` 組裝。
   - 載入中、空資料、錯誤、正常四種狀態都要有。
   - 會改資料的按鈕：執行中 disabled，避免重複送出；只在狀態允許時顯示（參考「報到」只在 `BOOKED` 出現）。
7. **驗證**：
   - `cd web; npm run build` 無錯誤。
   - 啟動 API（`cd api; dotnet run`）與前端（`cd web; npm run dev`），在瀏覽器實際操作：正常流程、空資料、一種錯誤情境（例如 API 回 400 / 409，或停掉 API 看錯誤訊息）。
   - 會改資料的操作先告知使用者，測完提醒可重跑 `schema.sql`、`seed.sql` 還原。
8. **文件**：`README.md` 的「前端」功能清單加一行。

## 完成條件

- 型別檢查與 build 通過。
- 瀏覽器操作過正常與錯誤流程。
- 沒有在 `web/` 重複定義 API 型別，沒有直接 `fetch`。

不要順手重構其他元件，不要新增套件。

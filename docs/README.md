# 文件

| 文件 | 範圍 | 狀態 |
|------|------|------|
| [PRD-elderly-clinic.md](PRD-elderly-clinic.md) | 全專案總規格 | 已完成部分見 AC |
| [PRD-master-data.md](PRD-master-data.md) | 病人、醫師、科別維護；導覽與空狀態；伺服器端分頁 | 完成 |
| [PRD-ui-standards.md](PRD-ui-standards.md) | 前端 UI 規範統一（按鈕、表單、卡片、表格、分頁） | 完成 |
| [PRD-frontend-unit-tests.md](PRD-frontend-unit-tests.md) | 前端單元測試（Vitest）：測試環境與關鍵邏輯 | 進行中 |

功能 PRD 以 `feature-spec` skill 建立（`PRD-<slug>.md`），只有後端的小功能以 `api-spec` 建立（`specs/<slug>.md`）。每份 PRD 開頭有版本與狀態、結尾有變更紀錄；程式修改後以 `prd-sync` 同步，程式與 PRD 放在同一個 commit。

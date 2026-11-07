---
name: git-commit
description: Git Commit 流程（.NET + SQL Server 版）：執行 dotnet build 預檢，檢查機密與建置產物，生成繁體中文 Angular 規範的 commit 訊息並提交。使用時機：/git-commit，或使用者說「幫我 commit」「提交變更」。
---

# Git Commit（.NET + SQL Server 版）

## 安全規則

- 預檢失敗就停止，回報錯誤，不要 commit。
- 不使用 `--no-verify`，也不跳過 hooks。
- 不自動 `git push`。只有使用者明確要求時才推送。
- 不把 `bin/`、`obj/`、`.vs/`、`*.user`、`.claude/settings.local.json` 加進 commit。
- 不提交含帳號密碼的連線字串（`Password=`、`Pwd=`、`User ID=`）、金鑰或 Token。發現時先警告使用者。
- 不提交真實個資。`seed.sql` 與 `api.http` 只能有假資料。

## 步驟

### 1. 檢查狀態

1. 執行 `git status` 與 `git branch --show-current`。
2. 本專案為個人專案，只用單一分支：一律直接 commit 在目前分支，不詢問、不開新分支，也不在回報中提及分支選擇。

### 2. 預檢

依變更內容執行，任一步失敗就停止：

1. 改了 `api/`：在 `api/` 執行 `dotnet build`，必須 0 error。有新增 warning 時列出並詢問是否先修。
2. 改了 `database/`：不自動執行 `schema.sql`（會刪除資料表）。詢問使用者是否已在本機執行過變更的 SQL 檔；`procedures.sql` 可重複執行，經使用者同意後可以代為執行：
   ```powershell
   sqlcmd -S localhost\SQLEXPRESS -E -I -f 65001 -i database/procedures.sql
   ```
3. 改了 API 行為（路由、參數、狀態碼、DTO）：確認 `api/api.http`、`api/types/clinic-api.ts`、`README.md` 的 API 表格已同步，沒有就提醒使用者。

只改了文件或 `.claude/` 設定時，可以跳過預檢，並在回報中說明。

### 3. 暫存變更

檢查暫存區。沒有已暫存的變更時，列出變更檔案，詢問使用者要暫存全部還是特定檔案。暫存時列出具體檔名，不要用 `git add .` 或 `git add -A`。

暫存後用 `git diff --staged` 搜尋 `Password=`、`Pwd=`、`secret`、`token`，有命中就停止並警告。

### 4. 生成 commit 訊息

讀取 `git diff --staged`，撰寫符合 Angular 規範的繁體中文訊息：

- type：`feat`、`fix`、`refactor`、`perf`、`style`、`test`、`docs`、`build`、`chore`
- scope：依變更範圍選擇
  - API 資源：`clinic`、`patients`、`appointments`
  - 分層或基礎設施：`api`、`db`、`config`
  - 其他：`docs`、`skills`
- 標題不超過 50 字，不加句號
- 列表使用 `-`
- 內文說明「為什麼」改，不只是「改了什麼」
- 資料庫結構變更時，在影響範圍註明是否需要重跑 `schema.sql`

格式：

```text
<type>(<scope>): <功能說明>

摘要：
<一到兩句說明這次變更的目的>

主要變更內容：
- <變更 1>
- <變更 2>

影響範圍：
- <受影響的 API、資料表或預存程序>
```

小變更（單一檔案、意圖明顯）只寫標題即可。依系統指示附上 `Co-Authored-By` trailer。

### 5. 提交

用 heredoc 傳入訊息，避免跳脫問題：

```bash
git commit -F - <<'EOF'
<訊息>
EOF
```

提交後執行 `git log --oneline -1` 確認，並回報 commit hash 與標題。

/* =========================================================
   樂齡門診掛號與健康追蹤系統：假資料 (SQL Server)

   請先執行 schema.sql，再執行本檔。
   所有姓名、電話、地址都是虛構資料，與真實人物無關。

   執行方式：
     SSMS：開啟本檔，按 F5
     sqlcmd：sqlcmd -S localhost\SQLEXPRESS -E -f 65001 -i seed.sql

   小提醒：
   - 中文字串前面要加 N，例如 N'家醫科'。少了 N 會變成問號。
   - 掛號與量測日期用 GETDATE() 計算，所以任何一天執行，
     「今天的門診清單」都查得到資料。
   ========================================================= */

-- Appointments 有篩選索引，新增資料時也需要 QUOTED_IDENTIFIER ON。
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;   -- 不顯示「(1 個資料列受到影響)」訊息
GO

USE ElderlyClinic;
GO

-- 防呆：資料表已經有資料時就停止，避免重複新增。
IF EXISTS (SELECT 1 FROM dbo.Patients)
BEGIN
    RAISERROR (N'Patients 已有資料。請先重新執行 schema.sql，再執行 seed.sql。', 16, 1);
    SET NOEXEC ON;   -- 讓後面的批次都不執行
END
GO

/* ---------------------------------------------------------
   科別：挑選長者最常看的科別
   --------------------------------------------------------- */
INSERT INTO dbo.Departments (DeptCode, DeptName) VALUES
    ('FM',   N'家醫科'),        -- DeptId 1
    ('CV',   N'心臟內科'),      -- DeptId 2
    ('META', N'新陳代謝科'),    -- DeptId 3
    ('NEUR', N'神經內科'),      -- DeptId 4
    ('PMR',  N'復健科');        -- DeptId 5

-- 已停用的科別：示範「停用而不刪除」
INSERT INTO dbo.Departments (DeptCode, DeptName, IsActive) VALUES
    ('ENT',  N'耳鼻喉科', 0);   -- DeptId 6
GO

/* ---------------------------------------------------------
   醫師
   --------------------------------------------------------- */
INSERT INTO dbo.Doctors (DeptId, DoctorName, Title) VALUES
    (1, N'林志明', N'主任'),        -- DoctorId 1
    (1, N'陳怡君', N'主治醫師'),    -- DoctorId 2
    (2, N'張家豪', N'主治醫師'),    -- DoctorId 3
    (2, N'黃淑芬', N'主治醫師'),    -- DoctorId 4
    (3, N'吳建宏', N'主任'),        -- DoctorId 5
    (4, N'李佩珊', N'主治醫師'),    -- DoctorId 6
    (5, N'王俊傑', N'主治醫師');    -- DoctorId 7

-- 已離職的醫師：IsActive = 0，之後可以練習「只列出在職醫師」
INSERT INTO dbo.Doctors (DeptId, DoctorName, Title, IsActive) VALUES
    (3, N'劉文彬', N'主治醫師', 0); -- DoctorId 8
GO

/* ---------------------------------------------------------
   病人：20 位，年齡大約 65 到 86 歲（病歷號指定 A000001 到 A000020）
   --------------------------------------------------------- */
INSERT INTO dbo.Patients
    (ChartNo, PatientName, Gender, BirthDate, Phone, Address, EmergencyContact, EmergencyPhone)
VALUES
    ('A000001', N'王阿明', 'M', '1945-03-12', '0900-000-001', N'台南市北區測試路 1 號',  N'王小華（子）', '0911-000-001'),
    ('A000002', N'李秀英', 'F', '1950-07-08', '0900-000-002', N'台南市東區測試路 2 號',  N'李大同（子）', '0911-000-002'),
    ('A000003', N'張金水', 'M', '1942-11-23', '0900-000-003', N'台南市中西區測試路 3 號', N'張美玲（女）', '0911-000-003'),
    ('A000004', N'陳玉蘭', 'F', '1955-01-30', '0900-000-004', N'台南市南區測試路 4 號',  N'陳志強（子）', '0911-000-004'),
    ('A000005', N'林火旺', 'M', '1948-06-15', '0900-000-005', N'台南市安平區測試路 5 號', N'林淑惠（女）', '0911-000-005'),
    ('A000006', N'黃月娥', 'F', '1940-09-02', '0900-000-006', N'台南市安南區測試路 6 號', N'黃建國（子）', '0911-000-006'),
    ('A000007', N'吳天來', 'M', '1952-12-19', '0900-000-007', N'台南市永康區測試路 7 號', N'吳佳穎（女）', '0911-000-007'),
    ('A000008', N'蔡碧霞', 'F', '1958-04-05', '0900-000-008', N'台南市北區測試路 8 號',  N'蔡明哲（子）', '0911-000-008'),
    ('A000009', N'許清標', 'M', '1946-08-27', '0900-000-009', N'台南市東區測試路 9 號',  N'許雅婷（女）', '0911-000-009'),
    ('A000010', N'鄭美珠', 'F', '1953-02-14', '0900-000-010', N'台南市中西區測試路 10 號', N'鄭家銘（子）', '0911-000-010'),
    ('A000011', N'謝進財', 'M', '1944-05-21', '0900-000-011', N'台南市南區測試路 11 號', N'謝宛如（女）', '0911-000-011'),
    ('A000012', N'郭素貞', 'F', '1949-10-09', '0900-000-012', N'台南市安平區測試路 12 號', N'郭俊宏（子）', '0911-000-012'),
    ('A000013', N'洪添福', 'M', '1951-03-03', '0900-000-013', N'台南市安南區測試路 13 號', N'洪怡萱（女）', '0911-000-013'),
    ('A000014', N'邱阿桃', 'F', '1943-07-17', '0900-000-014', N'台南市永康區測試路 14 號', N'邱國華（子）', '0911-000-014'),
    ('A000015', N'曾萬得', 'M', '1957-11-11', '0900-000-015', N'台南市北區測試路 15 號', NULL, NULL),
    ('A000016', N'廖春美', 'F', '1947-01-26', '0900-000-016', N'台南市東區測試路 16 號', N'廖志偉（子）', '0911-000-016'),
    ('A000017', N'賴水木', 'M', '1954-09-14', '0900-000-017', N'台南市中西區測試路 17 號', N'賴欣怡（女）', '0911-000-017'),
    ('A000018', N'周金枝', 'F', '1941-12-01', '0900-000-018', N'台南市南區測試路 18 號', N'周文雄（子）', '0911-000-018'),
    ('A000019', N'葉信義', 'M', '1959-06-29', '0900-000-019', N'台南市安平區測試路 19 號', N'葉思妤（女）', '0911-000-019'),
    ('A000020', N'蘇麗卿', 'F', '1956-08-08', NULL,           N'台南市安南區測試路 20 號', N'蘇柏翰（子）', '0911-000-020');
GO

/* ---------------------------------------------------------
   分頁測試用：再加 40 位病人，共 60 位
   每頁 20 筆有 3 頁、每頁 50 筆有 2 頁、每頁 100 筆只有 1 頁。
   病歷號不指定，由 dbo.seq_ChartNo 自動產生（A000021 到 A000060）。
   最後一位設為停用，用來測試「含停用」。
   --------------------------------------------------------- */
WITH Nums AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM Nums WHERE n < 40
)
INSERT INTO dbo.Patients (PatientName, Gender, BirthDate, Phone, Address, IsActive)
SELECT
    CHOOSE((n - 1) % 10 + 1, N'王', N'李', N'張', N'陳', N'林', N'黃', N'吳', N'蔡', N'許', N'鄭')
      + CHOOSE((n - 1) / 10 + 1, N'淑', N'志', N'美', N'建')
      + CHOOSE((n - 1) % 4 + 1, N'華', N'明', N'玲', N'雄'),
    CASE WHEN n % 2 = 0 THEN 'F' ELSE 'M' END,
    DATEFROMPARTS(1940 + n % 20, 1 + n % 12, 1 + n % 28),
    '0900-100-' + RIGHT('000' + CAST(n AS VARCHAR(3)), 3),
    N'台南市北區分頁路 ' + CAST(n AS NVARCHAR(3)) + N' 號',
    CASE WHEN n = 40 THEN 0 ELSE 1 END
FROM Nums;
GO

/* ---------------------------------------------------------
   掛號：昨天、今天、明天、三天後
   DECLARE 宣告變數，CAST(GETDATE() AS DATE) 取得「今天」（去掉時間）。
   --------------------------------------------------------- */
DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @yesterday DATE = DATEADD(DAY, -1, @today);
DECLARE @tomorrow  DATE = DATEADD(DAY,  1, @today);
DECLARE @in3days   DATE = DATEADD(DAY,  3, @today);

INSERT INTO dbo.Appointments (PatientId, DoctorId, VisitDate, Session, SeqNo, Status) VALUES
    -- 昨天：都已看診完畢
    ( 1, 1, @yesterday, 'M', 1, 'DONE'),
    ( 2, 1, @yesterday, 'M', 2, 'DONE'),
    ( 3, 3, @yesterday, 'M', 1, 'DONE'),
    ( 4, 5, @yesterday, 'A', 1, 'DONE'),
    ( 5, 5, @yesterday, 'A', 2, 'DONE'),
    ( 6, 6, @yesterday, 'A', 1, 'DONE'),

    -- 今天早診：有人看完、有人報到、有人還沒來、有人取消
    ( 7, 1, @today, 'M', 1, 'DONE'),
    (15, 1, @today, 'M', 2, 'DONE'),
    -- 第 8 號蔡碧霞刻意「沒有任何掛號」，用來練習 LEFT JOIN 找沒掛過號的病人
    ( 9, 1, @today, 'M', 3, 'CHECKED_IN'),
    (10, 1, @today, 'M', 4, 'BOOKED'),
    (11, 1, @today, 'M', 5, 'CANCELLED'),
    (12, 3, @today, 'M', 1, 'CHECKED_IN'),
    (13, 3, @today, 'M', 2, 'BOOKED'),
    -- 今天午診
    (14, 2, @today, 'A', 1, 'BOOKED'),
    (15, 2, @today, 'A', 2, 'BOOKED'),
    ( 1, 5, @today, 'A', 1, 'BOOKED'),
    (16, 5, @today, 'A', 2, 'BOOKED'),
    (17, 7, @today, 'A', 1, 'BOOKED'),
    -- 今天晚診
    (18, 4, @today, 'E', 1, 'BOOKED'),
    (19, 6, @today, 'E', 1, 'BOOKED'),

    -- 明天
    ( 2, 3, @tomorrow, 'M', 1, 'BOOKED'),
    ( 6, 3, @tomorrow, 'M', 2, 'BOOKED'),
    (20, 1, @tomorrow, 'M', 1, 'BOOKED'),
    ( 3, 5, @tomorrow, 'A', 1, 'BOOKED'),
    ( 9, 7, @tomorrow, 'A', 1, 'BOOKED'),

    -- 三天後
    ( 4, 4, @in3days, 'M', 1, 'BOOKED'),
    ( 5, 4, @in3days, 'M', 2, 'BOOKED'),
    (12, 6, @in3days, 'A', 1, 'BOOKED'),
    (11, 1, @in3days, 'M', 1, 'BOOKED');   -- 今天取消，改掛三天後
GO

/* ---------------------------------------------------------
   生命徵象：每位病人最近 14 天、每天早上 8 點量一次；王阿明另有大量紀錄供分頁測試
   做法：
   1. 遞迴 CTE (WITH Days AS ...) 產生 0 到 13 的數字，代表「幾天前」。
   2. CROSS JOIN 病人，得到「每位病人 × 14 天」的組合。
   3. 用 PatientId 與天數算出固定的數值，讓不同病人有不同的狀況：
      - PatientId % 5 越大，血壓越高（部分病人會超過 140，代表高血壓）
      - PatientId % 3 = 2 的病人血糖偏高（模擬糖尿病）
   每次執行結果都一樣，方便之後對答案。
   --------------------------------------------------------- */
DECLARE @today DATE = CAST(GETDATE() AS DATE);

WITH Days AS (
    SELECT 0 AS n
    UNION ALL
    SELECT n + 1 FROM Days WHERE n < 13
)
INSERT INTO dbo.VitalSigns
    (PatientId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate, BloodSugar, BodyWeight)
SELECT
    p.PatientId,
    DATEADD(HOUR, 8, CAST(DATEADD(DAY, -d.n, @today) AS DATETIME2(0))),
    115 + (p.PatientId % 5) * 8 + (p.PatientId * 7 + d.n * 3) % 15,
     70 + (p.PatientId % 4) * 4 + (p.PatientId + d.n * 5) % 10,
     62 + (p.PatientId * 3 + d.n * 7) % 25,
     90 + (p.PatientId % 3) * 30 + (p.PatientId * 11 + d.n * 13) % 40,
    CAST(50 + p.PatientId % 20 + (d.n % 3) * 0.2 AS DECIMAL(5,1))
FROM dbo.Patients AS p
CROSS JOIN Days AS d;

-- 分頁測試用：王阿明（A000001，今天午診有掛號）每天量 4 次、共 30 天。
-- 最近 7 天 26 筆、14 天 54 筆（每頁 20 筆有 3 頁、50 筆有 2 頁）、30 天 117 筆（每頁 100 筆有 2 頁）。
-- 今天只有早上 8 點那一筆，避免出現未來時間。
WITH Days AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM Days WHERE n < 29
),
Hours AS (
    SELECT h FROM (VALUES (8), (12), (16), (20)) AS t(h)
)
INSERT INTO dbo.VitalSigns (PatientId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate, BloodSugar)
SELECT
    1,
    DATEADD(HOUR, hr.h, CAST(DATEADD(DAY, -d.n, @today) AS DATETIME2(0))),
    118 + (d.n * 7 + hr.h) % 30,
     70 + (d.n * 3 + hr.h) % 15,
     60 + (d.n * 5 + hr.h) % 30,
     95 + (d.n * 11 + hr.h * 3) % 80
FROM Days AS d
CROSS JOIN Hours AS hr
WHERE NOT (hr.h = 8 AND d.n <= 13)   -- 最近 14 天的 8 點已由上面產生
OPTION (MAXRECURSION 100);

-- 補幾筆有備註的紀錄
INSERT INTO dbo.VitalSigns (PatientId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate, Note) VALUES
    (3,  DATEADD(HOUR, 14, CAST(@today AS DATETIME2(0))), 172, 98, 88, N'頭暈，複測血壓偏高，已通知醫師'),
    (14, DATEADD(HOUR, 15, CAST(@today AS DATETIME2(0))), NULL, NULL, 54, N'自覺心跳慢，安排心電圖');
GO

/* ---------------------------------------------------------
   測試帳號（只用於本機練習；部署到外部前必須刪除或更換密碼）
   帳號 admin，密碼見 README「測試帳號」。這裡只存 PBKDF2 雜湊。
   --------------------------------------------------------- */
INSERT INTO dbo.Users (Username, PasswordHash, DisplayName) VALUES
    ('admin', 'PBKDF2-SHA256$100000$RVt23YjHcwcFjIFXK8clqg==$IFrJeLG20CQrCkZ1dpx3PQ6RNmVsZHXYMSMAyVdzjoc=', N'示範護理師');
GO

SET NOEXEC OFF;
GO

-- 結果確認：每張表的筆數
SELECT N'Departments' AS TableName, COUNT(*) AS RowCnt FROM ElderlyClinic.dbo.Departments
UNION ALL SELECT N'Doctors',      COUNT(*) FROM ElderlyClinic.dbo.Doctors
UNION ALL SELECT N'Patients',     COUNT(*) FROM ElderlyClinic.dbo.Patients
UNION ALL SELECT N'Appointments', COUNT(*) FROM ElderlyClinic.dbo.Appointments
UNION ALL SELECT N'VitalSigns',   COUNT(*) FROM ElderlyClinic.dbo.VitalSigns
UNION ALL SELECT N'Users',        COUNT(*) FROM ElderlyClinic.dbo.Users;
GO

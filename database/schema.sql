/* =========================================================
   樂齡門診掛號與健康追蹤系統：資料表結構 (SQL Server)

   執行方式：
     SSMS：開啟本檔，按 F5
     sqlcmd：sqlcmd -S localhost\SQLEXPRESS -E -f 65001 -i schema.sql

   注意：本檔會「刪除並重建」ElderlyClinic 裡的資料表，
         只能用在本機練習環境。執行完請接著跑 seed.sql。
   ========================================================= */

-- 篩選索引 (filtered index) 需要這兩個設定為 ON。
-- SSMS 預設就是 ON，但 sqlcmd 預設 QUOTED_IDENTIFIER 是 OFF，所以明確寫出來。
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. 建立資料庫（不存在時才建）
IF DB_ID(N'ElderlyClinic') IS NULL
    CREATE DATABASE ElderlyClinic;
GO

USE ElderlyClinic;
GO

-- 2. 依「外鍵相依的反向順序」刪除舊資料表：
--    先刪引用別人的子表，再刪被引用的父表，否則會被外鍵擋下來。
DROP TABLE IF EXISTS dbo.VitalSigns;
DROP TABLE IF EXISTS dbo.Appointments;
DROP TABLE IF EXISTS dbo.Patients;
DROP TABLE IF EXISTS dbo.Doctors;
DROP TABLE IF EXISTS dbo.Departments;
DROP TABLE IF EXISTS dbo.Users;
DROP SEQUENCE IF EXISTS dbo.seq_ChartNo;
GO

/* ---------------------------------------------------------
   科別
   - IDENTITY(1,1)：自動編號，從 1 開始每次 +1（MySQL 的 AUTO_INCREMENT）
   - NVARCHAR：可存中文的字串型別。VARCHAR 只適合英數字。
   --------------------------------------------------------- */
CREATE TABLE dbo.Departments (
    DeptId      INT IDENTITY(1,1) NOT NULL,
    DeptCode    VARCHAR(10)       NOT NULL,   -- 科別代碼，例如 FM（家醫科）
    DeptName    NVARCHAR(50)      NOT NULL,
    IsActive    BIT               NOT NULL CONSTRAINT DF_Departments_IsActive DEFAULT (1),
    RowVersion  ROWVERSION        NOT NULL,   -- 樂觀併發控制：每次修改自動改變
    CONSTRAINT PK_Departments PRIMARY KEY (DeptId),
    CONSTRAINT UQ_Departments_DeptCode UNIQUE (DeptCode)
);
GO

/* ---------------------------------------------------------
   醫師
   - DeptId 是外鍵 (FOREIGN KEY)：只能填 Departments 裡存在的科別。
   - BIT：布林值，1 = 是，0 = 否。
   --------------------------------------------------------- */
CREATE TABLE dbo.Doctors (
    DoctorId    INT IDENTITY(1,1) NOT NULL,
    DeptId      INT               NOT NULL,
    DoctorName  NVARCHAR(50)      NOT NULL,
    Title       NVARCHAR(20)      NOT NULL,   -- 主治醫師、主任…
    IsActive    BIT               NOT NULL CONSTRAINT DF_Doctors_IsActive DEFAULT (1),
    RowVersion  ROWVERSION        NOT NULL,
    CONSTRAINT PK_Doctors PRIMARY KEY (DoctorId),
    CONSTRAINT FK_Doctors_Departments FOREIGN KEY (DeptId)
        REFERENCES dbo.Departments (DeptId)
);
GO

-- 醫師清單依科別篩選、停用科別前檢查「仍有在職醫師」
CREATE INDEX IX_Doctors_DeptId ON dbo.Doctors (DeptId, IsActive);
GO

/* ---------------------------------------------------------
   病歷號序號
   - 新增病人時由 ChartNo 的預設值取號：'A' + 6 位數字。
   - SEQUENCE 取號不會因為併發而重複（不能用 MAX(ChartNo) + 1）。
   - seed.sql 直接指定 A000001 到 A000020，所以從 21 開始。
   --------------------------------------------------------- */
CREATE SEQUENCE dbo.seq_ChartNo AS INT START WITH 21 INCREMENT BY 1;
GO

/* ---------------------------------------------------------
   病人
   - ChartNo：病歷號，醫院用來識別病人的編號，必須唯一。
   - 本專案只放假資料，刻意不存身分證字號等真實個資欄位。
   - CHECK：限制欄位只能是特定值。
   - DATETIME2 + SYSDATETIME()：新增時自動記錄時間。
   --------------------------------------------------------- */
CREATE TABLE dbo.Patients (
    PatientId        INT IDENTITY(1,1) NOT NULL,
    ChartNo          VARCHAR(10)       NOT NULL
        CONSTRAINT DF_Patients_ChartNo
        DEFAULT ('A' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.seq_ChartNo AS VARCHAR(10)), 6)),
    PatientName      NVARCHAR(50)      NOT NULL,
    Gender           CHAR(1)           NOT NULL,   -- M = 男, F = 女
    BirthDate        DATE              NOT NULL,
    Phone            VARCHAR(20)       NULL,
    Address          NVARCHAR(200)     NULL,
    EmergencyContact NVARCHAR(50)      NULL,       -- 緊急聯絡人（長者常需要）
    EmergencyPhone   VARCHAR(20)       NULL,
    CreatedAt        DATETIME2(0)      NOT NULL CONSTRAINT DF_Patients_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt        DATETIME2(0)      NULL,
    IsActive         BIT               NOT NULL CONSTRAINT DF_Patients_IsActive DEFAULT (1),
    RowVersion       ROWVERSION        NOT NULL,
    CONSTRAINT PK_Patients PRIMARY KEY (PatientId),
    CONSTRAINT UQ_Patients_ChartNo UNIQUE (ChartNo),
    CONSTRAINT CK_Patients_Gender CHECK (Gender IN ('M', 'F'))
);
GO

-- 病人清單：預設只列啟用中的病人，依病歷號排序分頁；病歷號開頭搜尋也走這個索引
CREATE INDEX IX_Patients_IsActive_ChartNo
    ON dbo.Patients (IsActive, ChartNo)
    INCLUDE (PatientName, Gender, BirthDate, Phone);
GO

/* ---------------------------------------------------------
   掛號
   - Session：診別，M = 早診, A = 午診, E = 晚診
   - SeqNo：看診號
   - Status：BOOKED 已掛號 / CHECKED_IN 已報到 / DONE 已看診 / CANCELLED 已取消
   --------------------------------------------------------- */
CREATE TABLE dbo.Appointments (
    AppointmentId INT IDENTITY(1,1) NOT NULL,
    PatientId     INT               NOT NULL,
    DoctorId      INT               NOT NULL,
    VisitDate     DATE              NOT NULL,
    Session       CHAR(1)           NOT NULL,
    SeqNo         INT               NOT NULL,
    Status        VARCHAR(12)       NOT NULL CONSTRAINT DF_Appointments_Status DEFAULT ('BOOKED'),
    CreatedAt     DATETIME2(0)      NOT NULL CONSTRAINT DF_Appointments_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Appointments PRIMARY KEY (AppointmentId),
    CONSTRAINT FK_Appointments_Patients FOREIGN KEY (PatientId)
        REFERENCES dbo.Patients (PatientId),
    CONSTRAINT FK_Appointments_Doctors FOREIGN KEY (DoctorId)
        REFERENCES dbo.Doctors (DoctorId),
    CONSTRAINT CK_Appointments_Session CHECK (Session IN ('M', 'A', 'E')),
    CONSTRAINT CK_Appointments_Status  CHECK (Status IN ('BOOKED', 'CHECKED_IN', 'DONE', 'CANCELLED')),
    -- 同一位醫師、同一天、同一診，看診號不能重複
    CONSTRAINT UQ_Appointments_Slot UNIQUE (DoctorId, VisitDate, Session, SeqNo)
);
GO

-- 防止重複掛號：同一病人在同一醫師的同一診只能有一筆「有效」掛號。
-- 用篩選索引 (WHERE ...) 排除已取消的掛號，取消後才能重新掛。
CREATE UNIQUE INDEX UX_Appointments_Patient_Slot
    ON dbo.Appointments (PatientId, DoctorId, VisitDate, Session)
    WHERE Status <> 'CANCELLED';
GO

-- 最常見的查詢：「某天某科（醫師）的門診清單」，替日期建索引加快查詢。
CREATE INDEX IX_Appointments_VisitDate
    ON dbo.Appointments (VisitDate, Session)
    INCLUDE (DoctorId, PatientId, SeqNo, Status);
GO

/* ---------------------------------------------------------
   生命徵象（血壓、心跳、血糖、體重）
   - 欄位允許 NULL：每次量測不一定每一項都有量。
   - CHECK 範圍：擋掉明顯打錯的數字（例如血壓 1200）。
   - DECIMAL(5,1)：總共 5 位數、小數 1 位，例如 65.5 公斤。
   --------------------------------------------------------- */
CREATE TABLE dbo.VitalSigns (
    VitalId      INT IDENTITY(1,1) NOT NULL,
    PatientId    INT               NOT NULL,
    MeasuredAt   DATETIME2(0)      NOT NULL,
    SystolicBP   SMALLINT          NULL,   -- 收縮壓 mmHg
    DiastolicBP  SMALLINT          NULL,   -- 舒張壓 mmHg
    HeartRate    SMALLINT          NULL,   -- 心跳 次/分
    BloodSugar   SMALLINT          NULL,   -- 血糖 mg/dL
    BodyWeight   DECIMAL(5,1)      NULL,   -- 體重 kg
    Note         NVARCHAR(200)     NULL,
    CONSTRAINT PK_VitalSigns PRIMARY KEY (VitalId),
    CONSTRAINT FK_VitalSigns_Patients FOREIGN KEY (PatientId)
        REFERENCES dbo.Patients (PatientId),
    CONSTRAINT CK_VitalSigns_SystolicBP  CHECK (SystolicBP  BETWEEN 50 AND 260),
    CONSTRAINT CK_VitalSigns_DiastolicBP CHECK (DiastolicBP BETWEEN 30 AND 160),
    CONSTRAINT CK_VitalSigns_HeartRate   CHECK (HeartRate   BETWEEN 20 AND 250),
    CONSTRAINT CK_VitalSigns_BloodSugar  CHECK (BloodSugar  BETWEEN 20 AND 800),
    CONSTRAINT CK_VitalSigns_BodyWeight  CHECK (BodyWeight  BETWEEN 10 AND 300)
);
GO

-- 趨勢圖查詢：「某位病人依時間排序的量測紀錄」
CREATE INDEX IX_VitalSigns_Patient_MeasuredAt
    ON dbo.VitalSigns (PatientId, MeasuredAt);
GO

/* ---------------------------------------------------------
   系統使用者（登入 API 用）
   - PasswordHash：PBKDF2-SHA256 雜湊，格式為 演算法$迭代次數$salt$hash（Base64）。
     絕對不存明碼密碼。
   - IsActive = 0 的帳號不能登入（停用而不刪除，保留稽核紀錄）。
   --------------------------------------------------------- */
CREATE TABLE dbo.Users (
    UserId       INT IDENTITY(1,1) NOT NULL,
    Username     VARCHAR(50)       NOT NULL,
    PasswordHash VARCHAR(200)      NOT NULL,
    DisplayName  NVARCHAR(50)      NOT NULL,
    IsActive     BIT               NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    CreatedAt    DATETIME2(0)      NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Username UNIQUE (Username)
);
GO

PRINT N'schema.sql 執行完成：已建立 6 張資料表。';
GO

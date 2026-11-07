/* =========================================================
   樂齡門診掛號與健康追蹤系統：預存程序 (SQL Server)

   執行順序：schema.sql、seed.sql、procedures.sql
   本檔只用 CREATE OR ALTER，不會刪除或修改資料，可重複執行。
   ========================================================= */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE ElderlyClinic;
GO

-- 查某天（某科）的門診清單，排除已取消的掛號。
-- @DeptId 不傳時查全部科別。
CREATE OR ALTER PROCEDURE dbo.usp_GetClinicList
    @VisitDate DATE,
    @DeptId    INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT dp.DeptName, d.DoctorName, a.Session, a.SeqNo,
           p.ChartNo, p.PatientName, a.Status
    FROM dbo.Appointments a
    JOIN dbo.Patients    p  ON a.PatientId = p.PatientId
    JOIN dbo.Doctors     d  ON a.DoctorId  = d.DoctorId
    JOIN dbo.Departments dp ON d.DeptId    = dp.DeptId
    WHERE a.VisitDate = @VisitDate
      AND (@DeptId IS NULL OR d.DeptId = @DeptId)
      AND a.Status <> 'CANCELLED'
    ORDER BY dp.DeptName, d.DoctorName, a.Session, a.SeqNo;
END
GO

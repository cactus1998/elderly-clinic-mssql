using System.Data;
using api.Data;
using Dapper;

namespace api.Repositories;

public enum CheckInOutcome
{
    Success,
    NotFound,
    InvalidStatus
}

public class AppointmentRepository
{
    private readonly SqlConnectionFactory _db;

    public AppointmentRepository(SqlConnectionFactory db) => _db = db;

    /// <summary>
    /// 只有 BOOKED 才能改成 CHECKED_IN。
    /// 條件寫在 UPDATE 的 WHERE 裡，靠「影響筆數」判斷成功與否，避免先查再改的競態。
    /// 0 筆時再查一次，區分「掛號不存在」與「狀態不允許」。
    /// </summary>
    public async Task<(CheckInOutcome Outcome, string? CurrentStatus)> CheckInAsync(int appointmentId)
    {
        const string updateSql = """
            UPDATE dbo.Appointments
            SET Status = 'CHECKED_IN'
            WHERE AppointmentId = @AppointmentId
              AND Status = 'BOOKED';
            """;
        const string statusSql =
            "SELECT Status FROM dbo.Appointments WHERE AppointmentId = @AppointmentId;";

        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        try
        {
            var args = new { AppointmentId = appointmentId };
            var affected = await conn.ExecuteAsync(updateSql, args, tx);

            if (affected == 1)
            {
                tx.Commit();
                return (CheckInOutcome.Success, "CHECKED_IN");
            }

            var status = await conn.QuerySingleOrDefaultAsync<string>(statusSql, args, tx);
            tx.Rollback();
            return status is null
                ? (CheckInOutcome.NotFound, null)
                : (CheckInOutcome.InvalidStatus, status);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }
}

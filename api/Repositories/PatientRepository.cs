using api.Data;
using api.Dtos;
using Dapper;

namespace api.Repositories;

public class PatientRepository
{
    private readonly SqlConnectionFactory _db;

    public PatientRepository(SqlConnectionFactory db) => _db = db;

    public async Task<bool> ExistsAsync(int patientId)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Patients WHERE PatientId = @PatientId;";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(sql, new { PatientId = patientId }) > 0;
    }

    /// <summary>最近 N 天的量測紀錄，依 MeasuredAt 由新到舊。</summary>
    public async Task<IEnumerable<VitalSignDto>> GetVitalsAsync(int patientId, int days)
    {
        const string sql = """
            SELECT VitalId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate,
                   BloodSugar, BodyWeight, Note
            FROM dbo.VitalSigns
            WHERE PatientId = @PatientId
              AND MeasuredAt >= DATEADD(DAY, -@Days, SYSDATETIME())
            ORDER BY MeasuredAt DESC;
            """;
        using var conn = _db.Create();
        return await conn.QueryAsync<VitalSignDto>(sql, new { PatientId = patientId, Days = days });
    }
}

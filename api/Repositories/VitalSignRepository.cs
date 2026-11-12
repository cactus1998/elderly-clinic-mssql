using api.Data;
using api.Dtos;
using Dapper;

namespace api.Repositories;

/// <summary>
/// 生命徵象的新增、修改、刪除。每個操作都是單一 SQL 敘述（本身就是原子操作），
/// 病人必須是啟用狀態；用 OUTPUT 或影響筆數判斷結果，不先查再改。
/// </summary>
public class VitalSignRepository
{
    private const string InactivePatient = "此病人已停用，不能新增、修改或刪除生命徵象。";

    private readonly SqlConnectionFactory _db;

    public VitalSignRepository(SqlConnectionFactory db) => _db = db;

    /// <summary>新增一筆量測。病人不存在回 NotFound；病人已停用回 Conflict。</summary>
    public async Task<WriteResult<VitalSignDto>> CreateAsync(int patientId, VitalSignInput input)
    {
        const string sql = """
            INSERT INTO dbo.VitalSigns
                (PatientId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate, BloodSugar, BodyWeight, Note)
            OUTPUT INSERTED.VitalId, INSERTED.MeasuredAt, INSERTED.SystolicBP, INSERTED.DiastolicBP,
                   INSERTED.HeartRate, INSERTED.BloodSugar, INSERTED.BodyWeight, INSERTED.Note
            SELECT @PatientId, @MeasuredAt, @SystolicBP, @DiastolicBP, @HeartRate, @BloodSugar, @BodyWeight, @Note
            WHERE EXISTS (SELECT 1 FROM dbo.Patients WHERE PatientId = @PatientId AND IsActive = 1);
            """;
        using var conn = _db.Create();
        var created = await conn.QuerySingleOrDefaultAsync<VitalSignDto>(sql, ToParams(input, patientId: patientId));
        if (created is not null) return WriteResult<VitalSignDto>.Ok(created);

        var patientExists = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM dbo.Patients WHERE PatientId = @PatientId;", new { PatientId = patientId }) > 0;
        return patientExists ? WriteResult<VitalSignDto>.Conflict(InactivePatient) : WriteResult<VitalSignDto>.NotFound();
    }

    /// <summary>修改一筆量測。紀錄不存在回 NotFound；病人已停用回 Conflict。</summary>
    public async Task<WriteResult<VitalSignDto>> UpdateAsync(int vitalId, VitalSignInput input)
    {
        const string sql = """
            UPDATE v
            SET MeasuredAt = @MeasuredAt, SystolicBP = @SystolicBP, DiastolicBP = @DiastolicBP,
                HeartRate = @HeartRate, BloodSugar = @BloodSugar, BodyWeight = @BodyWeight, Note = @Note
            OUTPUT INSERTED.VitalId, INSERTED.MeasuredAt, INSERTED.SystolicBP, INSERTED.DiastolicBP,
                   INSERTED.HeartRate, INSERTED.BloodSugar, INSERTED.BodyWeight, INSERTED.Note
            FROM dbo.VitalSigns AS v
            WHERE v.VitalId = @VitalId
              AND EXISTS (SELECT 1 FROM dbo.Patients WHERE PatientId = v.PatientId AND IsActive = 1);
            """;
        using var conn = _db.Create();
        var updated = await conn.QuerySingleOrDefaultAsync<VitalSignDto>(sql, ToParams(input, vitalId: vitalId));
        if (updated is not null) return WriteResult<VitalSignDto>.Ok(updated);
        return await VitalExists(conn, vitalId)
            ? WriteResult<VitalSignDto>.Conflict(InactivePatient)
            : WriteResult<VitalSignDto>.NotFound();
    }

    /// <summary>刪除一筆量測。紀錄不存在回 NotFound；病人已停用回 Conflict。</summary>
    public async Task<WriteResult<bool>> DeleteAsync(int vitalId)
    {
        const string sql = """
            DELETE v
            FROM dbo.VitalSigns AS v
            WHERE v.VitalId = @VitalId
              AND EXISTS (SELECT 1 FROM dbo.Patients WHERE PatientId = v.PatientId AND IsActive = 1);
            """;
        using var conn = _db.Create();
        if (await conn.ExecuteAsync(sql, new { VitalId = vitalId }) == 1) return WriteResult<bool>.Ok(true);
        return await VitalExists(conn, vitalId)
            ? WriteResult<bool>.Conflict(InactivePatient)
            : WriteResult<bool>.NotFound();
    }

    private static async Task<bool> VitalExists(System.Data.IDbConnection conn, int vitalId) =>
        await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM dbo.VitalSigns WHERE VitalId = @VitalId;", new { VitalId = vitalId }) > 0;

    private static object ToParams(VitalSignInput input, int? patientId = null, int? vitalId = null) => new
    {
        PatientId = patientId,
        VitalId = vitalId,
        input.MeasuredAt,
        input.SystolicBP,
        input.DiastolicBP,
        input.HeartRate,
        input.BloodSugar,
        input.BodyWeight,
        Note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim(),
    };
}

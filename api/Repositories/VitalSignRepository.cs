using api.Data;
using api.Dtos;
using Dapper;

namespace api.Repositories;

/// <summary>
/// 生命徵象的新增、修改、刪除。每個操作都是單一 SQL 敘述（本身就是原子操作），
/// 用 OUTPUT 或影響筆數判斷結果，不先查再改。
/// </summary>
public class VitalSignRepository
{
    private readonly SqlConnectionFactory _db;

    public VitalSignRepository(SqlConnectionFactory db) => _db = db;

    /// <summary>新增一筆量測。病人不存在時不寫入，回傳 null。</summary>
    public async Task<VitalSignDto?> CreateAsync(int patientId, VitalSignInput input)
    {
        const string sql = """
            INSERT INTO dbo.VitalSigns
                (PatientId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate, BloodSugar, BodyWeight, Note)
            OUTPUT INSERTED.VitalId, INSERTED.MeasuredAt, INSERTED.SystolicBP, INSERTED.DiastolicBP,
                   INSERTED.HeartRate, INSERTED.BloodSugar, INSERTED.BodyWeight, INSERTED.Note
            SELECT @PatientId, @MeasuredAt, @SystolicBP, @DiastolicBP, @HeartRate, @BloodSugar, @BodyWeight, @Note
            WHERE EXISTS (SELECT 1 FROM dbo.Patients WHERE PatientId = @PatientId);
            """;
        using var conn = _db.Create();
        return await conn.QuerySingleOrDefaultAsync<VitalSignDto>(sql, ToParams(input, patientId: patientId));
    }

    /// <summary>修改一筆量測。紀錄不存在時回傳 null。</summary>
    public async Task<VitalSignDto?> UpdateAsync(int vitalId, VitalSignInput input)
    {
        const string sql = """
            UPDATE dbo.VitalSigns
            SET MeasuredAt = @MeasuredAt, SystolicBP = @SystolicBP, DiastolicBP = @DiastolicBP,
                HeartRate = @HeartRate, BloodSugar = @BloodSugar, BodyWeight = @BodyWeight, Note = @Note
            OUTPUT INSERTED.VitalId, INSERTED.MeasuredAt, INSERTED.SystolicBP, INSERTED.DiastolicBP,
                   INSERTED.HeartRate, INSERTED.BloodSugar, INSERTED.BodyWeight, INSERTED.Note
            WHERE VitalId = @VitalId;
            """;
        using var conn = _db.Create();
        return await conn.QuerySingleOrDefaultAsync<VitalSignDto>(sql, ToParams(input, vitalId: vitalId));
    }

    /// <summary>刪除一筆量測。回傳是否有刪到資料。</summary>
    public async Task<bool> DeleteAsync(int vitalId)
    {
        const string sql = "DELETE FROM dbo.VitalSigns WHERE VitalId = @VitalId;";
        using var conn = _db.Create();
        return await conn.ExecuteAsync(sql, new { VitalId = vitalId }) == 1;
    }

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

using System.Data;
using System.Text;
using api.Data;
using api.Dtos;
using Dapper;

namespace api.Repositories;

public class PatientRepository
{
    private const string DetailColumns = """
        PatientId, ChartNo, PatientName, Gender, BirthDate, Phone, Address,
        EmergencyContact, EmergencyPhone, IsActive, CreatedAt, UpdatedAt, RowVersion
        """;

    private readonly SqlConnectionFactory _db;

    public PatientRepository(SqlConnectionFactory db) => _db = db;

    public async Task<bool> ExistsAsync(int patientId)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Patients WHERE PatientId = @PatientId;";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(sql, new { PatientId = patientId }) > 0;
    }

    /// <summary>
    /// 病人清單：關鍵字比對病歷號開頭或姓名包含，依病歷號排序分頁。
    /// ChartNo 是 VARCHAR，參數也用 VARCHAR（DbString IsAnsi），避免隱含轉型讓索引失效。
    /// OPTION (RECOMPILE)：可選條件（@Keyword IS NULL OR ...）每次依實際參數產生執行計畫。
    /// </summary>
    public async Task<PagedResult<PatientListItemDto>> ListAsync(PatientQuery q)
    {
        const string where = """
            WHERE (@IncludeInactive = 1 OR IsActive = 1)
              AND (@HasKeyword = 0
                   OR ChartNo LIKE @ChartNoPrefix ESCAPE '\'
                   OR PatientName LIKE @NameContains ESCAPE '\')
            """;
        const string sql = $"""
            SELECT COUNT(*) FROM dbo.Patients {where} OPTION (RECOMPILE);

            SELECT PatientId, ChartNo, PatientName, Gender, BirthDate, Phone, IsActive
            FROM dbo.Patients
            {where}
            ORDER BY ChartNo, PatientId
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY
            OPTION (RECOMPILE);
            """;

        var keyword = string.IsNullOrWhiteSpace(q.Keyword) ? null : SqlHelpers.EscapeLike(q.Keyword.Trim());
        var args = new
        {
            q.IncludeInactive,
            HasKeyword = keyword is not null,
            ChartNoPrefix = new DbString { Value = $"{keyword?.ToUpperInvariant()}%", IsAnsi = true, Length = 120 },
            NameContains = $"%{keyword}%",
            q.Skip,
            Take = q.PageSize,
        };

        using var conn = _db.Create();
        using var grid = await conn.QueryMultipleAsync(sql, args);
        var total = await grid.ReadSingleAsync<int>();
        var items = (await grid.ReadAsync<PatientListItemDto>()).ToList();
        foreach (var item in items) item.Phone = MaskPhone(item.Phone);
        return new PagedResult<PatientListItemDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<PatientDto?> GetAsync(int patientId)
    {
        using var conn = _db.Create();
        return await GetAsync(conn, patientId);
    }

    /// <summary>新增病人。病歷號由 ChartNo 的預設值（dbo.seq_ChartNo）產生。</summary>
    public async Task<PatientDto> CreateAsync(PatientInput input)
    {
        const string sql = """
            INSERT INTO dbo.Patients
                (PatientName, Gender, BirthDate, Phone, Address, EmergencyContact, EmergencyPhone)
            OUTPUT INSERTED.PatientId
            VALUES (@PatientName, @Gender, @BirthDate, @Phone, @Address, @EmergencyContact, @EmergencyPhone);
            """;
        using var conn = _db.Create();
        var id = await conn.QuerySingleAsync<int>(sql, Params(input));
        return (await GetAsync(conn, id))!;
    }

    /// <summary>修改病人（病歷號不可改）。RowVersion 不符代表已被他人修改。</summary>
    public async Task<WriteResult<PatientDto>> UpdateAsync(int patientId, PatientInput input)
    {
        const string sql = """
            UPDATE dbo.Patients
            SET PatientName = @PatientName, Gender = @Gender, BirthDate = @BirthDate,
                Phone = @Phone, Address = @Address,
                EmergencyContact = @EmergencyContact, EmergencyPhone = @EmergencyPhone,
                UpdatedAt = SYSDATETIME()
            WHERE PatientId = @PatientId AND RowVersion = @RowVersion;
            """;
        using var conn = _db.Create();
        if (await conn.ExecuteAsync(sql, Params(input, patientId)) == 1)
            return WriteResult<PatientDto>.Ok((await GetAsync(conn, patientId))!);

        return await GetAsync(conn, patientId) is null
            ? WriteResult<PatientDto>.NotFound()
            : WriteResult<PatientDto>.Conflict(SqlHelpers.ConcurrencyConflict);
    }

    /// <summary>停用：今天以後不能還有 BOOKED 掛號。檢查與更新在同一個 UPDATE 完成。</summary>
    public async Task<WriteResult<PatientDto>> SetActiveAsync(int patientId, bool isActive)
    {
        const string sql = """
            UPDATE dbo.Patients
            SET IsActive = @IsActive, UpdatedAt = SYSDATETIME()
            WHERE PatientId = @PatientId
              AND (@IsActive = 1 OR NOT EXISTS (
                    SELECT 1 FROM dbo.Appointments
                    WHERE PatientId = @PatientId AND Status = 'BOOKED'
                      AND VisitDate >= CAST(GETDATE() AS DATE)));
            """;
        using var conn = _db.Create();
        if (await conn.ExecuteAsync(sql, new { PatientId = patientId, IsActive = isActive }) == 1)
            return WriteResult<PatientDto>.Ok((await GetAsync(conn, patientId))!);

        return await GetAsync(conn, patientId) is null
            ? WriteResult<PatientDto>.NotFound()
            : WriteResult<PatientDto>.Conflict("此病人今天以後仍有已掛號的門診，不能停用。");
    }

    /// <summary>最近 N 天的量測紀錄，依 MeasuredAt 由新到舊分頁；VitalId 確保同時間的資料排序固定。</summary>
    public async Task<PagedResult<VitalSignDto>> GetVitalsAsync(int patientId, VitalQuery q)
    {
        const string where = """
            WHERE PatientId = @PatientId
              AND MeasuredAt >= DATEADD(DAY, -@Days, SYSDATETIME())
            """;
        const string sql = $"""
            SELECT COUNT(*) FROM dbo.VitalSigns {where};

            SELECT VitalId, MeasuredAt, SystolicBP, DiastolicBP, HeartRate,
                   BloodSugar, BodyWeight, Note
            FROM dbo.VitalSigns
            {where}
            ORDER BY MeasuredAt DESC, VitalId DESC
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
            """;
        using var conn = _db.Create();
        using var grid = await conn.QueryMultipleAsync(sql,
            new { PatientId = patientId, q.Days, q.Skip, Take = q.PageSize });
        var total = await grid.ReadSingleAsync<int>();
        var items = await grid.ReadAsync<VitalSignDto>();
        return new PagedResult<VitalSignDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }

    /// <summary>清單用電話遮罩：保留前 4 碼與後 3 碼數字，例如 0900-***-001。</summary>
    public static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrEmpty(phone)) return phone;
        var digitCount = phone.Count(char.IsAsciiDigit);
        var sb = new StringBuilder(phone.Length);
        var index = 0;
        foreach (var c in phone)
        {
            if (!char.IsAsciiDigit(c)) { sb.Append(c); continue; }
            sb.Append(index < 4 || index >= digitCount - 3 ? c : '*');
            index++;
        }
        return sb.ToString();
    }

    private static Task<PatientDto?> GetAsync(IDbConnection conn, int patientId) =>
        conn.QuerySingleOrDefaultAsync<PatientDto>(
            $"SELECT {DetailColumns} FROM dbo.Patients WHERE PatientId = @PatientId;",
            new { PatientId = patientId });

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static object Params(PatientInput input, int? patientId = null) => new
    {
        PatientId = patientId,
        PatientName = input.PatientName.Trim(),
        Gender = new DbString { Value = input.Gender, IsAnsi = true, IsFixedLength = true, Length = 1 },
        BirthDate = input.BirthDate!.Value.Date,
        Phone = Clean(input.Phone),
        Address = Clean(input.Address),
        EmergencyContact = Clean(input.EmergencyContact),
        EmergencyPhone = Clean(input.EmergencyPhone),
        input.RowVersion,
    };
}

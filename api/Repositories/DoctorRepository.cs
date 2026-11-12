using System.Data;
using api.Data;
using api.Dtos;
using Dapper;

namespace api.Repositories;

public class DoctorRepository
{
    private const string SelectColumns = """
        d.DoctorId, d.DeptId, dp.DeptCode, dp.DeptName, d.DoctorName, d.Title, d.IsActive, d.RowVersion
        """;

    private readonly SqlConnectionFactory _db;

    public DoctorRepository(SqlConnectionFactory db) => _db = db;

    public async Task<PagedResult<DoctorDto>> ListAsync(DoctorQuery q)
    {
        const string where = """
            WHERE (@IncludeInactive = 1 OR d.IsActive = 1)
              AND (@DeptId IS NULL OR d.DeptId = @DeptId)
            """;
        const string sql = $"""
            SELECT COUNT(*) FROM dbo.Doctors AS d {where};

            SELECT {SelectColumns}
            FROM dbo.Doctors AS d
            JOIN dbo.Departments AS dp ON dp.DeptId = d.DeptId
            {where}
            ORDER BY dp.DeptCode, d.DoctorName, d.DoctorId
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
            """;
        using var conn = _db.Create();
        using var grid = await conn.QueryMultipleAsync(sql, new { q.IncludeInactive, q.DeptId, q.Skip, Take = q.PageSize });
        var total = await grid.ReadSingleAsync<int>();
        var items = await grid.ReadAsync<DoctorDto>();
        return new PagedResult<DoctorDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<DoctorDto?> GetAsync(int doctorId)
    {
        using var conn = _db.Create();
        return await GetAsync(conn, doctorId);
    }

    /// <summary>新增醫師；科別必須存在且啟用。</summary>
    public async Task<WriteResult<DoctorDto>> CreateAsync(DoctorInput input)
    {
        const string sql = """
            INSERT INTO dbo.Doctors (DeptId, DoctorName, Title)
            OUTPUT INSERTED.DoctorId
            SELECT @DeptId, @DoctorName, @Title
            WHERE EXISTS (SELECT 1 FROM dbo.Departments WHERE DeptId = @DeptId AND IsActive = 1);
            """;
        using var conn = _db.Create();
        var id = await conn.QuerySingleOrDefaultAsync<int?>(sql, Params(input));
        return id is null
            ? WriteResult<DoctorDto>.Conflict(InactiveDept)
            : WriteResult<DoctorDto>.Ok((await GetAsync(conn, id.Value))!);
    }

    /// <summary>
    /// 修改醫師。換到別的科別時，新科別必須啟用；科別不變時允許（科別後來被停用也能改姓名、職稱）。
    /// </summary>
    public async Task<WriteResult<DoctorDto>> UpdateAsync(int doctorId, DoctorInput input)
    {
        const string sql = """
            UPDATE dbo.Doctors
            SET DeptId = @DeptId, DoctorName = @DoctorName, Title = @Title
            WHERE DoctorId = @DoctorId AND RowVersion = @RowVersion
              AND (DeptId = @DeptId
                   OR EXISTS (SELECT 1 FROM dbo.Departments WHERE DeptId = @DeptId AND IsActive = 1));
            """;
        using var conn = _db.Create();
        if (await conn.ExecuteAsync(sql, Params(input, doctorId)) == 1)
            return WriteResult<DoctorDto>.Ok((await GetAsync(conn, doctorId))!);

        var current = await conn.QuerySingleOrDefaultAsync<byte[]>(
            "SELECT RowVersion FROM dbo.Doctors WHERE DoctorId = @DoctorId;", new { DoctorId = doctorId });
        if (current is null) return WriteResult<DoctorDto>.NotFound();
        return input.RowVersion is not null && current.AsSpan().SequenceEqual(input.RowVersion)
            ? WriteResult<DoctorDto>.Conflict(InactiveDept)
            : WriteResult<DoctorDto>.Conflict(SqlHelpers.ConcurrencyConflict);
    }

    /// <summary>
    /// 停用：今天以後不能還有 BOOKED 掛號。啟用：所屬科別必須啟用。
    /// 檢查與更新在同一個 UPDATE 完成，不先查再改。
    /// </summary>
    public async Task<WriteResult<DoctorDto>> SetActiveAsync(int doctorId, bool isActive)
    {
        const string sql = """
            UPDATE d
            SET IsActive = @IsActive
            FROM dbo.Doctors AS d
            WHERE d.DoctorId = @DoctorId
              AND (@IsActive = 0 OR EXISTS (
                    SELECT 1 FROM dbo.Departments WHERE DeptId = d.DeptId AND IsActive = 1))
              AND (@IsActive = 1 OR NOT EXISTS (
                    SELECT 1 FROM dbo.Appointments
                    WHERE DoctorId = @DoctorId AND Status = 'BOOKED'
                      AND VisitDate >= CAST(GETDATE() AS DATE)));
            """;
        using var conn = _db.Create();
        if (await conn.ExecuteAsync(sql, new { DoctorId = doctorId, IsActive = isActive }) == 1)
            return WriteResult<DoctorDto>.Ok((await GetAsync(conn, doctorId))!);

        if (await GetAsync(conn, doctorId) is null) return WriteResult<DoctorDto>.NotFound();
        return WriteResult<DoctorDto>.Conflict(isActive
            ? "所屬科別已停用，請先啟用科別或修改醫師的科別。"
            : "此醫師今天以後仍有已掛號的門診，不能停用。");
    }

    private const string InactiveDept = "科別不存在或已停用。";

    private static Task<DoctorDto?> GetAsync(IDbConnection conn, int doctorId) =>
        conn.QuerySingleOrDefaultAsync<DoctorDto>($"""
            SELECT {SelectColumns}
            FROM dbo.Doctors AS d
            JOIN dbo.Departments AS dp ON dp.DeptId = d.DeptId
            WHERE d.DoctorId = @DoctorId;
            """, new { DoctorId = doctorId });

    private static object Params(DoctorInput input, int? doctorId = null) => new
    {
        DoctorId = doctorId,
        input.DeptId,
        DoctorName = input.DoctorName.Trim(),
        Title = input.Title.Trim(),
        input.RowVersion,
    };
}

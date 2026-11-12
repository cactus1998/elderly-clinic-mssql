using api.Data;
using api.Dtos;
using Dapper;
using Microsoft.Data.SqlClient;

namespace api.Repositories;

public class DepartmentRepository
{
    private const string Columns = "DeptId, DeptCode, DeptName, IsActive, RowVersion";
    private const string OutputColumns =
        "INSERTED.DeptId, INSERTED.DeptCode, INSERTED.DeptName, INSERTED.IsActive, INSERTED.RowVersion";

    private readonly SqlConnectionFactory _db;

    public DepartmentRepository(SqlConnectionFactory db) => _db = db;

    public async Task<PagedResult<DepartmentDto>> ListAsync(DepartmentQuery q)
    {
        const string sql = $"""
            SELECT COUNT(*) FROM dbo.Departments
            WHERE (@IncludeInactive = 1 OR IsActive = 1);

            SELECT {Columns} FROM dbo.Departments
            WHERE (@IncludeInactive = 1 OR IsActive = 1)
            ORDER BY DeptCode, DeptId
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
            """;
        using var conn = _db.Create();
        using var grid = await conn.QueryMultipleAsync(sql, new { q.IncludeInactive, q.Skip, Take = q.PageSize });
        var total = await grid.ReadSingleAsync<int>();
        var items = await grid.ReadAsync<DepartmentDto>();
        return new PagedResult<DepartmentDto> { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
    }

    public async Task<WriteResult<DepartmentDto>> CreateAsync(DepartmentInput input)
    {
        const string sql = $"""
            INSERT INTO dbo.Departments (DeptCode, DeptName)
            OUTPUT {OutputColumns}
            SELECT @DeptCode, @DeptName
            WHERE NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE DeptCode = @DeptCode);
            """;
        using var conn = _db.Create();
        try
        {
            var created = await conn.QuerySingleOrDefaultAsync<DepartmentDto>(sql, Params(input));
            return created is null ? DuplicateCode() : WriteResult<DepartmentDto>.Ok(created);
        }
        catch (SqlException ex) when (SqlHelpers.IsUniqueViolation(ex))
        {
            // 兩個請求同時新增同一代碼：NOT EXISTS 都通過，UNIQUE 約束擋下後到的那一個。
            return DuplicateCode();
        }
    }

    public async Task<WriteResult<DepartmentDto>> UpdateAsync(int deptId, DepartmentInput input)
    {
        const string sql = $"""
            UPDATE dbo.Departments
            SET DeptCode = @DeptCode, DeptName = @DeptName
            OUTPUT {OutputColumns}
            WHERE DeptId = @DeptId AND RowVersion = @RowVersion
              AND NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE DeptCode = @DeptCode AND DeptId <> @DeptId);
            """;
        const string diagnoseSql = """
            SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Departments WHERE DeptId = @DeptId) THEN 1 ELSE 0 END AS BIT) AS RowExists,
                   CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Departments WHERE DeptCode = @DeptCode AND DeptId <> @DeptId) THEN 1 ELSE 0 END AS BIT) AS CodeTaken;
            """;
        using var conn = _db.Create();
        try
        {
            var updated = await conn.QuerySingleOrDefaultAsync<DepartmentDto>(sql, Params(input, deptId));
            if (updated is not null) return WriteResult<DepartmentDto>.Ok(updated);

            var (rowExists, codeTaken) = await conn.QuerySingleAsync<(bool, bool)>(diagnoseSql, Params(input, deptId));
            if (!rowExists) return WriteResult<DepartmentDto>.NotFound();
            return codeTaken ? DuplicateCode() : WriteResult<DepartmentDto>.Conflict(SqlHelpers.ConcurrencyConflict);
        }
        catch (SqlException ex) when (SqlHelpers.IsUniqueViolation(ex))
        {
            return DuplicateCode();
        }
    }

    /// <summary>停用前不能有在職醫師；檢查與更新在同一個 UPDATE 完成。</summary>
    public async Task<WriteResult<DepartmentDto>> SetActiveAsync(int deptId, bool isActive)
    {
        const string sql = $"""
            UPDATE dbo.Departments
            SET IsActive = @IsActive
            OUTPUT {OutputColumns}
            WHERE DeptId = @DeptId
              AND (@IsActive = 1 OR NOT EXISTS (
                    SELECT 1 FROM dbo.Doctors WHERE DeptId = @DeptId AND IsActive = 1));
            """;
        using var conn = _db.Create();
        var updated = await conn.QuerySingleOrDefaultAsync<DepartmentDto>(sql, new { DeptId = deptId, IsActive = isActive });
        if (updated is not null) return WriteResult<DepartmentDto>.Ok(updated);

        var exists = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM dbo.Departments WHERE DeptId = @DeptId;", new { DeptId = deptId }) > 0;
        return exists
            ? WriteResult<DepartmentDto>.Conflict("此科別仍有在職醫師，請先停用或調動醫師。")
            : WriteResult<DepartmentDto>.NotFound();
    }

    private static WriteResult<DepartmentDto> DuplicateCode() =>
        WriteResult<DepartmentDto>.Conflict("科別代碼已存在。");

    private static object Params(DepartmentInput input, int? deptId = null) => new
    {
        DeptId = deptId,
        DeptCode = new DbString { Value = input.DeptCode.Trim(), IsAnsi = true, Length = 10 },
        DeptName = input.DeptName.Trim(),
        input.RowVersion,
    };
}

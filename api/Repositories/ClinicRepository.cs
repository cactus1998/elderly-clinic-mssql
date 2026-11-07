using System.Data;
using api.Data;
using api.Dtos;
using Dapper;

namespace api.Repositories;

public class ClinicRepository
{
    private readonly SqlConnectionFactory _db;

    public ClinicRepository(SqlConnectionFactory db) => _db = db;

    public async Task<IEnumerable<ClinicListItemDto>> GetClinicListAsync(DateOnly visitDate, int? deptId)
    {
        var p = new DynamicParameters();
        p.Add("@VisitDate", visitDate.ToDateTime(TimeOnly.MinValue), DbType.Date);
        p.Add("@DeptId", deptId, DbType.Int32);

        using var conn = _db.Create();
        return await conn.QueryAsync<ClinicListItemDto>(
            "dbo.usp_GetClinicList", p, commandType: CommandType.StoredProcedure);
    }
}

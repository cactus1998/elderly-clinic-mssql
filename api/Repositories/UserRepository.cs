using api.Data;
using Dapper;

namespace api.Repositories;

public record UserRecord(int UserId, string Username, string PasswordHash, string DisplayName);

public class UserRepository
{
    private readonly SqlConnectionFactory _db;

    public UserRepository(SqlConnectionFactory db) => _db = db;

    /// <summary>只回傳啟用中的帳號；停用或不存在都回 null。</summary>
    public async Task<UserRecord?> GetActiveByUsernameAsync(string username)
    {
        const string sql = """
            SELECT UserId, Username, PasswordHash, DisplayName
            FROM dbo.Users
            WHERE Username = @Username AND IsActive = 1;
            """;
        using var conn = _db.Create();
        return await conn.QuerySingleOrDefaultAsync<UserRecord>(sql, new { Username = username });
    }
}

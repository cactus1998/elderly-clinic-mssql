using System.Data;
using Microsoft.Data.SqlClient;

namespace api.Data;

/// <summary>
/// 從 appsettings.json 的 ConnectionStrings:ElderlyClinic 建立連線。
/// 連線字串不寫死在程式裡。
/// </summary>
public class SqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("ElderlyClinic")
            ?? throw new InvalidOperationException("Missing connection string 'ElderlyClinic'.");
    }

    public IDbConnection Create() => new SqlConnection(_connectionString);
}

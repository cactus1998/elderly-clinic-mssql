using Microsoft.Data.SqlClient;

namespace api.Repositories;

public enum WriteOutcome
{
    Success,
    NotFound,
    /// <summary>業務規則不允許（例如仍有關聯資料、代碼重複、資料已被他人修改）。</summary>
    Conflict,
}

/// <summary>寫入結果。Conflict 時 Reason 是給使用者看的說明。</summary>
public record WriteResult<T>(WriteOutcome Outcome, T? Value = default, string? Reason = null)
{
    public static WriteResult<T> Ok(T value) => new(WriteOutcome.Success, value);
    public static WriteResult<T> NotFound() => new(WriteOutcome.NotFound);
    public static WriteResult<T> Conflict(string reason) => new(WriteOutcome.Conflict, default, reason);
}

public static class SqlHelpers
{
    public const string ConcurrencyConflict = "資料已被其他人修改，請重新載入後再編輯。";

    /// <summary>違反 UNIQUE 約束或唯一索引。</summary>
    public static bool IsUniqueViolation(SqlException ex) => ex.Number is 2627 or 2601;

    /// <summary>跳脫 LIKE 萬用字元，讓使用者輸入的 % _ [ 當一般文字比對（搭配 ESCAPE '\'）。</summary>
    public static string EscapeLike(string value) =>
        value.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[");
}

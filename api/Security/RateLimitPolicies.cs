namespace api.Security;

public static class RateLimitPolicies
{
    /// <summary>登入：每個 IP 每分鐘最多 5 次，防止暴力破解密碼。</summary>
    public const string Login = "login";
}

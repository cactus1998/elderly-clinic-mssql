using System.Security.Claims;
using api.Dtos;
using api.Repositories;
using api.Security;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public const string DisplayNameClaim = "display_name";

    // 帳號不存在時也跑一次雜湊驗證，讓回應時間一致，避免被用來猜測帳號是否存在。
    private static readonly string DummyHash = PasswordHasher.Hash(Guid.NewGuid().ToString());

    private readonly UserRepository _users;
    private readonly ILogger<AuthController> _logger;

    public AuthController(UserRepository users, ILogger<AuthController> logger)
    {
        _users = users;
        _logger = logger;
    }

    /// <summary>登入。成功時回傳 accessToken，之後的請求放在 Authorization: Bearer {accessToken}。</summary>
    /// <response code="200">登入成功，回傳 tokenType、accessToken、expiresIn（秒）</response>
    /// <response code="400">帳號或密碼未填</response>
    /// <response code="401">帳號或密碼錯誤（不區分是哪一個錯）</response>
    /// <response code="429">嘗試次數過多</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _users.GetActiveByUsernameAsync(request.Username);
        var passwordOk = PasswordHasher.Verify(request.Password, user?.PasswordHash ?? DummyHash);

        if (user is null || !passwordOk)
        {
            // 不記錄輸入的帳號與密碼（使用者可能把密碼打在帳號欄）。
            _logger.LogWarning("Login failed from {RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid username or password.");
        }

        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(DisplayNameClaim, user.DisplayName),
        ], BearerTokenDefaults.AuthenticationScheme);

        // Bearer token handler 會寫出 { tokenType, accessToken, expiresIn, refreshToken }。
        return SignIn(new ClaimsPrincipal(identity), BearerTokenDefaults.AuthenticationScheme);
    }

    /// <summary>目前登入的使用者。前端用來確認 token 是否仍有效。</summary>
    /// <response code="200">token 有效</response>
    /// <response code="401">未帶 token 或 token 已過期</response>
    [HttpGet("me")]
    [ProducesResponseType(typeof(CurrentUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<CurrentUserDto> Me() => new CurrentUserDto
    {
        Username = User.Identity?.Name ?? "",
        DisplayName = User.FindFirstValue(DisplayNameClaim) ?? "",
    };
}

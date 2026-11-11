using System.ComponentModel.DataAnnotations;

namespace api.Dtos;

public class LoginRequest
{
    [Required, MaxLength(50)]
    public string Username { get; set; } = "";

    [Required, MaxLength(100)]
    public string Password { get; set; } = "";
}

public class CurrentUserDto
{
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
}

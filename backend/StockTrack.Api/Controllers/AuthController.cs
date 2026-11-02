using Microsoft.AspNetCore.Mvc;
using StockTrack.Api.Data;
using StockTrack.Api.Models;
using StockTrack.Api.Services;

namespace StockTrack.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserRepository _users;
    private readonly TokenService _tokens;

    public AuthController(UserRepository users, TokenService tokens)
    {
        _users = users;
        _tokens = tokens;
    }

    /// <summary>Checks username + password and returns a JWT.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await _users.FindByUsernameAsync(request.Username);

        // Same message whether the user or the password is wrong,
        // so attackers can't find out which usernames exist.
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new ProblemDetails { Title = "Invalid username or password" });

        return new LoginResponse(_tokens.CreateToken(user), user.Username, user.FullName, user.Role);
    }
}

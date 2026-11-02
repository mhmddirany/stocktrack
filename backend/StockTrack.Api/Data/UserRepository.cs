using Dapper;
using StockTrack.Api.Models;

namespace StockTrack.Api.Data;

public class UserRepository
{
    private readonly IDbConnectionFactory _db;

    public UserRepository(IDbConnectionFactory db) => _db = db;

    public async Task<AppUser?> FindByUsernameAsync(string username)
    {
        using var conn = await _db.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<AppUser>(@"
            SELECT user_id, username, password_hash, full_name, role
              FROM app_users
             WHERE LOWER(username) = LOWER(:username)", new { username });
    }

    /// <summary>
    /// Creates the two demo users the first time the API starts.
    /// Passwords are hashed with BCrypt here so no plain-text password is ever stored.
    /// </summary>
    public async Task SeedDemoUsersAsync(ILogger logger)
    {
        using var conn = await _db.OpenAsync();
        var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM app_users");
        if (count > 0) return;

        var users = new[]
        {
            new { Username = "admin", Password = "Admin123!", FullName = "Admin User",  Role = "ADMIN" },
            new { Username = "staff", Password = "Staff123!", FullName = "Staff Member", Role = "STAFF" }
        };

        foreach (var u in users)
        {
            await conn.ExecuteAsync(@"
                INSERT INTO app_users (username, password_hash, full_name, role)
                VALUES (:Username, :Hash, :FullName, :Role)",
                new { u.Username, Hash = BCrypt.Net.BCrypt.HashPassword(u.Password), u.FullName, u.Role });
        }

        logger.LogInformation("Created demo users: admin / Admin123!  and  staff / Staff123!");
    }
}

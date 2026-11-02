using Oracle.ManagedDataAccess.Client;

namespace StockTrack.Api.Data;

/// <summary>
/// Opens Oracle connections. Registered as a singleton; each call returns a new
/// connection that the caller disposes (ODP.NET pools the real connections).
/// </summary>
public interface IDbConnectionFactory
{
    Task<OracleConnection> OpenAsync();
}

public class OracleConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public OracleConnectionFactory(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Oracle")
            ?? throw new InvalidOperationException("Connection string 'Oracle' is missing.");
    }

    public async Task<OracleConnection> OpenAsync()
    {
        var conn = new OracleConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }
}

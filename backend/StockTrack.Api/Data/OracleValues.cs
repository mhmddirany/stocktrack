using Oracle.ManagedDataAccess.Types;

namespace StockTrack.Api.Data;

public static class OracleValues
{
    /// <summary>ODP.NET returns OUT numbers as OracleDecimal; this converts them to long.</summary>
    public static long ToLong(object? value) => value switch
    {
        OracleDecimal d => d.ToInt64(),
        null or DBNull => throw new InvalidOperationException("Oracle returned no value."),
        _ => Convert.ToInt64(value)
    };
}

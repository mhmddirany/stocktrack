using Microsoft.AspNetCore.Mvc;
using Oracle.ManagedDataAccess.Client;

namespace StockTrack.Api.Middleware;

/// <summary>
/// Turns business errors raised by ORDER_PKG (ORA-20001..20005) and Oracle
/// constraint errors into clear HTTP responses, instead of a generic 500.
/// </summary>
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OracleException ex)
        {
            var (status, title) = ex.Number switch
            {
                20001 => (StatusCodes.Status404NotFound, "Product not found"),
                20002 => (StatusCodes.Status409Conflict, "Not enough stock"),
                20003 => (StatusCodes.Status404NotFound, "Order not found"),
                20004 => (StatusCodes.Status409Conflict, "Order already cancelled"),
                20005 => (StatusCodes.Status400BadRequest, "Invalid quantity"),
                1     => (StatusCodes.Status409Conflict, "Duplicate value"),          // ORA-00001 unique constraint
                2290  => (StatusCodes.Status400BadRequest, "Value not allowed"),      // ORA-02290 check constraint
                _     => (StatusCodes.Status500InternalServerError, "Database error")
            };

            if (status == StatusCodes.Status500InternalServerError)
                _logger.LogError(ex, "Unhandled Oracle error");

            await WriteProblem(context, status, title,
                status == 500 ? "An unexpected database error occurred." : CleanMessage(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error");
            await WriteProblem(context, 500, "Server error", "An unexpected error occurred.");
        }
    }

    // "ORA-20002: Not enough stock for X ...\nORA-06512: at ..." -> "Not enough stock for X ..."
    private static string CleanMessage(string message)
    {
        var firstLine = message.Split('\n')[0];
        var colon = firstLine.IndexOf(": ", StringComparison.Ordinal);
        return colon >= 0 ? firstLine[(colon + 2)..].Trim() : firstLine.Trim();
    }

    private static Task WriteProblem(HttpContext context, int status, string title, string detail)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail
        });
    }
}

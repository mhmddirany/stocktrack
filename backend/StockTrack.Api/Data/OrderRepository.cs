using System.Data;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using StockTrack.Api.Models;

namespace StockTrack.Api.Data;

public class OrderRepository
{
    private readonly IDbConnectionFactory _db;

    public OrderRepository(IDbConnectionFactory db) => _db = db;

    private const string SummarySql = @"
        SELECT o.order_id, o.customer_name, o.status, o.total_amount,
               u.full_name AS created_by, CAST(o.created_at AS DATE) AS created_at,
               (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.order_id) AS item_count
          FROM orders o
          JOIN app_users u ON u.user_id = o.created_by";

    public async Task<IEnumerable<OrderSummary>> ListAsync(string? status)
    {
        using var conn = await _db.OpenAsync();
        return await conn.QueryAsync<OrderSummary>(
            SummarySql + @"
             WHERE (:status IS NULL OR o.status = :status)
             ORDER BY o.created_at DESC
             FETCH FIRST 200 ROWS ONLY",
            new { status = string.IsNullOrWhiteSpace(status) ? null : status.ToUpperInvariant() });
    }

    public async Task<OrderDetail?> GetAsync(long id)
    {
        using var conn = await _db.OpenAsync();

        var order = await conn.QuerySingleOrDefaultAsync<OrderDetail>(
            SummarySql + " WHERE o.order_id = :id", new { id });
        if (order is null) return null;

        var lines = await conn.QueryAsync<OrderLine>(@"
            SELECT i.product_id, p.sku, p.name AS product_name,
                   i.quantity, i.unit_price, i.line_total
              FROM order_items i
              JOIN products p ON p.product_id = i.product_id
             WHERE i.order_id = :id
             ORDER BY i.order_item_id", new { id });

        order.Items = lines.ToList();
        return order;
    }

    /// <summary>
    /// Creates the order and all its lines in ONE transaction by calling ORDER_PKG.
    /// If any line fails (e.g. not enough stock), everything is rolled back,
    /// so we never end up with half an order or wrong stock numbers.
    /// </summary>
    public async Task<long> CreateAsync(CreateOrderRequest request, long userId)
    {
        using var conn = await _db.OpenAsync();
        using var tx = conn.BeginTransaction();

        try
        {
            long orderId;
            using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "order_pkg.create_order";
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.BindByName = true;
                cmd.Parameters.Add("p_customer_name", OracleDbType.Varchar2).Value = request.CustomerName;
                cmd.Parameters.Add("p_created_by", OracleDbType.Int64).Value = userId;
                var outId = cmd.Parameters.Add("p_order_id", OracleDbType.Int64, ParameterDirection.Output);

                await cmd.ExecuteNonQueryAsync();
                orderId = OracleValues.ToLong(outId.Value);
            }

            // Merge duplicate lines (same product twice) before calling the package.
            var lines = request.Items
                .GroupBy(i => i.ProductId)
                .Select(g => new { ProductId = g.Key, Quantity = g.Sum(i => i.Quantity) });

            foreach (var line in lines)
            {
                using var cmd = conn.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = "order_pkg.add_item";
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.BindByName = true;
                cmd.Parameters.Add("p_order_id", OracleDbType.Int64).Value = orderId;
                cmd.Parameters.Add("p_product_id", OracleDbType.Int64).Value = line.ProductId;
                cmd.Parameters.Add("p_quantity", OracleDbType.Int32).Value = line.Quantity;
                await cmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return orderId;
        }
        catch
        {
            await tx.RollbackAsync();
            throw; // ErrorHandlingMiddleware turns ORA-200xx into a clean HTTP error
        }
    }

    public async Task CancelAsync(long id)
    {
        using var conn = await _db.OpenAsync();
        using var tx = conn.BeginTransaction();
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "order_pkg.cancel_order";
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.BindByName = true;
            cmd.Parameters.Add("p_order_id", OracleDbType.Int64).Value = id;
            await cmd.ExecuteNonQueryAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<DashboardStats> GetStatsAsync()
    {
        using var conn = await _db.OpenAsync();
        return await conn.QuerySingleAsync<DashboardStats>(@"
            SELECT
              (SELECT COUNT(*) FROM products WHERE is_active = 1)                       AS product_count,
              (SELECT COUNT(*) FROM low_stock_v)                                       AS low_stock_count,
              (SELECT COUNT(*) FROM orders WHERE status = 'PLACED')                    AS order_count,
              (SELECT NVL(SUM(total_amount), 0) FROM orders WHERE status = 'PLACED')   AS revenue
            FROM dual");
    }
}

public class DashboardStats
{
    public int ProductCount { get; set; }
    public int LowStockCount { get; set; }
    public int OrderCount { get; set; }
    public decimal Revenue { get; set; }
}

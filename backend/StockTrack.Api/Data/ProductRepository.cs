using Dapper;
using Oracle.ManagedDataAccess.Client;
using StockTrack.Api.Models;

namespace StockTrack.Api.Data;

public class ProductRepository
{
    private readonly IDbConnectionFactory _db;

    public ProductRepository(IDbConnectionFactory db) => _db = db;

    private const string SelectColumns = @"
        SELECT product_id, sku, name, category, unit_price, stock_qty, reorder_level
          FROM products";

    public async Task<IEnumerable<Product>> SearchAsync(string? search, string? category)
    {
        // Parameters (:search, :category) are always bound, never concatenated,
        // which prevents SQL injection.
        var sql = SelectColumns + @"
         WHERE is_active = 1
           AND (:search IS NULL
                OR UPPER(name) LIKE '%' || UPPER(:search) || '%'
                OR UPPER(sku)  LIKE '%' || UPPER(:search) || '%')
           AND (:category IS NULL OR category = :category)
         ORDER BY category, name";

        using var conn = await _db.OpenAsync();
        return await conn.QueryAsync<Product>(sql, new
        {
            search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            category = string.IsNullOrWhiteSpace(category) ? null : category
        });
    }

    public async Task<Product?> GetAsync(long id)
    {
        using var conn = await _db.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<Product>(
            SelectColumns + " WHERE product_id = :id AND is_active = 1", new { id });
    }

    public async Task<IEnumerable<Product>> GetLowStockAsync()
    {
        using var conn = await _db.OpenAsync();
        return await conn.QueryAsync<Product>(@"
            SELECT product_id, sku, name, category, unit_price, stock_qty, reorder_level
              FROM low_stock_v
             ORDER BY stock_qty");
    }

    public async Task<IEnumerable<string>> GetCategoriesAsync()
    {
        using var conn = await _db.OpenAsync();
        return await conn.QueryAsync<string>(
            "SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category");
    }

    public async Task<long> CreateAsync(ProductRequest p)
    {
        // Plain ODP.NET here (not Dapper) so we can read the RETURNING ... INTO value.
        using var conn = await _db.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandText = @"
            INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level)
            VALUES (:sku, :name, :category, :unit_price, :stock_qty, :reorder_level)
            RETURNING product_id INTO :id";
        cmd.Parameters.Add("sku", OracleDbType.Varchar2).Value = p.Sku.Trim();
        cmd.Parameters.Add("name", OracleDbType.Varchar2).Value = p.Name.Trim();
        cmd.Parameters.Add("category", OracleDbType.Varchar2).Value = p.Category.Trim();
        cmd.Parameters.Add("unit_price", OracleDbType.Decimal).Value = p.UnitPrice;
        cmd.Parameters.Add("stock_qty", OracleDbType.Int32).Value = p.StockQty;
        cmd.Parameters.Add("reorder_level", OracleDbType.Int32).Value = p.ReorderLevel;
        var id = cmd.Parameters.Add("id", OracleDbType.Int64, System.Data.ParameterDirection.Output);

        await cmd.ExecuteNonQueryAsync();
        return OracleValues.ToLong(id.Value);
    }

    public async Task<bool> UpdateAsync(long id, ProductRequest p)
    {
        using var conn = await _db.OpenAsync();
        var rows = await conn.ExecuteAsync(@"
            UPDATE products
               SET sku = :Sku, name = :Name, category = :Category,
                   unit_price = :UnitPrice, stock_qty = :StockQty,
                   reorder_level = :ReorderLevel, updated_at = SYSTIMESTAMP
             WHERE product_id = :id AND is_active = 1",
            new { p.Sku, p.Name, p.Category, p.UnitPrice, p.StockQty, p.ReorderLevel, id });
        return rows == 1;
    }

    /// <summary>Soft delete: old orders still reference the product, so we hide it instead.</summary>
    public async Task<bool> DeactivateAsync(long id)
    {
        using var conn = await _db.OpenAsync();
        var rows = await conn.ExecuteAsync(
            "UPDATE products SET is_active = 0, updated_at = SYSTIMESTAMP WHERE product_id = :id AND is_active = 1",
            new { id });
        return rows == 1;
    }
}

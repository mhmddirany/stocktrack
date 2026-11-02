using System.ComponentModel.DataAnnotations;

namespace StockTrack.Api.Models;

// ---------- Auth ----------

public record LoginRequest(
    [Required] string Username,
    [Required] string Password);

public record LoginResponse(string Token, string Username, string FullName, string Role);

// ---------- Products ----------

public class Product
{
    public long ProductId { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int StockQty { get; set; }
    public int ReorderLevel { get; set; }
    public bool IsLowStock => StockQty <= ReorderLevel;
}

public record ProductRequest(
    [Required, StringLength(30)] string Sku,
    [Required, StringLength(120)] string Name,
    [Required, StringLength(50)] string Category,
    [Range(0, 1_000_000)] decimal UnitPrice,
    [Range(0, 1_000_000)] int StockQty,
    [Range(0, 1_000_000)] int ReorderLevel);

// ---------- Orders ----------

public record OrderItemRequest(
    [Range(1, long.MaxValue)] long ProductId,
    [Range(1, 10_000)] int Quantity);

public record CreateOrderRequest(
    [Required, StringLength(120, MinimumLength = 2)] string CustomerName,
    [Required, MinLength(1)] List<OrderItemRequest> Items);

public class OrderSummary
{
    public long OrderId { get; set; }
    public string CustomerName { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public string CreatedBy { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public int ItemCount { get; set; }
}

public class OrderLine
{
    public long ProductId { get; set; }
    public string Sku { get; set; } = "";
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class OrderDetail : OrderSummary
{
    public List<OrderLine> Items { get; set; } = new();
}

// ---------- Users (internal) ----------

public class AppUser
{
    public long UserId { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Role { get; set; } = "";
}

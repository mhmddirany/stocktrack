using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockTrack.Api.Data;
using StockTrack.Api.Models;

namespace StockTrack.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly OrderRepository _orders;

    public OrdersController(OrderRepository orders) => _orders = orders;

    // GET /api/orders?status=PLACED
    [HttpGet]
    public async Task<IEnumerable<OrderSummary>> List(string? status) => await _orders.ListAsync(status);

    [HttpGet("{id:long}")]
    public async Task<ActionResult<OrderDetail>> Get(long id)
        => await _orders.GetAsync(id) is { } o ? o : NotFound();

    [HttpGet("stats")]
    public async Task<DashboardStats> Stats() => await _orders.GetStatsAsync();

    /// <summary>
    /// Places an order. Stock checks happen in ORDER_PKG; if any item is short,
    /// the whole order is rolled back and the API returns 409 Conflict.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<OrderDetail>> Create(CreateOrderRequest request)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var id = await _orders.CreateAsync(request, userId);
        return CreatedAtAction(nameof(Get), new { id }, await _orders.GetAsync(id));
    }

    // Cancelling gives stock back, so only admins can do it.
    [HttpPost("{id:long}/cancel")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Cancel(long id)
    {
        await _orders.CancelAsync(id);
        return NoContent();
    }
}

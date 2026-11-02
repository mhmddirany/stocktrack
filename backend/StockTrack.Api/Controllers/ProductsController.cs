using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockTrack.Api.Data;
using StockTrack.Api.Models;

namespace StockTrack.Api.Controllers;

[ApiController]
[Route("api/products")]
[Authorize] // every endpoint needs a logged-in user
public class ProductsController : ControllerBase
{
    private readonly ProductRepository _products;

    public ProductsController(ProductRepository products) => _products = products;

    // GET /api/products?search=dell&category=Laptops
    [HttpGet]
    public async Task<IEnumerable<Product>> List(string? search, string? category)
        => await _products.SearchAsync(search, category);

    [HttpGet("{id:long}")]
    public async Task<ActionResult<Product>> Get(long id)
        => await _products.GetAsync(id) is { } p ? p : NotFound();

    [HttpGet("low-stock")]
    public async Task<IEnumerable<Product>> LowStock() => await _products.GetLowStockAsync();

    [HttpGet("categories")]
    public async Task<IEnumerable<string>> Categories() => await _products.GetCategoriesAsync();

    // Only admins can change the catalogue.
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Product>> Create(ProductRequest request)
    {
        var id = await _products.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id }, await _products.GetAsync(id));
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Update(long id, ProductRequest request)
        => await _products.UpdateAsync(id, request) ? NoContent() : NotFound();

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Delete(long id)
        => await _products.DeactivateAsync(id) ? NoContent() : NotFound();
}

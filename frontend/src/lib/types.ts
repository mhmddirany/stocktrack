// These types mirror the C# DTOs in backend/StockTrack.Api/Models/Dtos.cs.
// ASP.NET serializes PascalCase properties as camelCase JSON.

export type Role = "ADMIN" | "STAFF";

export interface User {
  token: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface Product {
  productId: number;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  stockQty: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export type ProductInput = Omit<Product, "productId" | "isLowStock">;

export interface OrderSummary {
  orderId: number;
  customerName: string;
  status: "PLACED" | "CANCELLED";
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  itemCount: number;
}

export interface OrderLine {
  productId: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderDetail extends OrderSummary {
  items: OrderLine[];
}

export interface DashboardStats {
  productCount: number;
  lowStockCount: number;
  orderCount: number;
  revenue: number;
}

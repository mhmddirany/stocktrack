// One place for every HTTP call to the ASP.NET API.
import type {
  DashboardStats, OrderDetail, OrderSummary, Product, ProductInput, User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const STORAGE_KEY = "stocktrack.user";

/** Error carrying the HTTP status and the API's ProblemDetails message. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the session just won't survive a reload */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = getStoredUser();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && path !== "/api/auth/login") {
    // Token missing or expired: log out and go back to the login page.
    storeUser(null);
    window.location.href = "/login";
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const problem = await res.json();
      message = problem.detail || problem.title || message;
      // Validation errors come back as { errors: { Field: ["msg"] } }
      if (problem.errors) message = Object.values(problem.errors).flat().join(" ");
    } catch {
      /* body was not JSON */
    }
    if (res.status === 403) message = "You don't have permission to do that.";
    throw new ApiError(res.status, message);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  login: (username: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  products: (search = "", category = "") =>
    request<Product[]>(
      `/api/products?${new URLSearchParams({ search, category })}`,
    ),
  categories: () => request<string[]>("/api/products/categories"),
  lowStock: () => request<Product[]>("/api/products/low-stock"),
  createProduct: (p: ProductInput) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(p) }),
  updateProduct: (id: number, p: ProductInput) =>
    request<void>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(p) }),
  deleteProduct: (id: number) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }),

  orders: (status = "") =>
    request<OrderSummary[]>(`/api/orders?${new URLSearchParams({ status })}`),
  order: (id: number) => request<OrderDetail>(`/api/orders/${id}`),
  stats: () => request<DashboardStats>("/api/orders/stats"),
  createOrder: (customerName: string, items: { productId: number; quantity: number }[]) =>
    request<OrderDetail>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ customerName, items }),
    }),
  cancelOrder: (id: number) =>
    request<void>(`/api/orders/${id}/cancel`, { method: "POST" }),
};

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

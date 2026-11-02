"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { api, money } from "@/lib/api";
import type { DashboardStats, Product } from "@/lib/types";

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <Paper sx={{ p: 2.5, flex: "1 1 200px" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 600, color: warn ? "warning.main" : "text.primary" }}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.stats(), api.lowStock()])
      .then(([s, low]) => { setStats(s); setLowStock(low); })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Dashboard</Typography>
        <Button component={Link} href="/orders/new" variant="contained">New order</Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        <StatCard label="Active products" value={stats?.productCount ?? "–"} />
        <StatCard label="Low-stock items" value={stats?.lowStockCount ?? "–"} warn={!!stats?.lowStockCount} />
        <StatCard label="Placed orders" value={stats?.orderCount ?? "–"} />
        <StatCard label="Revenue" value={stats ? money(stats.revenue) : "–"} />
      </Box>

      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>Needs reordering</Typography>
        {lowStock.length === 0 ? (
          <Typography sx={{ px: 2, pb: 2 }} color="text.secondary">All products are above their reorder level.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">In stock</TableCell>
                <TableCell align="right">Reorder at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowStock.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color={p.stockQty === 0 ? "error" : "warning"} label={p.stockQty} />
                  </TableCell>
                  <TableCell align="right">{p.reorderLevel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}

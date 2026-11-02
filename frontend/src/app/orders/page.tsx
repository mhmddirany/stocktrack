"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { api, money } from "@/lib/api";
import type { OrderSummary } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.orders(status).then(setOrders).catch((e) => setError(e.message));
  }, [status]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Orders</Typography>
        <Button component={Link} href="/orders/new" variant="contained">New order</Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ width: 200 }}>
        <MenuItem value="">All</MenuItem>
        <MenuItem value="PLACED">Placed</MenuItem>
        <MenuItem value="CANCELLED">Cancelled</MenuItem>
      </TextField>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Created by</TableCell>
              <TableCell align="right">Items</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.orderId} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/orders/${o.orderId}`)}>
                <TableCell>{o.orderId}</TableCell>
                <TableCell>{o.customerName}</TableCell>
                <TableCell>{new Date(o.createdAt).toLocaleString()}</TableCell>
                <TableCell>{o.createdBy}</TableCell>
                <TableCell align="right">{o.itemCount}</TableCell>
                <TableCell align="right">{money(o.totalAmount)}</TableCell>
                <TableCell>
                  <Chip size="small" label={o.status} color={o.status === "PLACED" ? "success" : "default"} />
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>No orders yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

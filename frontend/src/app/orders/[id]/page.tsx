"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { api, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { OrderDetail } from "@/lib/types";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  const load = () => api.order(Number(id)).then(setOrder).catch((e) => setError(e.message));

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = async () => {
    if (!confirm("Cancel this order? Its items go back into stock.")) return;
    try {
      await api.cancelOrder(Number(id));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!order) return <Typography color="text.secondary">Loading…</Typography>;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5">Order #{order.orderId}</Typography>
          <Chip label={order.status} color={order.status === "PLACED" ? "success" : "default"} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/orders">Back</Button>
          {user?.role === "ADMIN" && order.status === "PLACED" && (
            <Button color="error" variant="outlined" onClick={cancel}>Cancel order</Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography><b>Customer:</b> {order.customerName}</Typography>
        <Typography><b>Date:</b> {new Date(order.createdAt).toLocaleString()}</Typography>
        <Typography><b>Created by:</b> {order.createdBy}</Typography>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit price</TableCell>
              <TableCell align="right">Line total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.items.map((i) => (
              <TableRow key={i.productId}>
                <TableCell>{i.sku}</TableCell>
                <TableCell>{i.productName}</TableCell>
                <TableCell align="right">{i.quantity}</TableCell>
                <TableCell align="right">{money(i.unitPrice)}</TableCell>
                <TableCell align="right">{money(i.lineTotal)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} align="right"><b>Total</b></TableCell>
              <TableCell align="right"><b>{money(order.totalAmount)}</b></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}

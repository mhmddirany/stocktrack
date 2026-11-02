"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert, Autocomplete, Button, IconButton, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { api, money } from "@/lib/api";
import type { Product } from "@/lib/types";

interface Line { product: Product; quantity: number }

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [picked, setPicked] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.products().then(setProducts).catch((e) => setError(e.message));
  }, []);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.product.unitPrice * l.quantity, 0),
    [lines],
  );

  const addLine = (p: Product | null) => {
    setPicked(null);
    if (!p) return;
    setLines((prev) =>
      prev.some((l) => l.product.productId === p.productId)
        ? prev.map((l) => (l.product.productId === p.productId ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { product: p, quantity: 1 }],
    );
  };

  const setQty = (id: number, q: number) =>
    setLines((prev) => prev.map((l) => (l.product.productId === id ? { ...l, quantity: Math.max(1, q) } : l)));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const order = await api.createOrder(
        customer.trim(),
        lines.map((l) => ({ productId: l.product.productId, quantity: l.quantity })),
      );
      router.push(`/orders/${order.orderId}`);
    } catch (e) {
      // e.g. 409 "Not enough stock for LG 27" 4K Monitor: 4 left, 10 requested."
      setError(e instanceof Error ? e.message : "Could not place order");
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">New order</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField label="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
          <Autocomplete
            options={products}
            value={picked}
            onChange={(_, p) => addLine(p)}
            getOptionLabel={(p) => `${p.sku} – ${p.name} (${p.stockQty} in stock)`}
            getOptionDisabled={(p) => p.stockQty === 0}
            renderInput={(params) => <TextField {...params} label="Add a product" />}
          />
        </Stack>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right" width={120}>Qty</TableCell>
              <TableCell align="right">Line total</TableCell>
              <TableCell width={48} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.product.productId}>
                <TableCell>
                  {l.product.name}
                  {l.quantity > l.product.stockQty && (
                    <Typography variant="caption" color="error" display="block">
                      Only {l.product.stockQty} in stock
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{money(l.product.unitPrice)}</TableCell>
                <TableCell align="right">
                  <TextField type="number" size="small" value={l.quantity}
                    onChange={(e) => setQty(l.product.productId, Number(e.target.value))}
                    inputProps={{ min: 1, style: { textAlign: "right" } }} />
                </TableCell>
                <TableCell align="right">{money(l.product.unitPrice * l.quantity)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setLines(lines.filter((x) => x !== l))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {lines.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>Add products above.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Total: {money(total)}</Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => router.push("/orders")}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy || lines.length === 0 || customer.trim().length < 2}>
            {busy ? "Placing…" : "Place order"}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField,
} from "@mui/material";
import type { Product, ProductInput } from "@/lib/types";

const EMPTY: ProductInput = { sku: "", name: "", category: "", unitPrice: 0, stockQty: 0, reorderLevel: 5 };

interface Props {
  open: boolean;
  product: Product | null; // null = create, otherwise edit
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
}

export default function ProductDialog({ open, product, onClose, onSave }: Props) {
  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product } : EMPTY);
      setError("");
    }
  }, [open, product]);

  const set = (field: keyof ProductInput, numeric = false) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [field]: numeric ? Number(e.target.value) : e.target.value });

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{product ? `Edit ${product.sku}` : "New product"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="SKU" value={form.sku} onChange={set("sku")} required fullWidth />
            <TextField label="Category" value={form.category} onChange={set("category")} required fullWidth />
          </Stack>
          <TextField label="Name" value={form.name} onChange={set("name")} required fullWidth />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Unit price ($)" type="number" value={form.unitPrice} onChange={set("unitPrice", true)} inputProps={{ min: 0, step: 0.01 }} fullWidth />
            <TextField label="In stock" type="number" value={form.stockQty} onChange={set("stockQty", true)} inputProps={{ min: 0 }} fullWidth />
            <TextField label="Reorder level" type="number" value={form.reorderLevel} onChange={set("reorderLevel", true)} inputProps={{ min: 0 }} fullWidth />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form.sku || !form.name || !form.category}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

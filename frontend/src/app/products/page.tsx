"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert, Button, Chip, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { api, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Product, ProductInput } from "@/lib/types";
import ProductDialog from "@/components/ProductDialog";

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(() => {
    api.products(search, category).then(setProducts).catch((e) => setError(e.message));
  }, [search, category]);

  // Wait 300 ms after the user stops typing before searching.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const save = async (input: ProductInput) => {
    if (editing) await api.updateProduct(editing.productId, input);
    else await api.createProduct(input);
    load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Remove ${p.name}? Existing orders keep their history.`)) return;
    try {
      await api.deleteProduct(p.productId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Products</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            Add product
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 260 }} />
        <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} size="small" sx={{ minWidth: 180 }}>
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Stock</TableCell>
              {isAdmin && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.productId} hover>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell align="right">{money(p.unitPrice)}</TableCell>
                <TableCell align="right">
                  {p.isLowStock
                    ? <Chip size="small" color={p.stockQty === 0 ? "error" : "warning"} label={`${p.stockQty} low`} />
                    : p.stockQty}
                </TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditing(p); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => remove(p)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>No products found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ProductDialog open={dialogOpen} product={editing} onClose={() => setDialogOpen(false)} onSave={save} />
    </Stack>
  );
}

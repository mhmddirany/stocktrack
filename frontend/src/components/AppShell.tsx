"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar, Box, Button, Chip, CircularProgress, Container, Stack, Toolbar, Typography,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/orders", label: "Orders" },
];

/** Top bar + route guard: every page except /login needs a logged-in user. */
export default function AppShell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (ready && !user && !isLogin) router.replace("/login");
  }, [ready, user, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (!ready || !user) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Inventory2Icon />
          <Typography variant="h6" sx={{ mr: 2 }}>StockTrack</Typography>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  color="inherit"
                  sx={{ opacity: active ? 1 : 0.75, borderBottom: active ? "2px solid #fff" : "2px solid transparent", borderRadius: 0 }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>
          <Typography variant="body2">{user.fullName}</Typography>
          <Chip size="small" label={user.role} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }} />
          <Button color="inherit" onClick={() => { logout(); router.replace("/login"); }}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>{children}</Container>
    </>
  );
}

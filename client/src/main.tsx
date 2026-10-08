import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme.css";
const rootEl = document.querySelector<HTMLElement>("[data-generated-space-root]");
if (!rootEl) throw new Error("Missing app root");
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 }, mutations: { retry: false } },
});
createRoot(rootEl).render(
  <StrictMode><QueryClientProvider client={queryClient}>
    <div className="app-root"><App /></div>
  </QueryClientProvider></StrictMode>,
);

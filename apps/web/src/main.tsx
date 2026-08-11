import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startRealtime } from "./realtime";
import { router } from "./router";
import { Toaster } from "./ui/toast";
import "./styles/app.css";

const queryClient = new QueryClient();
startRealtime(queryClient);

const root = document.getElementById("root");
if (root === null) {
  throw new Error("index.html carries no #root element");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);

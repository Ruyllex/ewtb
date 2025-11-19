"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

// 🛑 CAMBIO CLAVE: Usamos createTRPCReact para generar el objeto 'api'
// que contiene todos los hooks tipados (api.videos.recordView, etc.)
import { createTRPCReact } from "@trpc/react-query"; 

import { useState } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";
import type { AppRouter } from "./routers/_app";

// 1. Exportamos el helper fuertemente tipado 'api'
export const api = createTRPCReact<AppRouter>();

let browserQueryClient: QueryClient;

function getQueryClient() {
    if (typeof window === "undefined") {
        // Server: always make a new query client
        return makeQueryClient();
    }
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
}

function getUrl() {
    const base = (() => {
        if (typeof window !== "undefined") return "";
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return "http://localhost:3000";
    })();
    return `${base}/api/trpc`;
}

export function TRPCReactProvider(
    props: Readonly<{
        children: React.ReactNode;
    }>
) {
    const queryClient = getQueryClient();
    const [trpcClient] = useState(() =>
        createTRPCClient<AppRouter>({
            links: [
                httpBatchLink({
                    transformer: superjson,
                    url: getUrl(),
                    async headers() {
                        const headers = new Headers();
                        headers.set("x-trpc-source", "nextjs-react");
                        return headers;
                    },
                }),
            ],
        })
    );
    return (
        <QueryClientProvider client={queryClient}>
            {/* 🛑 CAMBIO CLAVE: Usamos api.Provider en lugar de TRPCProvider */}
            <api.Provider client={trpcClient} queryClient={queryClient}>
                {props.children}
            </api.Provider>
        </QueryClientProvider>
    );
}

export function useTRPC() {
    // Retorna el helper moderno
    return api; 
}
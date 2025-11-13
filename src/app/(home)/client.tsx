"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export const ClientPage = () => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.categories.getMany.queryOptions());

  return (
    <div>
      <p>Esto es un client component, haciendo una llamada a una api con prefetching de la data</p>
      <div>{JSON.stringify(data)}</div>
    </div>
  );
};

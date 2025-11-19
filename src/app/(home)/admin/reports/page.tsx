import { AdminReportsView } from "@/modules/reports/ui/views/admin-reports-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { redirect } from "next/navigation";

const AdminReportsPage = async () => {
  // Verificar si el usuario es admin
  try {
    await prefetch(trpc.users.isAdmin.queryOptions());
  } catch (error) {
    // Si no está autenticado o no es admin, redirigir
    redirect("/");
  }

  return (
    <HydrateClient>
      <AdminReportsView />
    </HydrateClient>
  );
};

export default AdminReportsPage;


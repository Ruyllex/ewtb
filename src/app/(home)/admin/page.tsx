import { AdminDashboardView } from "@/modules/admin/ui/views/admin-dashboard-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { redirect } from "next/navigation";

const AdminPage = async () => {
  // Verificar si el usuario es admin
  try {
    await prefetch(trpc.users.isAdmin.queryOptions());
  } catch (error) {
    // Si no está autenticado o no es admin, redirigir
    redirect("/");
  }

  return (
    <HydrateClient>
      <AdminDashboardView />
    </HydrateClient>
  );
};

export default AdminPage;


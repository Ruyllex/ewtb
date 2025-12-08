"use client";

import { api } from "@/trpc/client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  AlertTriangle, 
  Trash2, 
  ShieldCheckIcon,
  UserIcon,
  CalendarIcon,
  MailIcon
} from "lucide-react";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { TimeAgo } from "@/components/time-ago";
import { AddStrikeModal } from "./add-strike-modal";

export const UsersList = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showStrikeModal, setShowStrikeModal] = useState(false);

  const {
    data: usersData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingUsers,
  } = api.admin.getUsers.useInfiniteQuery(
    { limit: 20, search: search || undefined },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["admin"], "getUsers"] });
      toast.success("Usuario eliminado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar usuario");
    },
  });

  const users = usersData?.pages.flatMap((page) => page.items) || [];

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`¿Estás seguro de eliminar al usuario "${userName}"? Esta acción es irreversible y eliminará todos sus datos.`)) {
      deleteUser.mutate({ userId });
    }
  };

  const handleAddStrike = (user: any) => {
    setSelectedUser(user);
    setShowStrikeModal(true);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-white">Gestión de Usuarios</h2>
          <p className="text-white/70">
            Administra todos los usuarios de la plataforma. Puedes agregar strikes o eliminar cuentas.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, username o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
        />
      </div>

      {isLoadingUsers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <UserIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron usuarios que coincidan con la búsqueda" : "No hay usuarios registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/20 shrink-0">
                      <img
                        src={user.imageUrl || "/user-placeholder.svg"}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg line-clamp-1">{user.name}</CardTitle>
                        {user.isAdmin && (
                          <div className="h-5 w-5 rounded-full bg-[#5ADBFD] flex items-center justify-center">
                            <ShieldCheckIcon className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      {user.username && (
                        <CardDescription>@{user.username}</CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={user.isAdmin ? "default" : "secondary"} className={user.isAdmin ? "bg-[#5ADBFD] text-black hover:bg-[#5ADBFD]/90" : ""}>
                          {user.isAdmin ? "Admin" : "Usuario"}
                        </Badge>
                        <Badge variant={user.canMonetize ? "default" : "secondary"} className={user.canMonetize ? "bg-green-500 hover:bg-green-600" : ""}>
                          {user.canMonetize ? "Monetización" : "Sin Monetización"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* User Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Se unió: <TimeAgo date={user.createdAt} /></span>
                      </div>
                      {user.channel && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="h-4 w-4" />
                          <span>Canal: {user.channel.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddStrike(user)}
                        className="flex-1 border-yellow-500/70 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 hover:text-yellow-300 transition-colors"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Strike
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={deleteUser.isPending}
                        className="flex-1 border-red-500/70 text-red-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <InfiniteScroll
            isManual
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </div>
      )}

      {/* Add Strike Modal */}
      {selectedUser && (
        <AddStrikeModal
          open={showStrikeModal}
          onOpenChange={setShowStrikeModal}
          user={selectedUser}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: [["admin"], "getUsers"] });
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

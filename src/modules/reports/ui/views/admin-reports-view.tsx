"use client";

import { api } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheckIcon, AlertTriangle, Video, User, Calendar, Search, X, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ReportModerationDialog } from "../components/report-moderation-dialog";

export const AdminReportsView = () => {
  const router = useRouter();

  // Estados para filtros
  const [videoIdFilter, setVideoIdFilter] = useState<string>("");
  const [userIdFilter, setUserIdFilter] = useState<string>("");

  // Verificar si el usuario es admin
  const { data: isAdmin, isLoading: isLoadingAdmin } = api.users.isAdmin.useQuery();

  // Si no es admin, redirigir
  useEffect(() => {
    if (!isLoadingAdmin && !isAdmin) {
      toast.error("No tienes permisos para acceder a esta página");
      router.push("/");
    }
  }, [isAdmin, isLoadingAdmin, router]);

  // Obtener estadísticas de reportes
  const { data: stats, isLoading: isLoadingStats } = api.reports.getStats.useQuery(
    undefined,
    {
      enabled: !!isAdmin,
    }
  );

  // Obtener reportes con filtros
  const {
    data: reportsData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingReports,
  } = api.reports.getAll.useInfiniteQuery(
    {
      limit: 20,
      videoId: videoIdFilter || undefined,
      userId: userIdFilter || undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!isAdmin,
    }
  );

  // Limpiar filtros
  const clearFilters = () => {
    setVideoIdFilter("");
    setUserIdFilter("");
  };

  const hasActiveFilters = videoIdFilter || userIdFilter;

  if (isLoadingAdmin) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdmin) {
    return <div></div>; // El useEffect redirigirá, pero necesitamos retornar un elemento válido
  }

  const reports = reportsData?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-8 w-8 text-[#5ADBFD]" />
        <h1 className="text-3xl font-bold text-white">Panel de Reportes</h1>
      </div>

      {/* Estadísticas */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-[#5ADBFD]" />
                Total de Reportes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats?.totalReports || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Video className="h-5 w-5 text-[#5ADBFD]" />
                Videos Reportados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats?.uniqueVideoReports || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-[#5ADBFD]" />
                Usuarios que Reportaron
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats?.uniqueUserReports || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-white/70">Filtra los reportes por video o usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="videoId" className="text-white">ID del Video</Label>
              <div className="flex gap-2">
                <Input
                  id="videoId"
                  placeholder="UUID del video"
                  value={videoIdFilter}
                  onChange={(e) => setVideoIdFilter(e.target.value)}
                />
                {videoIdFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setVideoIdFilter("")}
                    className="text-white/70 hover:text-[#5ADBFD] hover:bg-[#5ADBFD]/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-white">ID del Usuario</Label>
              <div className="flex gap-2">
                <Input
                  id="userId"
                  placeholder="UUID del usuario"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                />
                {userIdFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUserIdFilter("")}
                    className="text-white/70 hover:text-[#5ADBFD] hover:bg-[#5ADBFD]/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters} className="border-[#5ADBFD]/30 text-white hover:bg-[#5ADBFD]/10 hover:text-[#5ADBFD]">
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de reportes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Reportes</CardTitle>
          <CardDescription className="text-white/70">
            Lista de todos los reportes de videos {hasActiveFilters && "(filtrados)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? "No se encontraron reportes con los filtros aplicados"
                  : "No hay reportes registrados"}
              </p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {reports.map((report) => {
                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case "pending":
                        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">Pendiente</Badge>;
                      case "valid":
                        return <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">Válido</Badge>;
                      case "invalid":
                        return <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50">Inválido</Badge>;
                      case "resolved":
                        return <Badge variant="outline" className="bg-[#5ADBFD]/20 text-[#5ADBFD] border-[#5ADBFD]/50">Resuelto</Badge>;
                      default:
                        return <Badge variant="outline" className="border-white/20 text-white/70">{status}</Badge>;
                    }
                  };

                  const getBorderColor = (status: string) => {
                    switch (status) {
                      case "pending":
                        return "border-l-yellow-500";
                      case "valid":
                        return "border-l-green-500";
                      case "invalid":
                        return "border-l-red-500";
                      case "resolved":
                        return "border-l-blue-500";
                      default:
                        return "border-l-orange-500";
                    }
                  };

                  return (
                    <Card key={report.id} className={`border-l-4 ${getBorderColor(report.status || "pending")}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(report.status || "pending")}
                            {report.adminAction && (
                              <Badge variant="secondary" className="text-xs border-white/20 text-white/70 bg-white/5">
                                {report.adminAction.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>
                          <ReportModerationDialog report={report as any} />
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                        {/* Información del video */}
                        {report.video && (
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              {report.video.thumbnailUrl && (
                                <div className="relative w-24 h-16 rounded overflow-hidden bg-muted shrink-0">
                                  <Image
                                    src={report.video.thumbnailUrl}
                                    alt={report.video.title || "Video"}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Video className="h-4 w-4 text-[#5ADBFD] shrink-0" />
                                  <Link
                                    href={`/video/${report.video.id}`}
                                    className="font-semibold hover:underline line-clamp-1 text-white hover:text-[#5ADBFD]"
                                  >
                                    {report.video.title || "Sin título"}
                                  </Link>
                                </div>
                                <p className="text-sm text-white/70 mb-1">
                                  Video ID: {report.videoId}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Información del usuario que reporta */}
                        {report.user && (
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                                <Image
                                  src={report.user.imageUrl || "/user-placeholder.svg"}
                                  alt={report.user.name || "Usuario"}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-[#5ADBFD] shrink-0" />
                                  <span className="font-semibold text-white">
                                    {report.user.name || "Usuario desconocido"}
                                  </span>
                                </div>
                                {report.user.username && (
                                  <p className="text-sm text-white/70 mb-1">
                                    @{report.user.username}
                                  </p>
                                )}
                                <p className="text-sm text-white/70">
                                  Usuario ID: {report.userId}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Razón del reporte */}
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-[#5ADBFD] shrink-0 mt-1" />
                            <div className="flex-1">
                              <Label className="text-sm font-semibold mb-1 block text-white">Razón del Reporte</Label>
                              <p className="text-sm whitespace-pre-wrap break-words text-white/90">{report.reason}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-white/70">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Creado {formatDistanceToNow(new Date(report.createdAt), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                            </div>
                            {report.reviewedAt && (
                              <div className="flex items-center gap-2 text-xs text-white/70">
                                <ShieldCheckIcon className="h-3 w-3" />
                                <span>
                                  Revisado {formatDistanceToNow(new Date(report.reviewedAt), {
                                    addSuffix: true,
                                    locale: es,
                                  })}
                                  {report.reviewer && ` por ${report.reviewer.name}`}
                                </span>
                              </div>
                            )}
                            {report.adminNotes && (
                              <div className="mt-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded text-xs text-white/90">
                                <strong>Notas del admin:</strong> {report.adminNotes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
              <InfiniteScroll
                isManual
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


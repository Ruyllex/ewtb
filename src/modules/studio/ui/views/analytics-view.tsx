"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp, VideoIcon, UsersIcon, ClockIcon, EyeIcon } from "lucide-react";
import { THUMBNAIL_FALLBACK } from "@/modules/videos/constants";

import { api } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn, normalizeImage } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

const formatWatchTime = (minutes: number) => {
  if (minutes >= 60) {
    return `${numberFormatter.format(minutes / 60)} h`;
  }
  return `${numberFormatter.format(minutes)} min`;
};

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${numberFormatter.format(value)}%`;
};

export const AnalyticsView = () => {
  const { data, isLoading } = api.studio.getAnalytics.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !data) {
    return <AnalyticsViewSkeleton />;
  }

  const { summary, timeline, topVideos } = data;

  const last48hViews = useMemo(
    () => timeline.slice(-2).reduce((acc, day) => acc + day.views, 0),
    [timeline]
  );

  const maxViews = Math.max(...timeline.map((day) => day.views), 5);

  const metrics = [
    {
      label: "Visualizaciones",
      value: numberFormatter.format(summary.totalViews),
      helper: `${formatPercentage(summary.viewsChangePercent)} en los últimos 7 días`,
      icon: <EyeIcon className="size-5 text-primary" />,
    },
    {
      label: "Tiempo de visualización",
      value: formatWatchTime(summary.totalWatchTimeMinutes),
      helper: `${numberFormatter.format(summary.averageViewDurationSeconds)} seg promedio`,
      icon: <ClockIcon className="size-5 text-primary" />,
    },
    {
      label: "Suscriptores",
      value: numberFormatter.format(summary.totalSubscribers),
      helper: `${numberFormatter.format(summary.totalLikes)} likes totales`,
      icon: <UsersIcon className="size-5 text-primary" />,
    },
    {
      label: "Videos publicados",
      value: numberFormatter.format(summary.totalVideos),
      helper: `${numberFormatter.format(summary.totalComments)} comentarios`,
      icon: <VideoIcon className="size-5 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Últimos 14 días</p>
          <h1 className="text-3xl font-semibold tracking-tight">Estadísticas del canal</h1>
        </div>
        <Link href="/studio" className={cn(buttonVariants({ variant: "outline" }))}>
          Volver al panel
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border/60 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="size-5 text-primary" />
              Evolución de visualizaciones
            </CardTitle>
            <CardDescription>Actividad diaria durante los últimos 14 días.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => numberFormatter.format(value)}
                  domain={[0, maxViews]}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--muted))" }}
                  contentStyle={{ background: "#0f1115", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}
                  formatter={(value: number) => [`${numberFormatter.format(value)} vistas`, ""]}
                />
                <Line type="monotone" dataKey="views" stroke="var(--chart-1, #ff2056)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle>Tiempo real</CardTitle>
            <CardDescription>Estimación de las últimas 48 horas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-white/20 p-4">
              <p className="text-sm text-muted-foreground">Visualizaciones (48 h)</p>
              <p className="text-3xl font-semibold">{numberFormatter.format(last48hViews)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Promedio diario</span>
                <span>{numberFormatter.format(summary.totalViews / 14)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duración media</span>
                <span>{numberFormatter.format(summary.averageViewDurationSeconds)} seg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Likes totales</span>
                <span>{numberFormatter.format(summary.totalLikes)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Videos destacados</CardTitle>
          <CardDescription>Top 5 videos por visualizaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          {topVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay suficiente actividad.</p>
          ) : (
            <div className="space-y-4">
              {topVideos.map((video) => (
                <div key={video.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-white/20">
                      <Image
                        src={normalizeImage(video.thumbnailUrl) || THUMBNAIL_FALLBACK}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.createdAt).toLocaleDateString()} · {numberFormatter.format(video.likes)} likes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{numberFormatter.format(video.views)}</p>
                    <p className="text-xs text-muted-foreground">visualizaciones</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AnalyticsViewSkeleton = () => {
  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border border-border/60 bg-card/80">
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Card className="h-[360px] border border-border/60 bg-card/80">
          <CardContent className="h-full">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/80">
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border border-border/60 bg-card/80">
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

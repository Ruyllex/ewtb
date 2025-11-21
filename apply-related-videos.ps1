$file = "src\modules\videos\ui\views\video-view.tsx"
$content = Get-Content $file -Raw

# 1. Add import
$content = $content -replace '(import { CommentsSection } from "@/modules/comments/ui/components/comments-section";)', "`$1`r`nimport { VideoCard } from `"../components/video-card`";"

# 2. Add related videos query
$oldPattern = '  \}\);\r?\n\r?\n  // Si está cargando, mostrar skeleton'
$newQuery = @"
  });

  // Fetch related videos from the same category
  const { data: relatedVideosData } = trpc.videos.getMany.useQuery(
    {
      categoryId: video?.categoryId ?? undefined,
      limit: 10,
    },
    {
      enabled: !!video?.categoryId,
    }
  );

  // Filter out the current video from related videos  
  const relatedVideos = relatedVideosData?.items.filter(v => v.id !== videoId) ?? [];

  // Si está cargando, mostrar skeleton
"@
$content = $content -replace $oldPattern, $newQuery

# 3. Replace sidebar
$oldSidebar = @'
          {/\* Sidebar - Related videos \(placeholder\) \*/}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4">
              <h2 className="text-lg font-semibold text-white">Videos relacionados</h2>
              <p className="mt-2 text-sm text-white/70">Related videos coming soon\.\.\.</p>
            </div>
          </aside>
'@

$newSidebar = @'
          {/* Sidebar - Related videos */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Videos relacionados</h2>
              {relatedVideos.length > 0 ? (
                <div className="space-y-4">
                  {relatedVideos.map((relatedVideo) => (
                    <VideoCard
                      key={relatedVideo.id}
                      id={relatedVideo.id}
                      title={relatedVideo.title}
                      description={relatedVideo.description}
                      thumbnailUrl={relatedVideo.thumbnailUrl}
                      previewUrl={relatedVideo.previewUrl}
                      duration={relatedVideo.duration}
                      createdAt={relatedVideo.createdAt}
                      likes={relatedVideo.likes}
                      viewCount={relatedVideo.viewCount}
                      channel={relatedVideo.channel}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/70">No hay videos relacionados disponibles.</p>
              )}
            </div>
          </aside>
'@

$content = $content -replace [regex]::Escape($oldSidebar), $newSidebar

# Save
$content | Set-Content $file -NoNewline

Write-Host "Cambios aplicados exitosamente!" -ForegroundColor Green

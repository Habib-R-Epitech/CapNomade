import { Card } from '@/components/ui/card';
import { ExternalLink, Youtube, Link as LinkIcon } from 'lucide-react';

interface MediaLink {
  id: string;
  url: string;
  kind: string;
  title: string | null;
  thumbnail_url: string | null;
}

function extractYoutubeId(url: string): string | null {
  const m =
    url.match(/youtu\.be\/([\w-]{6,})/) ??
    url.match(/[?&]v=([\w-]{6,})/) ??
    url.match(/youtube\.com\/embed\/([\w-]{6,})/);
  return m?.[1] ?? null;
}

export function TripMedia({
  links,
  canEdit: _canEdit,
}: {
  tripId: string;
  links: MediaLink[];
  canEdit: boolean;
}) {
  const videos = links.filter((l) => l.kind === 'youtube_video' || l.kind === 'youtube_playlist');
  const others = links.filter((l) => !l.kind.startsWith('youtube_'));

  return (
    <div className="space-y-6">
      {videos.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-serif text-lg font-semibold">Vidéos & playlists</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((v) => {
              const id = extractYoutubeId(v.url);
              return (
                <Card key={v.id} className="overflow-hidden">
                  {id ? (
                    <div className="aspect-video">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}`}
                        title={v.title ?? 'Vidéo YouTube'}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="size-full"
                      />
                    </div>
                  ) : (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex aspect-video items-center justify-center bg-muted"
                    >
                      <Youtube className="size-8 text-muted-foreground" />
                    </a>
                  )}
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-medium">{v.title ?? v.url}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-serif text-lg font-semibold">Liens & documents</h3>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun lien ajouté.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {others.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <span className="inline-flex items-center gap-2">
                    <LinkIcon className="size-4 text-muted-foreground" />
                    {l.title ?? l.url}
                  </span>
                  <ExternalLink className="size-4 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

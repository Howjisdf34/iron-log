"use client";

import { useEffect, useRef } from "react";
import { Info } from "lucide-react";
import type { PlayerMedia } from "@/server/workout/player-data";

interface ExerciseCardProps {
  exerciseName: string;
  media: PlayerMedia | null;
  instructions: string[];
  onOpenDetail: () => void;
}

/**
 * Video en loop, autoplay, muted, playsInline. Se pausa fuera del
 * viewport (IntersectionObserver) o con la pestaña oculta — no quemar
 * batería (CLAUDE.md §5.3).
 */
export function ExerciseCard({
  exerciseName,
  media,
  instructions,
  onOpenDetail,
}: ExerciseCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && document.visibilityState === "visible") {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(container);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void video?.play().catch(() => {});
      else video?.pause();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const hasVideo = media?.videoWebm || media?.videoMp4;

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={onOpenDetail}
        className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-muted"
        aria-label={`Ver detalle de ${exerciseName}`}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            poster={media?.poster ?? undefined}
            className="size-full object-cover"
          >
            {media?.videoWebm ? <source src={media.videoWebm} type="video/webm" /> : null}
            {media?.videoMp4 ? <source src={media.videoMp4} type="video/mp4" /> : null}
          </video>
        ) : media?.animatedFallback ? (
          // eslint-disable-next-line @next/next/no-img-element -- webp animado servido desde /media, no pasa por next/image
          <img
            src={media.animatedFallback}
            alt=""
            className="size-full object-cover"
            loading="eager"
          />
        ) : instructions.length > 0 ? (
          <div className="flex size-full flex-col justify-center gap-1 overflow-hidden bg-muted/50 p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground">
              Sin video — cómo se hace
            </p>
            <ol className="list-decimal space-y-0.5 pl-4 text-sm text-foreground">
              {instructions.slice(0, 3).map((step, i) => (
                <li key={i} className="line-clamp-2">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Sin video disponible
          </div>
        )}
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs text-foreground backdrop-blur">
          <Info className="size-3.5" /> Cómo se hace
        </span>
      </button>
    </div>
  );
}

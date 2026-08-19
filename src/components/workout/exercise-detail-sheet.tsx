"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PlayerMedia } from "@/server/workout/player-data";

interface ExerciseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  media: PlayerMedia | null;
  instructionsEs: string[];
}

const SPEEDS = [0.5, 1] as const;

/** Bottom sheet a pantalla completa: "lo necesario, no un tutorial eterno" (CLAUDE.md §5.3). */
export function ExerciseDetailSheet({
  open,
  onOpenChange,
  exerciseName,
  media,
  instructionsEs,
}: ExerciseDetailSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const hasVideo = media?.videoWebm || media?.videoMp4;

  function handleSpeed(next: (typeof SPEEDS)[number]) {
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 left-0 max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl">
        <DialogHeader>
          <DialogTitle>{exerciseName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasVideo ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                autoPlay
                poster={media?.poster ?? undefined}
                className="size-full object-cover"
              >
                {media?.videoWebm ? (
                  <source src={media.videoWebm} type="video/webm" />
                ) : null}
                {media?.videoMp4 ? (
                  <source src={media.videoMp4} type="video/mp4" />
                ) : null}
              </video>
            </div>
          ) : media?.animatedFallback ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- webp animado servido desde /media */}
              <img
                src={media.animatedFallback}
                alt=""
                className="size-full object-cover"
              />
            </div>
          ) : null}

          {hasVideo ? (
            <div className="flex gap-2">
              {SPEEDS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={speed === s ? "default" : "outline"}
                  onClick={() => handleSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          ) : null}

          {instructionsEs.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
              {instructionsEs.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin instrucciones detalladas todavía.
            </p>
          )}

          {media?.attribution ? (
            <p className="text-xs text-muted-foreground">Video: {media.attribution}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

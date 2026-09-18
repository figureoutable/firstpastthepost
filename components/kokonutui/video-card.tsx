"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface VideoCardHandle {
  play: () => void;
  pause: () => void;
}

export interface VideoCardProps {
  src: string;
  /** Start playback from this time (seconds). Defaults to 0. */
  startAt?: number;
  className?: string;
}

export const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(
  function VideoCard({ src, startAt = 0, className }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const seekToStart = () => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = startAt;
    };

    const play = () => {
      const video = videoRef.current;
      if (!video) return;
      seekToStart();
      video.play().catch(() => {});
    };

    const pause = () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      seekToStart();
    };

    useImperativeHandle(ref, () => ({ play, pause }));

    return (
      <div
        className={cn(
          "relative block min-h-[156px] w-full select-none overflow-hidden bg-white",
          className
        )}
      >
        <video
          ref={videoRef}
          className="block h-full min-h-[156px] w-full object-contain object-bottom"
          src={src}
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={seekToStart}
        />
      </div>
    );
  }
);

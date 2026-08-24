"use client";

import { memo } from "react";

interface TrackAnnouncerProps {
  title?: string | null;
  artist?: string | null;
}

/**
 * Screen-reader-only live region announcing the current track. Scoped to a
 * single sentence so assistive tech isn't flooded by unrelated card updates
 * (progress ticks, reaction counts, etc).
 */
export const TrackAnnouncer = memo(function TrackAnnouncer({
  title,
  artist,
}: TrackAnnouncerProps) {
  if (!title) return null;
  return (
    <div role="status" className="sr-only">
      {`Now playing ${title}${artist ? ` by ${artist}` : ""}`}
    </div>
  );
});

import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";

export const CursorOverlay = ({
  network,
  children,
}: {
  network: any;
  children: React.ReactNode;
}) => {
  const { players } = useGameStore();
  const [cursors, setCursors] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const lastMoveTime = useRef(0);

  // Detect mobile devices (touch screens)
  const isMobile = window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const handleRemoteCursor = (e: Event) => {
      const { userId, x, y } = (e as CustomEvent).detail;
      setCursors((prev) => ({ ...prev, [userId]: { x, y } }));
    };

    window.addEventListener("peer-cursor-move", handleRemoteCursor);
    return () =>
      window.removeEventListener("peer-cursor-move", handleRemoteCursor);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile) return; // Do not track or send mouse movements on mobile

    const now = Date.now();
    if (now - lastMoveTime.current > 50) {
      // Throttle to 20 frames per second
      lastMoveTime.current = now;

      // Calculate percentage position so it scales across different screen sizes
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      // Send directly to the host
      network.sendToHost({ type: "CURSOR_MOVE", payload: { x, y } });
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-screen overflow-hidden"
    >
      {children}

      {/* Render Remote Cursors */}
      {!isMobile &&
        Object.entries(cursors).map(([userId, pos]) => {
          const player = players[userId];
          if (!player) return null;

          return (
            <div
              key={userId}
              className="absolute pointer-events-none z-50 flex items-center gap-2 transition-all duration-75 ease-linear"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={player.color}
                stroke="white"
                strokeWidth="2"
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
              <span
                className="px-2 py-1 rounded-md text-xs text-white shadow-md font-semibold"
                style={{ backgroundColor: player.color }}
              >
                {player.name}
              </span>
            </div>
          );
        })}
    </div>
  );
};

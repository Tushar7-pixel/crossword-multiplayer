import { useEffect, useState } from 'react';

export type DiscoveredRoom = {
    hostId: string;
    hostName: string;
    lastSeen: number;
};

export const useRoomDiscovery = (isHost: boolean, hostId: string, hostName: string) => {
    const [activeRooms, setActiveRooms] = useState<DiscoveredRoom[]>([]);

    useEffect(() => {
        const channel = new BroadcastChannel('crossword_room_discovery');

        // 1. If this player is the Host, broadcast heartbeat every 2 seconds
        let interval: any;
        if (isHost && hostId && hostName) {
            const broadcast = () => {
                channel.postMessage({
                    type: 'ANNOUNCE_ROOM',
                    payload: { hostId, hostName, lastSeen: Date.now() },
                });
            };

            broadcast();
            interval = setInterval(broadcast, 2000);
        }

        // 2. Listen for announcements from any other Hosts
        channel.onmessage = (event) => {
            if (event.data?.type === 'ANNOUNCE_ROOM') {
                const room: DiscoveredRoom = event.data.payload;

                // Ignore our own room
                if (room.hostId === hostId) return;

                setActiveRooms((prev) => {
                    const filtered = prev.filter((r) => r.hostId !== room.hostId);
                    return [...filtered, room];
                });
            }
        };

        // 3. Purge rooms that haven't sent a heartbeat in 4 seconds
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setActiveRooms((prev) => prev.filter((r) => now - r.lastSeen < 4000));
        }, 2000);

        return () => {
            clearInterval(interval);
            clearInterval(cleanupInterval);
            channel.close();
        };
    }, [isHost, hostId, hostName]);

    return { activeRooms };
};
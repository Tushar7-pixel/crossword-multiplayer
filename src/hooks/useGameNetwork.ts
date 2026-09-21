import { useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { useGameStore } from '../store/gameStore';
import type { SocketAction } from '../types/game';

const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export const useGameNetwork = () => {
    const [peerId, setPeerId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    const hostConnectionRef = useRef<DataConnection | null>(null);

    const { setGameState, addPlayer } = useGameStore();

    // Initialize a new Peer
    const initPeer = () => {
        const peer = new Peer();
        peer.on('open', (id) => {
            setPeerId(id);
            peerRef.current = peer;
        });
        return peer;
    };

    // 1. Host a new game
    const hostGame = (playerName: string) => {
        setIsHost(true);
        const peer = initPeer();

        // Add Host to the store
        peer.on('open', (id) => {
            addPlayer({ id, name: playerName, color: PLAYER_COLORS[0], score: 0, isHost: true });
        });

        // Listen for incoming peer connections
        peer.on('connection', (conn) => {
            conn.on('open', () => {
                connectionsRef.current.push(conn);

                conn.on('data', (data) => {
                    handleIncomingAction(data as SocketAction, conn.peer);
                });
            });
        });
    };

    // 2. Join an existing game
    const joinGame = (hostId: string, playerName: string) => {
        const peer = initPeer();

        peer.on('open', () => {
            const conn = peer.connect(hostId);
            hostConnectionRef.current = conn;

            conn.on('open', () => {
                // Tell the host who we are
                conn.send({ type: 'JOIN_LOBBY', payload: { name: playerName } });
            });

            conn.on('data', (data) => {
                const action = data as SocketAction;
                if (action.type === 'SYNC_STATE') {
                    setGameState(action.payload);
                }
                // Add CURSOR_MOVE handling here later
            });
        });
    };

    // 3. Centralized action handler (Host Authority)
    const handleIncomingAction = (action: SocketAction, senderId: string) => {
        const state = useGameStore.getState();

        switch (action.type) {
            case 'JOIN_LOBBY':
                const colorIndex = Object.keys(state.players).length % PLAYER_COLORS.length;
                addPlayer({
                    id: senderId,
                    name: action.payload.name,
                    color: PLAYER_COLORS[colorIndex],
                    score: 0,
                    isHost: false
                });
                // Broadcast the new roster to everyone
                broadcastState();
                break;

            case 'WORD_FOUND':
                const { word, cells } = action.payload;
                const isValidWord = state.wordsToFind.includes(word);
                const isAlreadyFound = !!state.foundWords[word];

                if (isValidWord && !isAlreadyFound) {
                    useGameStore.getState().markWordFound(word, senderId, cells);
                    useGameStore.getState().updatePlayerScore(senderId, 10);

                    // --- NEW: Check for Round Completion ---
                    const updatedState = useGameStore.getState();
                    const allWordsFound = Object.keys(updatedState.foundWords).length === updatedState.wordsToFind.length;

                    if (allWordsFound) {
                        if (updatedState.currentRound < updatedState.totalRounds) {
                            // Transition to next round, clear board state
                            useGameStore.getState().setGameState({
                                currentRound: updatedState.currentRound + 1,
                                foundWords: {},
                                foundCells: {},
                                // TODO: generateNewGridAndWords() would be called here
                            });
                        } else {
                            // End of session, show scoreboard
                            useGameStore.getState().setGameState({ status: 'scoreboard' });
                        }
                    }

                    broadcastState();
                }
                break;
            case 'CURSOR_MOVE':
                // 1. If we are the Host, relay this movement to all OTHER peers
                if (isHost) {
                    connectionsRef.current.forEach(conn => {
                        if (conn.peer !== senderId) {
                            conn.send({
                                type: 'CURSOR_MOVE',
                                payload: { ...action.payload, userId: senderId }
                            });
                        }
                    });
                }

                // 2. Everyone (Host & Peers) fires a local event to update the UI instantly
                window.dispatchEvent(new CustomEvent('peer-cursor-move', {
                    detail: {
                        userId: action.payload.userId || senderId,
                        x: action.payload.x,
                        y: action.payload.y
                    }
                }));
                break;

        }
    };

    // Broadcast master state to all peers (Host only)
    const broadcastState = () => {
        if (!isHost) return;
        const currentState = useGameStore.getState();
        connectionsRef.current.forEach(conn => {
            conn.send({ type: 'SYNC_STATE', payload: currentState });
        });
    };

    // Send action to Host (Client only)
    const sendToHost = (action: SocketAction) => {
        if (hostConnectionRef.current) {
            hostConnectionRef.current.send(action);
        }
    };

    return { peerId, isHost, hostGame, joinGame, sendToHost, broadcastState };
};
import { useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { useGameStore } from '../store/gameStore';
import type { SocketAction, GameSettings } from '../types/game';
import { toast } from '../store/toastStore';
import { soundFx } from '../lib/audioFx';

const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

// Free public STUN and OpenRelay TURN servers to bypass cellular firewalls
const PEER_CONFIG = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },
        ],
    },
};

export const useGameNetwork = () => {
    const [peerId, setPeerId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

    const isHostRef = useRef(false);
    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    const hostConnectionRef = useRef<DataConnection | null>(null);

    const { setGameState, updateSettings, addPlayer, removePlayer } = useGameStore();

    const hostGame = (playerName: string) => {
        setIsHost(true);
        isHostRef.current = true;
        setConnectionStatus('connecting');

        if (peerRef.current) peerRef.current.destroy();
        const peer = new Peer(PEER_CONFIG);

        peer.on('open', (id) => {
            setPeerId(id);
            peerRef.current = peer;
            setConnectionStatus('connected');
            addPlayer({
                id,
                name: playerName,
                color: PLAYER_COLORS[0],
                score: 0,
                isHost: true,
            });
        });

        peer.on('connection', (conn) => {
            conn.on('open', () => {
                connectionsRef.current.push(conn);

                conn.on('data', (data) => {
                    handleIncomingAction(data as SocketAction, conn);
                });

                conn.on('close', () => {
                    connectionsRef.current = connectionsRef.current.filter((c) => c.peer !== conn.peer);
                    removePlayer(conn.peer);
                    broadcastState();
                    window.dispatchEvent(
                        new CustomEvent('peer-cursor-move', {
                            detail: { userId: conn.peer, x: -100, y: -100 },
                        })
                    );
                });
            });
        });

        peer.on('error', (err) => {
            console.error('Peer host error:', err);
            toast(`Network error: ${err.type}`, 'error');
            setConnectionStatus('error');
        });
    };

    const joinGame = (hostId: string, playerName: string, onSuccess?: () => void) => {
        setIsHost(false);
        isHostRef.current = false;
        setConnectionStatus('connecting');

        if (peerRef.current) peerRef.current.destroy();
        const peer = new Peer(PEER_CONFIG);

        const connectionTimeout = setTimeout(() => {
            if (connectionStatus !== 'connected') {
                toast('Connection timed out. Ensure host is online and room code is correct.', 'error');
                setConnectionStatus('error');
            }
        }, 12000);

        peer.on('open', (id) => {
            setPeerId(id);
            peerRef.current = peer;

            const cleanHostId = hostId.trim();
            const conn = peer.connect(cleanHostId, { reliable: true });
            hostConnectionRef.current = conn;

            conn.on('open', () => {
                clearTimeout(connectionTimeout);
                setConnectionStatus('connected');
                conn.send({ type: 'JOIN_LOBBY', payload: { name: playerName } });
                if (onSuccess) onSuccess();
            });

            conn.on('data', (data) => {
                const action = data as SocketAction;
                if (action.type === 'SYNC_STATE') {
                    setGameState(action.payload);
                } else if (action.type === 'CURSOR_MOVE') {
                    window.dispatchEvent(
                        new CustomEvent('peer-cursor-move', {
                            detail: {
                                userId: action.payload.userId,
                                x: action.payload.x,
                                y: action.payload.y,
                            },
                        })
                    );
                }
            });

            conn.on('close', () => {
                toast('Disconnected from Host', 'error');
                setConnectionStatus('idle');
                useGameStore.getState().resetSession();
            });

            conn.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error('Connection error:', err);
                toast('Failed to connect to host.', 'error');
                setConnectionStatus('error');
            });
        });

        peer.on('error', (err) => {
            clearTimeout(connectionTimeout);
            console.error('Peer error:', err);
            if (err.type === 'peer-unavailable') {
                toast('Room not found or Host is offline.', 'error');
            } else {
                toast(`Network error: ${err.type}`, 'error');
            }
            setConnectionStatus('error');
        });
    };

    const handleIncomingAction = (action: SocketAction, senderConn: DataConnection) => {
        const senderId = senderConn.peer;
        const state = useGameStore.getState();

        switch (action.type) {
            case 'JOIN_LOBBY': {
                const colorIndex = Object.keys(state.players).length % PLAYER_COLORS.length;
                addPlayer({
                    id: senderId,
                    name: action.payload.name,
                    color: PLAYER_COLORS[colorIndex],
                    score: 0,
                    isHost: false,
                });

                setTimeout(() => {
                    broadcastState();
                }, 50);
                break;
            }

            case 'UPDATE_SETTINGS': {
                updateSettings(action.payload);
                broadcastState();
                break;
            }
            case 'REMATCH_GAME': {
                if (isHostRef.current) {
                    useGameStore.getState().startRematch();
                    broadcastState();
                }
                break;
            }
            case 'WORD_FOUND': {
                const { word, cells } = action.payload;
                const isValidWord = state.wordsToFind.includes(word);
                const isAlreadyFound = !!state.foundWords[word];

                if (isValidWord && !isAlreadyFound) {
                    const points = word === state.goldenWord ? 5 : 2;
                    useGameStore.getState().markWordFound(word, senderId, cells);
                    useGameStore.getState().updatePlayerScore(senderId, points);

                    broadcastState();

                    const updatedState = useGameStore.getState();
                    const allWordsFound =
                        Object.keys(updatedState.foundWords).length === updatedState.wordsToFind.length;

                    if (allWordsFound) {
                        setTimeout(() => {
                            if (updatedState.currentRound < updatedState.totalRounds) {
                                soundFx.playLevelComplete();
                                useGameStore.getState().generateNewRound(updatedState.currentRound + 1);
                            } else {
                                soundFx.playLevelComplete();
                                useGameStore.getState().setGameState({ status: 'scoreboard' });
                            }
                            broadcastState();
                        }, 800);
                    }
                }
                break;
            }

            case 'CURSOR_MOVE': {
                if (isHostRef.current) {
                    connectionsRef.current.forEach((conn) => {
                        if (conn.peer !== senderId && conn.open) {
                            conn.send({
                                type: 'CURSOR_MOVE',
                                payload: { ...action.payload, userId: senderId },
                            });
                        }
                    });
                }

                window.dispatchEvent(
                    new CustomEvent('peer-cursor-move', {
                        detail: {
                            userId: action.payload.userId || senderId,
                            x: action.payload.x,
                            y: action.payload.y,
                        },
                    })
                );
                break;
            }
        }
    };

    const broadcastState = () => {
        if (!isHostRef.current) return;
        const {
            status, currentRound, totalRounds, categories, wordsPerRound, theme,
            players, board, wordsToFind, goldenWord, foundWords, foundCells, foundLines,
        } = useGameStore.getState();

        const safeState = {
            status, currentRound, totalRounds, categories, wordsPerRound, theme,
            players, board, wordsToFind, goldenWord, foundWords, foundCells, foundLines,
        };

        connectionsRef.current.forEach((conn) => {
            if (conn.open) {
                conn.send({ type: 'SYNC_STATE', payload: safeState });
            }
        });
    };

    const sendToHost = (action: SocketAction) => {
        if (isHostRef.current) {
            handleIncomingAction(action, { peer: peerRef.current?.id || 'local-player' } as DataConnection);
        } else if (hostConnectionRef.current && hostConnectionRef.current.open) {
            hostConnectionRef.current.send(action);
        }
    };
    const triggerRematch = () => {
        if (isHostRef.current) {
            useGameStore.getState().startRematch();
            broadcastState();
        } else {
            sendToHost({ type: 'REMATCH_GAME' });
        }
    };
    const broadcastSettingsChange = (newSettings: Partial<GameSettings>) => {
        updateSettings(newSettings);
        if (isHostRef.current) {
            broadcastState();
        } else {
            sendToHost({ type: 'UPDATE_SETTINGS', payload: newSettings });
        }
    };

    const kickPlayer = (playerId: string) => {
        if (!isHostRef.current) return;
        const conn = connectionsRef.current.find((c) => c.peer === playerId);
        if (conn) {
            conn.close();
            connectionsRef.current = connectionsRef.current.filter((c) => c.peer !== playerId);
        }
        useGameStore.getState().removePlayer(playerId);
        broadcastState();
    };

    return {
        peerId,
        isHost,
        connectionStatus,
        hostGame,
        joinGame,
        sendToHost,
        broadcastState,
        broadcastSettingsChange,
        kickPlayer, triggerRematch
    };
};
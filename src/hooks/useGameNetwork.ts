import { useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { useGameStore } from '../store/gameStore';
import type { SocketAction, GameSettings } from '../types/game';
import { toast } from '../store/toastStore';
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export const useGameNetwork = () => {
    const [peerId, setPeerId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const isHostRef = useRef(false);
    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    const hostConnectionRef = useRef<DataConnection | null>(null);

    const { setGameState, updateSettings, addPlayer, removePlayer } = useGameStore();

    const hostGame = (playerName: string) => {
        setIsHost(true);
        isHostRef.current = true;
        const peer = new Peer();

        peer.on('open', (id) => {
            setPeerId(id);
            peerRef.current = peer;
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
    };

    const joinGame = (hostId: string, playerName: string) => {
        setIsHost(false);
        isHostRef.current = false;
        const peer = new Peer();

        peer.on('open', (id) => {
            setPeerId(id);
            peerRef.current = peer;

            const conn = peer.connect(hostId.trim(), { reliable: true });
            hostConnectionRef.current = conn;

            conn.on('open', () => {
                conn.send({ type: 'JOIN_LOBBY', payload: { name: playerName } });
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
                useGameStore.getState().resetSession();
            });
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
                // Any player can request a settings change
                updateSettings(action.payload);
                broadcastState();
                break;
            }

            case 'WORD_FOUND': {
                const { word, cells } = action.payload;
                const isValidWord = state.wordsToFind.includes(word);
                const isAlreadyFound = !!state.foundWords[word];

                if (isValidWord && !isAlreadyFound) {
                    // 5 points for Golden Word, 2 points for regular words
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
                                useGameStore.getState().generateNewRound(updatedState.currentRound + 1);
                            } else {
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

    // Inside src/hooks/useGameNetwork.ts:

    const broadcastState = () => {
        if (!isHostRef.current) return;
        const {
            status, currentRound, totalRounds, categories, wordsPerRound, theme,
            players, board, wordsToFind, goldenWord, foundWords, foundCells, foundLines,
        } = useGameStore.getState();

        // safeState strictly excludes functions and player-local variables
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

    // Also ensure sendToHost routes correctly:
    const sendToHost = (action: SocketAction) => {
        if (isHostRef.current) {
            handleIncomingAction(action, { peer: peerRef.current?.id || 'local-player' } as DataConnection);
        } else if (hostConnectionRef.current && hostConnectionRef.current.open) {
            hostConnectionRef.current.send(action);
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
    const startOfflineGame = (playerName: string) => {
        setIsHost(true);
        isHostRef.current = true;
        setPeerId('local-player');

        useGameStore.getState().addPlayer({
            id: 'local-player',
            name: playerName,
            color: PLAYER_COLORS[0],
            score: 0,
            isHost: true,
        });

        useGameStore.getState().generateNewRound(1);
    };
    return { peerId, isHost, hostGame, joinGame, startOfflineGame, sendToHost, broadcastState, broadcastSettingsChange, kickPlayer };
};
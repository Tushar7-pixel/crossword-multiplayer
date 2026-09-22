// src/App.tsx
import { Lobby } from "./components/lobby/Lobby";
import { useGameStore } from "./store/gameStore";
import { useGameNetwork } from "./hooks/useGameNetwork";
import { Scoreboard } from "./components/ui/Scoreboard";
import { GameBoard } from "./components/board/GameBoard";

function App() {
  const network = useGameNetwork();
  const status = useGameStore((state) => state.status);

  return (
    <div className="w-full min-h-screen bg-slate-900">
      {status === "lobby" && <Lobby network={network} />}
      {status === "playing" && <GameBoard network={network} />}
      {status === "scoreboard" && <Scoreboard network={network} />}
    </div>
  );
}

export default App;

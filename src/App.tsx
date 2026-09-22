import { Lobby } from "./components/lobby/Lobby";
import { useGameStore } from "./store/gameStore";
import { useGameNetwork } from "./hooks/useGameNetwork";
import { Scoreboard } from "./components/ui/Scoreboard";
import { GameBoard } from "./components/board/GameBoard";
import { ToastContainer } from "./components/ui/ToastContainer";
import { CampaignLevels } from "./components/campaign/CampaignLevels";
import { CampaignGameBoard } from "./components/campaign/CampaignGameBoard";

function App() {
  const network = useGameNetwork();
  const status = useGameStore((state) => state.status);

  return (
    <div className="w-full min-h-screen bg-slate-900">
      <ToastContainer />
      {status === "lobby" && <Lobby network={network} />}
      {status === "playing" && <GameBoard network={network} />}
      {status === "scoreboard" && <Scoreboard network={network} />}
      {status === "campaign-select" && <CampaignLevels />}
      {status === "campaign-play" && <CampaignGameBoard />}
    </div>
  );
}

export default App;

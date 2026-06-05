import Game from "@/pages/Game";
import Game_v2 from "@/pages/Game_v2";
import Game_v3 from "@/pages/Game_v3";

const params = new URLSearchParams(window.location.search);

export default function App() {
  if (params.get("v") === "2") {
    return <Game_v2 />;
  }
  if (params.get("v") === "3") {
    return <Game_v3 />;
  }
  return <Game />;
}

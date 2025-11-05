import { useEffect, useState } from "react";
import TranslatePopup from "./TranslatePopup";
import Settings from "./Settings";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState<"translate" | "settings">("translate");

  useEffect(() => {
    // Check URL hash to determine which view to show
    const hash = window.location.hash.replace("#", "");
    if (hash === "settings") {
      setCurrentView("settings");
    } else {
      setCurrentView("translate");
    }
  }, []);

  if (currentView === "settings") {
    return <Settings />;
  }

  return <TranslatePopup />;
}

export default App;
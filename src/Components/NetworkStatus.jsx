
import { useEffect, useState } from "react";
import "../styles/network-status.css";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      className={`network-status ${
        isOnline ? "network-online" : "network-offline"
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="network-status-dot"></span>

      {isOnline ? "Online" : "Offline"}
    </div>
  );
}

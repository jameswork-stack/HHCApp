import { useEffect, useState } from "react";
import "../styles/pwa-install.css";

const DISMISSED_KEY = "hhc-pwa-install-dismissed";

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    if (isInstalled() || sessionStorage.getItem(DISMISSED_KEY)) return undefined;

    const showTimer = window.setTimeout(() => setIsOpen(true), 900);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (sessionStorage.getItem(DISMISSED_KEY)) return;
      setInstallPrompt(event);
      setIsOpen(true);
    };

    const handleAppInstalled = () => {
      setIsOpen(false);
      setInstallPrompt(null);
      sessionStorage.removeItem(DISMISSED_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    setInstallError("");
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch (error) {
      console.error("Unable to open the PWA install prompt:", error);
      setInstallError(
        "The install prompt could not be opened. Use your browser menu to install the app."
      );
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  return (
    <div
      className="pwa-install-overlay"
      role="presentation"
      onClick={handleDismiss}
    >
      <section
        className="pwa-install-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pwa-install-close"
          aria-label="Close install prompt"
          onClick={handleDismiss}
        >
          ×
        </button>

        <div className="pwa-install-icon" aria-hidden="true">
          <img src="/pwa-192x192.png" alt="" />
        </div>
        <h2 id="pwa-install-title">Install Hand Hygiene Compliance App</h2>
        <p>
          Add the app to your device for quick access and a full-screen
          experience.
        </p>

        {!installPrompt && (
          <p className="pwa-install-help">
            {isIOS
              ? "In Safari, tap Share, then choose “Add to Home Screen.”"
              : "Open your browser menu and choose “Install app” or “Add to Home screen.”"}
          </p>
        )}

        {installError && (
          <p className="pwa-install-error" role="alert">
            {installError}
          </p>
        )}

        <div className="pwa-install-actions">
          {installPrompt && (
            <button
              type="button"
              className="pwa-install-primary"
              onClick={handleInstall}
            >
              Install app
            </button>
          )}
          <button
            type="button"
            className="pwa-install-secondary"
            onClick={handleDismiss}
          >
            {installPrompt ? "Not now" : "Got it"}
          </button>
        </div>
      </section>
    </div>
  );
}

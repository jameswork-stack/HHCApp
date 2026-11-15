
import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/layout.css";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/images/logo.png";
import NetworkStatus from "../Components/NetworkStatus";

export default function DashboardLayout() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu when navigating
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu using Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="app-layout">

      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <img src={logo} alt="logo" />
        <h2>Compliance System</h2>
      </header>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        id="app-sidebar"
        className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}
      >

        <NetworkStatus />
        <div className="sidebar-header">
          <img src={logo} alt="logo" />
          <p className="plogo">Management Portal</p>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="user-details">
            <strong>{currentUser?.name || "User"}</strong>
            <span>{userRole?.toUpperCase()}</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          {userRole === "admin" && (
            <NavLink to="/dashboard">
              <span>▦</span>
              Dashboard
            </NavLink>
          )}

          <NavLink to="/compliance">
            <span>✓</span>
            Compliance
          </NavLink>

          <NavLink to="/personnel">
            <span>▤</span>
            Personnel Data Record
          </NavLink>

          {userRole === "admin" && (
            <NavLink to="/users">
              <span>♙</span>
              User Management
            </NavLink>
          )}

        </nav>

        <div className="sidebar-bottom">

            <button
  className="theme-toggle"
  onClick={toggleTheme}
  type="button"
>
  <span>{theme === "light" ? "☾" : "☀"}</span>
  {theme === "light" ? "Dark Mode" : "Light Mode"}
</button>

          <button onClick={handleLogout}>
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </main>

    </div>
  );
}

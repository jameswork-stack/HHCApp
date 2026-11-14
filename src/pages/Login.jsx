
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/images/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();

  const { currentUser, userRole, loading } = useAuth();

  // REDIRECT BASED ON USER ROLE
  useEffect(() => {
    if (!loading && currentUser) {
      if (userRole === "admin") {
        navigate("/dashboard", { replace: true });
      } else if (userRole === "staff") {
        navigate("/compliance", { replace: true });
      }
    }
  }, [currentUser, userRole, loading, navigate]);

  // LOGIN FUNCTION
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // AuthContext automatically checks the user role.

    } catch (error) {
      console.error("Login error:", error);

      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
        <button
  type="button"
  className="login-theme-toggle"
  onClick={toggleTheme}
>
  {theme === "light" ? "☾ Dark Mode" : "☀ Light Mode"}
</button>
      <form className="login-form" onSubmit={handleLogin}>
        <img src={logo} alt="logo" />
        <p className="plogo">Please login to continue.</p>

        <label>Email Address</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="error-message">{error}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

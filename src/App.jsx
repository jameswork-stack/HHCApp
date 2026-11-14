
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./Components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Compliance from "./pages/Compliance";
import PersonnelDataRecord from "./pages/PersonnelDataRecord";
import UserManagement from "./pages/UserManagement";

function AppRoutes() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <h2>Loading application...</h2>;
  }

  return (
    <Routes>

      {/* Login */}
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate
              to={
                userRole === "admin"
                  ? "/dashboard"
                  : "/compliance"
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      {/* Admin only */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["admin"]} />
        }
      >
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Route>

      {/* Admin and Staff */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]} />
        }
      >
        <Route element={<DashboardLayout />}>
          <Route path="/compliance" element={<Compliance />} />

          <Route
            path="/personnel"
            element={<PersonnelDataRecord />}
          />
        </Route>
      </Route>

      {/* Default route */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              !currentUser
                ? "/login"
                : userRole === "admin"
                  ? "/dashboard"
                  : "/compliance"
            }
            replace
          />
        }
      />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

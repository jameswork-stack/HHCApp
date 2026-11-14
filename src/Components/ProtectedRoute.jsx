
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <h2>Checking authentication...</h2>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return (
      <Navigate
        to={userRole === "staff" ? "/compliance" : "/dashboard"}
        replace
      />
    );
  }

  return <Outlet />;
}

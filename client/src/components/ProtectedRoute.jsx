import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, reviewerOnly = false }) {
  const { isAuthenticated, isReviewer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-slate-500">
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (reviewerOnly && !isReviewer) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-serif text-3xl text-navy-900">Your profile</h1>
      <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm">
        <p>
          <span className="text-slate-500">Name</span>
          <br />
          <span className="font-medium text-navy-900">{user.name}</span>
        </p>
        <p>
          <span className="text-slate-500">Email</span>
          <br />
          <span className="font-medium text-navy-900">{user.email}</span>
        </p>
        <p>
          <span className="text-slate-500">Role</span>
          <br />
          <span className="capitalize font-medium text-navy-900">{user.role}</span>
        </p>
        <p>
          <span className="text-slate-500">Department</span>
          <br />
          <span className="font-medium text-navy-900">{user.department || "—"}</span>
        </p>
      </div>
      <div className="mt-6 flex gap-3">
        <Link
          to="/explore"
          className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white"
        >
          Browse library
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

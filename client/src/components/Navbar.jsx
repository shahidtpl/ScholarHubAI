import { NavLink, Link, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, Menu, X, LayoutDashboard, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-indigo-500/15 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
  }`;

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const normalizedRole = user?.role?.toLowerCase()?.trim();

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const onLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" onClick={() => setOpen(false)} className="flex min-h-11 shrink-0 items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-700">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">ScholarHub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/explore" className={linkClass}>
            Explore
          </NavLink>
          <NavLink to="/groups" className={linkClass}>
            Groups
          </NavLink>
          <NavLink to="/upload" className={linkClass}>
            Upload
          </NavLink>
          {user && ["teacher", "researcher", "student", "admin"].includes(normalizedRole) && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white"
              >
                {user.name}
                <RoleBadge role={user.role} />
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">
                Login
              </Link>
              <Link
                to="/register"
                className="flex min-h-11 items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        id="mobile-navigation"
        aria-hidden={!open}
        inert={!open}
        className={`grid overflow-hidden border-t border-slate-800 transition-[grid-template-rows,opacity] duration-200 ease-out md:hidden ${
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <nav className="min-h-0 overflow-hidden px-4">
          <div className="space-y-1 py-3">
            <NavLink to="/" className={linkClass} end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/explore" className={linkClass} onClick={() => setOpen(false)}>
              Explore
            </NavLink>
            <NavLink to="/groups" className={linkClass} onClick={() => setOpen(false)}>
              Groups
            </NavLink>
            <NavLink to="/upload" className={linkClass} onClick={() => setOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload
              </span>
            </NavLink>
            {user && ["teacher", "researcher", "student", "admin"].includes(normalizedRole) && (
              <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                <span className="inline-flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </span>
              </NavLink>
            )}
            {isAuthenticated ? (
              <>
                <NavLink to="/profile" className={linkClass} onClick={() => setOpen(false)}>
                  <span className="inline-flex items-center gap-2">
                    {user.name}
                    <RoleBadge role={user.role} />
                  </span>
                </NavLink>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
                  Login
                </NavLink>
                <NavLink to="/register" className={linkClass} onClick={() => setOpen(false)}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function RoleBadge({ role }) {
  return (
    <span className="ml-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
      {role}
    </span>
  );
}

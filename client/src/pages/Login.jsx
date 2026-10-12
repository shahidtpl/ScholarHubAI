import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { user } = await login(form.email, form.password, form.role);
      const destination = user.role === "teacher" ? "/dashboard" : "/explore";
      navigate(location.state?.from || destination, { replace: true });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your details and try again.";
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl text-navy-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in to upload, comment, and review.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Sign in as</legend>
          <div
            className="mt-2 grid grid-cols-3 rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="Select your role"
          >
            {["student", "teacher", "researcher"].map((role) => {
              const selected = form.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setForm({ ...form, role })}
                  className={`rounded-lg px-2 py-2 text-sm font-medium capitalize transition ${
                    selected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <div className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-navy-500"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <div className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-500">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Login"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        New to ScholarHub?{" "}
        <Link to="/register" className="font-medium text-navy-800">
          Create an account
        </Link>
      </p>
    </div>
  );
}

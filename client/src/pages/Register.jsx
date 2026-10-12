import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "researcher", label: "Researcher" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role")?.trim().toLowerCase();
  const initialRole = ROLES.some((role) => role.value === requestedRole)
    ? requestedRole
    : "student";
  const [form, setForm] = useState({
    name: "",
    email: searchParams.get("email") || "",
    password: "",
    role: initialRole,
    department: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [existingRole, setExistingRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setExistingRole("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/explore", { replace: true });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please check your details and try again.";
      setError(errorMsg);
      setExistingRole(err.response?.data?.existingRole || "");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl text-navy-900">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">Join as a student, teacher, or researcher.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
            {existingRole && (
              <Link to="/login" className="underline font-bold ml-2">
                Login Now →
              </Link>
            )}
          </p>
        )}
        <label className="text-xs uppercase font-semibold tracking-wider text-slate-300 mb-1.5 block">
          Full name
          <input
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D17] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="text-xs uppercase font-semibold tracking-wider text-slate-300 mb-1.5 block">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D17] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="text-xs uppercase font-semibold tracking-wider text-slate-300 mb-1.5 block">
          Password
          <div className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D17] px-3 py-2 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
        <fieldset>
          <legend className="text-xs uppercase font-semibold tracking-wider text-slate-300 mb-1.5 block">
            Role
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLES.map((role) => (
              <label
                key={role.value}
                className={`cursor-pointer rounded-xl px-2 py-2 text-center text-xs ${
                  form.role === role.value
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 border border-indigo-500"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 font-medium"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={form.role === role.value}
                  onChange={() => setForm({ ...form, role: role.value })}
                  className="sr-only"
                />
                {role.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-xs uppercase font-semibold tracking-wider text-slate-300 mb-1.5 block">
          Department
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="e.g. Computer Science"
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D17] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition duration-200 shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-navy-800">
          Login
        </Link>
      </p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!resetComplete) return undefined;
    const timeout = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [navigate, resetComplete]);

  const sendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setOtpSent(true);
      setDemoOtp(data.demoOtp || "");
      setSuccess(data.message || "OTP sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send the OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      setSuccess(data.message || "Password reset successfully. Redirecting to login…");
      setResetComplete(true);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset your password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-[#060911] px-4 py-16 text-slate-200">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl text-white">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Verify your email and choose a new password for your ScholarHub account.
        </p>
        <form
          onSubmit={otpSent ? resetPassword : sendOtp}
          className="mt-8 space-y-5 rounded-2xl border border-slate-800 bg-[#0E1422] p-6 shadow-xl shadow-black/20"
        >
          {error && (
            <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
              {success}
            </p>
          )}
          <label className="block text-sm font-medium text-slate-300">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={otpSent}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 read-only:text-slate-400"
            />
          </label>
          {!otpSent ? (
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Sending OTP…" : "Send Verification OTP"}
            </button>
          ) : (
            <>
              {demoOtp && (
                <div className="rounded-xl border border-indigo-400/30 bg-indigo-400/10 p-4 text-sm text-indigo-100">
                  <p className="font-medium">
                    Institutional Verification Code:{" "}
                    <span className="font-mono tracking-[0.2em]">{demoOtp}</span>{" "}
                    (Demo Safe Mode)
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtp(demoOtp)}
                    className="mt-3 rounded-lg border border-indigo-300/40 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-300/10"
                  >
                    Fill OTP
                  </button>
                </div>
              )}
              <label className="block text-sm font-medium text-slate-300">
                6-digit verification OTP
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm tracking-[0.3em] text-white outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                New Password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Confirm Password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting ? "Resetting password…" : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setDemoOtp("");
                  setError("");
                  setSuccess("");
                }}
                className="w-full text-sm text-slate-400 hover:text-white"
              >
                Use a different email
              </button>
            </>
          )}
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          Remembered your password?{" "}
          <Link to="/login" className="font-medium text-indigo-300 hover:text-indigo-200">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

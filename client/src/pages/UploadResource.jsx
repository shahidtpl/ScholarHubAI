import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, Mail, MessageCircle, UploadCloud, X } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CATEGORIES } from "../data/dummyResources.js";

export default function UploadResource() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: user?.name || "",
    category: CATEGORIES[0],
    tags: "",
    description: "",
    year: String(new Date().getFullYear()),
    department: user?.department || "",
    assignedReviewerEmail: "",
  });
  const [success, setSuccess] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  const onFile = (next) => {
    if (!next) return;
    setFile(next);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a PDF or document file.");
      return;
    }
    if (!form.assignedReviewerEmail.trim()) {
      setError("Assigned Teacher email is required for peer verification.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.set("assignedReviewerEmail", form.assignedReviewerEmail.trim().toLowerCase());
      payload.append("file", file);
      await api.post("/resources", payload);
      const teacherEmail = form.assignedReviewerEmail.trim().toLowerCase();
      const registrationUrl = new URL("/register", window.location.origin);
      registrationUrl.searchParams.set("email", teacherEmail);
      registrationUrl.searchParams.set("role", "Teacher");
      setSuccess({
        title: form.title.trim() || file.name,
        teacherEmail,
        registrationUrl: registrationUrl.toString(),
      });
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const invitationText = success
    ? `Hello Professor, I have submitted my research manuscript '${success.title}' on ScholarHub for your verification and approval. If you are registered, please review it on your dashboard. If new, please register here: ${success.registrationUrl}`
    : "";
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(invitationText)}`;
  const emailSubject = success ? `Review Request: ${success.title}` : "";
  const emailBody = success
    ? `Hello Professor,\n\nI have submitted my research manuscript "${success.title}" on ScholarHub for your verification and approval.\n\nVerification portal: ${window.location.origin}/login\nIf you are new to ScholarHub, please register here: ${success.registrationUrl}`
    : "";
  const mailtoUrl = `mailto:${success?.teacherEmail || ""}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(success.registrationUrl);
      setCopyMessage("Teacher invitation link copied.");
    } catch (copyError) {
      console.error("Unable to copy teacher invitation link:", copyError);
      setCopyMessage("Copy is unavailable in this browser. Select and copy the registration link below.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl text-navy-900">Upload a resource</h1>
      <p className="mt-2 text-sm text-slate-600">
        Files are stored for faculty review. Approved items appear in Explore.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-2xl border-2 border-dashed px-4 py-10 text-center ${
            drag ? "border-navy-600 bg-navy-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-navy-700" />
          <p className="mt-2 text-sm text-slate-600">
            Drag and drop a PDF or document, or{" "}
            <label className="cursor-pointer font-medium text-navy-800">
              browse
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </p>
          {file && <p className="mt-2 text-xs font-medium text-navy-800">{file.name}</p>}
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Author
          <input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Select or Enter Supervising Teacher&apos;s Email
          <input
            type="email"
            required
            value={form.assignedReviewerEmail}
            onChange={(e) => setForm({ ...form, assignedReviewerEmail: e.target.value })}
            placeholder="professor@university.edu"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            We&apos;ll assign this teacher to verify your submission and prepare an invitation link.
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          >
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Year
            <input
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Department
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Tags
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="comma-separated keywords"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Abstract / Description
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-navy-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Uploading…" : "Submit for review"}
        </button>
      </form>
      {success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSuccess(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-success-title"
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              aria-label="Close invitation"
              onClick={() => setSuccess(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <h2 id="upload-success-title" className="mt-4 font-serif text-2xl text-navy-900">
              Submission received!
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your manuscript is ready for review. Invite {success.teacherEmail} to verify it.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Share via WhatsApp
              </a>
              <a
                href={mailtoUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                <Mail className="h-4 w-4" />
                Send Email Invitation
              </a>
            </div>
            <button
              type="button"
              onClick={copyInvitationLink}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              Copy teacher invitation link
            </button>
            {copyMessage && (
              <p role="status" className="mt-2 text-center text-xs text-slate-600">{copyMessage}</p>
            )}
            <div className="mt-4 break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {success.registrationUrl}
            </div>
            <button
              type="button"
              onClick={() => navigate("/explore", { replace: true, state: { uploaded: true } })}
              className="mt-5 w-full text-sm font-medium text-navy-800 hover:underline"
            >
              Continue to Explore
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

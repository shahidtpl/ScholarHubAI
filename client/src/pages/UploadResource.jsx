import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud } from "lucide-react";
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
  });

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
    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append("file", file);
      await api.post("/resources", payload);
      navigate("/explore", { replace: true, state: { uploaded: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setSubmitting(false);
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
    </div>
  );
}

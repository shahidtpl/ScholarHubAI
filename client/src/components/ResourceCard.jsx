import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  Check,
  Clipboard,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const categoryTone = {
  Books: "border-sky-300/15 bg-sky-300/[0.08] text-sky-200",
  "Research Papers": "border-indigo-300/15 bg-indigo-300/[0.08] text-indigo-200",
  Dissertations: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
  "Seminar Reports": "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200",
  "Lecture Notes": "border-rose-300/15 bg-rose-300/[0.08] text-rose-200",
};

function citationFor(resource, format) {
  const author = resource.author || "Unknown author";
  const year = resource.year || (resource.createdAt ? new Date(resource.createdAt).getFullYear() : "n.d.");
  if (format === "MLA") {
    return `${author}. “${resource.title}.” ScholarHub Digital Library, ${year}.`;
  }
  return `${author}. (${year}). ${resource.title}. ScholarHub Digital Library${resource.department ? `. ${resource.department}` : ""}.`;
}

function summaryText(summary) {
  if (typeof summary === "string") return summary;
  if (summary && typeof summary === "object") {
    return Object.values(summary).filter((value) => typeof value === "string" && value.trim()).join(" ");
  }
  return "";
}

export default function ResourceCard({ resource, isSample = false, onAuthRequired }) {
  const { isAuthenticated, user, updateSavedResource } = useAuth();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState("");
  const author = resource.author || "Unknown author";
  const year = resource.year || (resource.createdAt ? new Date(resource.createdAt).getFullYear() : "Year unavailable");
  const initials = author.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  const saved = Boolean(user?.savedResources?.some((item) => String(item?._id || item) === String(resource._id)));
  const abstract = resource.abstract || resource.description || "This record has no abstract. Open the resource to view its full metadata.";
  const existingSummary = useMemo(() => summaryText(resource.aiSummary), [resource.aiSummary]);

  const copyCitation = async (format) => {
    try {
      await navigator.clipboard.writeText(citationFor(resource, format));
      setCopied(format);
      setNotice(`${format} citation copied`);
      window.setTimeout(() => setCopied(""), 1800);
      window.setTimeout(() => setNotice(""), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
      window.setTimeout(() => setNotice(""), 2400);
    }
  };

  const toggleBookmark = async () => {
    if (!isAuthenticated) {
      setNotice("Sign in to save this resource to your library.");
      return;
    }
    if (isSample) {
      updateSavedResource(resource._id, !saved);
      setNotice(saved ? "Removed from your library." : "Saved to your library.");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }
    setBusy("bookmark");
    setNotice("");
    try {
      const { data } = await api.post(`/resources/${resource._id}/bookmark`);
      updateSavedResource(resource._id, Boolean(data.saved));
      setNotice(data.saved ? "Saved to your library." : "Removed from your library.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to update your library. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const generateSummary = async () => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    if (summary || existingSummary) {
      setSummary(summary || existingSummary);
      return;
    }
    if (isSample) {
      setSummary(`${resource.title} by ${author} is a ${String(resource.category || "scholarly").toLowerCase()} contribution in ${resource.department || "academia"}. ${abstract}`);
      return;
    }
    setBusy("summary");
    setNotice("");
    try {
      const { data } = await api.post(`/resources/${resource._id}/summarize`);
      const result = summaryText(data.summary || data.aiSummary);
      if (!result) throw new Error("The summary service returned no summary.");
      setSummary(result);
    } catch (error) {
      setNotice(error.response?.data?.message || error.message || "Unable to generate a summary. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-800 bg-[#0E1422] p-5 shadow-[0_14px_38px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-[0_20px_48px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex max-w-[75%] truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryTone[resource.category] || "border-slate-700 bg-slate-800/70 text-slate-300"}`}>
          {resource.category || "Academic Resource"}
        </span>
        <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] tabular-nums text-slate-400">{year}</span>
      </div>
      {resource.status && resource.status !== "approved" && (
        <span className={`mt-3 inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${resource.status === "pending" ? "border-amber-300/20 bg-amber-300/[0.07] text-amber-100" : "border-rose-300/20 bg-rose-300/[0.07] text-rose-200"}`}>
          {resource.status === "pending" ? "Pending faculty review" : "Needs review"}
        </span>
      )}
      <h3 className="mt-4 font-serif text-xl font-semibold leading-snug text-white transition group-hover:text-indigo-100">{resource.title}</h3>
      <div className="mt-4 flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300/15 bg-indigo-300/[0.08] text-[11px] font-bold text-indigo-100">{initials || "?"}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">{author}</p>
          <p className="truncate text-xs text-slate-500">{resource.department || "Academic contributor"}</p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-slate-400">{abstract}</p>
      {summary && (
        <div className="mt-4 rounded-xl border border-indigo-300/15 bg-indigo-300/[0.05] p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200"><Sparkles className="h-3 w-3" /> Smart summary</p>
          <p className="line-clamp-4 text-xs leading-5 text-slate-300">{summary}</p>
        </div>
      )}
      {notice && <p role="status" className="mt-3 text-xs text-indigo-200">{notice}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <span className="text-[11px] text-slate-500">{resource.views ?? resource.viewCount ?? resource.viewsCount ?? "—"} reads</span>
        <div className="flex flex-wrap items-center gap-2">
          {["APA", "MLA"].map((format) => (
            <button key={format} type="button" onClick={() => copyCitation(format)} aria-label={`Copy ${format} citation`} title={`Copy ${format} citation`} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:border-indigo-300/30 hover:text-indigo-100">
              {copied === format ? <Check className="h-3 w-3 text-emerald-300" /> : <Clipboard className="h-3 w-3" />}{format}
            </button>
          ))}
          <button type="button" onClick={toggleBookmark} disabled={busy === "bookmark"} aria-label={saved ? "Remove bookmark" : "Save resource"} aria-pressed={saved} title={saved ? "Saved to your library" : "Save to your library"} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition disabled:opacity-60 ${saved ? "border-indigo-300/30 bg-indigo-300/10 text-indigo-200" : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-indigo-300/30 hover:text-indigo-100"}`}>
            {busy === "bookmark" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Link to={`/resources/${resource._id}`} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-indigo-300 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-200">
          <BookOpen className="h-4 w-4 shrink-0" /><span className="truncate">View details</span>
        </Link>
        <button type="button" onClick={generateSummary} disabled={busy === "summary"} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-300/[0.06] hover:text-white disabled:opacity-60">
          {busy === "summary" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-indigo-200" />}
          <span className="hidden sm:inline">Smart summary</span>
          <span className="sm:hidden">Summary</span>
        </button>
      </div>
    </article>
  );
}

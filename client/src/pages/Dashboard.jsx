import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  Download,
  Eye,
  FileStack,
  FileText,
  FolderKanban,
  MessageSquare,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const featuredDepartments = ["History", "Computer Science", "Sharia", "Social Sciences"];
const resourceCategories = ["Books", "Research Papers", "Dissertations", "Seminar Reports", "Lecture Notes"];

function resourceId(value) {
  return String(value?._id || value?.id || value || "");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function fileHref(resource) {
  if (!resource?.fileUrl) return "";
  return /^https?:\/\//i.test(resource.fileUrl)
    ? resource.fileUrl
    : `${API_BASE}${resource.fileUrl.startsWith("/") ? "" : "/"}${resource.fileUrl}`;
}

function displayNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "—";
}

function ErrorMessage({ children }) {
  if (!children) return null;
  return <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const currentRole = user?.role?.toLowerCase()?.trim() || "student";
  if (currentRole === "researcher") return <ResearcherWorkspace user={user} />;
  if (currentRole === "teacher" || currentRole === "admin") return <FacultyDashboard />;
  return <StudentDashboard user={user} />;
}

function StudentDashboard({ user }) {
  const [submissions, setSubmissions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeCircles, setActiveCircles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      const [submissionsResult, bookmarksResult, groupsResult] = await Promise.allSettled([
        api.get("/resources/my"),
        api.get("/resources/user/saved"),
        api.get("/groups"),
      ]);
      if (!current) return;

      const errors = [];
      if (submissionsResult.status === "fulfilled") {
        const items = submissionsResult.value.data.resources || submissionsResult.value.data;
        setSubmissions(Array.isArray(items) ? items : []);
      } else {
        errors.push(submissionsResult.reason.response?.data?.message || "Unable to load your submissions.");
      }

      if (bookmarksResult.status === "fulfilled") {
        const items = bookmarksResult.value.data.resources;
        setBookmarks(Array.isArray(items) ? items : []);
      } else {
        errors.push(bookmarksResult.reason.response?.data?.message || "Unable to load your bookmarks.");
      }

      if (groupsResult.status === "fulfilled") {
        const groups = groupsResult.value.data.groups;
        const userId = resourceId(user);
        setActiveCircles(Array.isArray(groups)
          ? groups.filter((group) => (
            resourceId(group.createdBy) === userId ||
            group.members?.some((member) => resourceId(member) === userId)
          )).length
          : 0);
      } else {
        errors.push(groupsResult.reason.response?.data?.message || "Unable to load your research circles.");
      }

      setError(errors.join(" "));
      setLoading(false);
    };

    loadDashboard();
    return () => {
      current = false;
    };
  }, [user]);

  const pendingCount = submissions.filter((submission) => submission.status === "pending").length;
  const approvedCount = submissions.filter((submission) => submission.status === "approved").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Student research</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Student Research Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Track your submissions, bookmarks, and active research circles.</p>
        </div>
        <Link to="/upload" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:self-auto">
          <FileText className="h-4 w-4" /> Submit research
        </Link>
      </header>

      <section aria-label="Student research metrics" className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "My Submissions", value: submissions.length, icon: FileStack, tone: "bg-indigo-50 text-indigo-700" },
          { label: "Bookmarks", value: bookmarks.length, icon: Bookmark, tone: "bg-sky-50 text-sky-700" },
          { label: "Active Circles", value: activeCircles, icon: Users, tone: "bg-emerald-50 text-emerald-700" },
        ].map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>
              <metric.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              {loading && metric.value === 0 ? "…" : displayNumber(metric.value)}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-700">{metric.label}</h2>
          </article>
        ))}
      </section>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-slate-900">My Submissions</h2>
              <p className="mt-1 text-sm text-slate-500">
                {pendingCount} pending · {approvedCount} approved
              </p>
            </div>
            <Link to="/upload" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Submit work</Link>
          </div>
          {submissions.length ? (
            <ul className="divide-y divide-slate-100">
              {submissions.map((submission) => {
                const status = submission.status || "pending";
                const statusLabel = status === "approved" ? "Approved" : status === "rejected" ? "Revision Requested" : "Pending";
                const statusTone = status === "approved"
                  ? "bg-emerald-100 text-emerald-800"
                  : status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800";
                return (
                  <li key={resourceId(submission)} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{submission.title || "Untitled manuscript"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(submission.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}>{statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              {loading ? "Loading your submissions…" : "You have not submitted any research yet."}
            </p>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-slate-900">Bookmarks</h2>
              <p className="mt-1 text-sm text-slate-500">Research saved to your library.</p>
            </div>
            <Link to="/explore" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Explore</Link>
          </div>
          {bookmarks.length ? (
            <ul className="divide-y divide-slate-100">
              {bookmarks.map((bookmark) => (
                <li key={resourceId(bookmark)} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{bookmark.title || "Untitled manuscript"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{[bookmark.department, bookmark.category].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Link to={`/resources/${resourceId(bookmark)}`} aria-label={`Open ${bookmark.title || "saved manuscript"}`} className="shrink-0 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                    Read
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              {loading ? "Loading your bookmarks…" : "Bookmark papers from Explore to find them here."}
            </p>
          )}
        </article>
      </section>
    </div>
  );
}

function ResearcherWorkspace({ user }) {
  const [publications, setPublications] = useState([]);
  const [savedResources, setSavedResources] = useState([]);
  const [groupsCount, setGroupsCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingResource, setEditingResource] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [activeTab, setActiveTab] = useState("publications");

  useEffect(() => {
    let current = true;
    const loadWorkspace = async () => {
      setLoading(true);
      setError("");
      const [publicationsResult, savedResult, groupsResult] = await Promise.allSettled([
        api.get("/resources/mine"),
        api.get("/resources/user/saved"),
        api.get("/groups"),
      ]);
      if (!current) return;

      if (publicationsResult.status === "fulfilled") {
        const items = publicationsResult.value.data.resources;
        setPublications(Array.isArray(items) ? items : []);
      } else {
        setError(publicationsResult.reason.response?.data?.message || "Unable to load your research publications.");
      }

      if (savedResult.status === "fulfilled") {
        const items = savedResult.value.data.resources;
        setSavedResources(Array.isArray(items) ? items : []);
      } else {
        setError((currentError) => currentError || savedResult.reason.response?.data?.message || "Unable to load your saved research.");
      }

      if (groupsResult.status === "fulfilled") {
        const groups = groupsResult.value.data.groups;
        const userId = resourceId(user);
        setGroupsCount(Array.isArray(groups)
          ? groups.filter((group) => (
            resourceId(group.createdBy) === userId ||
            group.members?.some((member) => resourceId(member) === userId)
          )).length
          : 0);
      } else {
        setError((currentError) => currentError || groupsResult.reason.response?.data?.message || "Unable to load your research circles.");
      }
      setLoading(false);
    };

    loadWorkspace();
    return () => {
      current = false;
    };
  }, [user]);

  const totalReads = publications.reduce((total, resource) => total + (Number(resource.views) || 0), 0);

  const openEditModal = (resource) => {
    setEditingResource(resource);
    setEditForm({
      title: resource.title || "",
      description: resource.description || "",
      department: resource.department || "",
      category: resource.category || "Research Papers",
      publicationYear: resource.year ?? "",
    });
    setEditError("");
    setNotice("");
  };

  const saveResource = async (event) => {
    event.preventDefault();
    if (!editingResource || !editForm) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const id = resourceId(editingResource);
      const { data } = await api.put(`/resources/${id}`, editForm);
      setPublications((current) => current.map((resource) => (
        resourceId(resource) === id ? data.resource : resource
      )));
      setEditingResource(null);
      setEditForm(null);
      setNotice("Publication metadata updated.");
    } catch (requestError) {
      setEditError(requestError.response?.data?.message || "Unable to update this publication.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteResource = async (resource) => {
    if (!window.confirm("Are you sure you want to permanently delete this manuscript?")) return;
    const id = resourceId(resource);
    const previousSavedResources = savedResources;
    setPublications((current) => current.filter((item) => resourceId(item) !== id));
    setSavedResources((current) => current.filter((item) => resourceId(item) !== id));
    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/resources/${id}`);
      setNotice("Publication deleted.");
    } catch (requestError) {
      setPublications((current) => [...current, resource].sort((a, b) => (
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )));
      setSavedResources(previousSavedResources);
      setError(requestError.response?.data?.message || "Unable to delete this publication.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
          Researcher Workspace • Academic Dissemination &amp; Impact
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Your research workspace</h1>
            <p className="mt-2 text-sm text-slate-600">Track your deposited works, reach, and research circles.</p>
          </div>
          <Link to="/upload" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:self-auto">
            <FileText className="h-4 w-4" /> Deposit a work
          </Link>
        </div>
      </header>

      <section aria-label="Researcher metrics" className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "My Deposited Works", value: publications.length, icon: FileStack, tone: "bg-indigo-50 text-indigo-700" },
          { label: "Total Manuscript Reads", value: totalReads, icon: Eye, tone: "bg-sky-50 text-sky-700" },
          { label: "Active Research Circles", value: groupsCount, icon: Users, tone: "bg-emerald-50 text-emerald-700" },
        ].map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>
              <metric.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              {metric.value === null ? (loading ? "…" : "—") : displayNumber(metric.value)}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-700">{metric.label}</h2>
          </article>
        ))}
      </section>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 border-b border-slate-200 px-4 pt-3 sm:px-6" role="tablist" aria-label="Researcher workspace sections">
          {[
            { id: "publications", label: "My Research Publications & Preprints", count: publications.length, icon: FileStack },
            { id: "saved", label: "Saved Research Vault", count: savedResources.length, icon: Bookmark },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                activeTab === tab.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab === "publications" ? (
          <div id="publications-panel" role="tabpanel" aria-labelledby="publications-tab">
            {publications.length ? (
              <ul className="divide-y divide-slate-100">
                {publications.map((resource) => {
                  const approved = resource.status === "approved";
                  const isOwner = Boolean(resource.uploadedBy) &&
                    resourceId(resource.uploadedBy) === resourceId(user);
                  return (
                    <li key={resourceId(resource)} className="flex flex-col gap-4 px-4 py-5 sm:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-slate-900">{resource.title}</h2>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              approved ? "bg-emerald-100 text-emerald-800" : resource.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {approved ? "Approved" : resource.status === "rejected" ? "Revision Requested" : "In Review"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            {[resource.category, resource.department, resource.year || "Year not specified"].filter(Boolean).join(" · ")}
                            {" · "}{displayNumber(resource.views)} reads
                          </p>
                          {resource.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{resource.description}</p>}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {isOwner && (
                            <>
                              <button type="button" onClick={() => openEditModal(resource)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700">
                                <Pencil className="h-3.5 w-3.5" /> Edit Metadata
                              </button>
                              <button type="button" disabled={deletingId === resourceId(resource)} onClick={() => deleteResource(resource)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
                                <Trash2 className="h-3.5 w-3.5" /> {deletingId === resourceId(resource) ? "Deleting…" : "Delete"}
                              </button>
                            </>
                          )}
                          <Link to={`/resources/${resourceId(resource)}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-800">
                            <BookOpen className="h-3.5 w-3.5" /> View Full Document
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-6 py-12 text-center text-sm text-slate-500">
                {loading ? "Loading your deposited works…" : "You have not deposited any works yet."}
              </p>
            )}
          </div>
        ) : (
          <div id="saved-panel" role="tabpanel" aria-labelledby="saved-tab">
            {savedResources.length ? (
              <ul className="divide-y divide-slate-100">
                {savedResources.map((resource) => (
                  <li key={resourceId(resource)} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><BookOpen className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{resource.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{[resource.department, resource.category, resource.year].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <Link to={`/resources/${resourceId(resource)}`} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:self-auto">
                      <BookOpen className="h-4 w-4" /> Open paper
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <Bookmark className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-3 font-medium text-slate-800">{loading ? "Loading your saved research…" : "Your research vault is empty."}</p>
                {!loading && <p className="mt-1 text-sm text-slate-500">Bookmark papers from Explore to keep them close at hand.</p>}
              </div>
            )}
          </div>
        )}
      </section>

      {editingResource && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingEdit) setEditingResource(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="researcher-edit-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Publication metadata</p>
                <h2 id="researcher-edit-title" className="mt-1 font-serif text-2xl font-semibold text-slate-900">Edit metadata</h2>
              </div>
              <button type="button" aria-label="Close edit dialog" disabled={savingEdit} onClick={() => setEditingResource(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveResource} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Title
                <input required maxLength={200} value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Abstract
                <textarea rows={5} value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Department
                <input value={editForm.department} onChange={(event) => setEditForm((current) => ({ ...current, department: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Category
                <select value={editForm.category} onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500">
                  {resourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Publication year
                <input type="number" min="1900" max="2100" value={editForm.publicationYear} onChange={(event) => setEditForm((current) => ({ ...current, publicationYear: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
              </label>
              {editError && <ErrorMessage>{editError}</ErrorMessage>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={savingEdit} onClick={() => setEditingResource(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={savingEdit} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
                  <Check className="h-4 w-4" /> {savingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function FacultyDashboard() {
  const { user, isReviewer } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [realStats, setRealStats] = useState(null);
  const [groupsCount, setGroupsCount] = useState(null);
  const [resources, setResources] = useState([]);
  const [managedResources, setManagedResources] = useState([]);
  const [pending, setPending] = useState([]);
  const [activeTab, setActiveTab] = useState("reviews");
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [realStatsError, setRealStatsError] = useState("");
  const [groupsError, setGroupsError] = useState("");
  const [resourcesError, setResourcesError] = useState("");
  const [pendingError, setPendingError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [revisionItem, setRevisionItem] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [editingResource, setEditingResource] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [managementError, setManagementError] = useState("");
  const [managementNotice, setManagementNotice] = useState("");

  useEffect(() => {
    let current = true;

    const loadDashboard = async () => {
      setLoading(true);
      setSummaryError("");
      setRealStatsError("");
      setGroupsError("");
      setResourcesError("");
      setPendingError("");
      setManagementError("");

      const results = await Promise.allSettled([
        api.get("/analytics/summary"),
        api.get("/analytics/real-stats"),
        api.get("/groups"),
        api.get("/resources"),
        api.get("/resources/pending"),
        api.get(isReviewer ? "/resources/manage" : "/resources/my"),
      ]);
      if (!current) return;

      const [summaryResult, realStatsResult, groupsResult, resourcesResult, pendingResult, managedResult] = results;
      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data.summary || {});
      } else {
        setSummaryError(summaryResult.reason.response?.data?.message || "Unable to load analytics.");
      }

      if (realStatsResult.status === "fulfilled") {
        setRealStats(realStatsResult.value.data || {});
      } else {
        setRealStatsError(realStatsResult.reason.response?.data?.message || "Unable to load repository health analytics.");
      }

      if (groupsResult.status === "fulfilled") {
        const groups = groupsResult.value.data.groups;
        setGroupsCount(Array.isArray(groups) ? groups.length : 0);
      } else {
        setGroupsError(groupsResult.reason.response?.data?.message || "Unable to load research groups.");
      }

      if (resourcesResult.status === "fulfilled") {
        const listedResources = resourcesResult.value.data.resources;
        setResources(Array.isArray(listedResources) ? listedResources : []);
      } else {
        setResourcesError(resourcesResult.reason.response?.data?.message || "Unable to load repository documents.");
      }

      if (pendingResult.status === "fulfilled") {
        const reviewQueue = pendingResult.value.data.resources;
        setPending(Array.isArray(reviewQueue) ? reviewQueue.filter((resource) => resource.status === "pending") : []);
      } else {
        setPendingError(pendingResult.reason.response?.data?.message || "Unable to load the faculty review queue.");
      }
      if (managedResult.status === "fulfilled") {
        const items = managedResult.value.data.resources || managedResult.value.data;
        setManagedResources(Array.isArray(items) ? items : []);
      } else {
        setManagementError(managedResult.reason.response?.data?.message || "Unable to load submissions.");
      }
      setLoading(false);
    };

    loadDashboard();
    return () => {
      current = false;
    };
  }, [isReviewer, user?._id, user?.id]);

  const savedResources = useMemo(() => {
    const savedIds = new Set((user?.savedResources || []).map(resourceId));
    return resources.filter((resource) => savedIds.has(resourceId(resource)));
  }, [resources, user?.savedResources]);
  const topViewedPapers = realStats?.topViewedPapers || [];
  const departmentUploadCounts = realStats?.departmentUploadCounts || [];

  const departmentDistribution = useMemo(() => {
    const counts = new Map();
    resources.forEach((resource) => {
      const label = resource.department?.trim() || "Unspecified";
      const key = label.toLocaleLowerCase();
      const existing = counts.get(key);
      counts.set(key, { label: existing?.label || label, count: (existing?.count || 0) + 1 });
    });

    const featuredKeys = new Set(featuredDepartments.map((department) => department.toLocaleLowerCase()));
    const departments = featuredDepartments.map((label) => ({
      label,
      count: counts.get(label.toLocaleLowerCase())?.count || 0,
    }));
    counts.forEach((value, key) => {
      if (!featuredKeys.has(key)) departments.push(value);
    });

    return departments
      .map((department) => ({
        ...department,
        percentage: resources.length ? Math.round((department.count / resources.length) * 100) : 0,
      }))
      .sort((first, second) => (
        featuredKeys.has(first.label.toLocaleLowerCase()) === featuredKeys.has(second.label.toLocaleLowerCase())
          ? second.count - first.count || first.label.localeCompare(second.label)
          : featuredKeys.has(first.label.toLocaleLowerCase()) ? -1 : 1
      ));
  }, [resources]);

  const updateReview = async (item, status, reviewFeedback = "") => {
    const id = resourceId(item);
    setReviewingId(id);
    setReviewError("");
    setNotice("");
    try {
      await api.patch(`/resources/${id}/review`, { status, feedback: reviewFeedback });
      setPending((current) => current.filter((resource) => resourceId(resource) !== id));
      setSummary((current) => current
        ? { ...current, pendingApprovals: Math.max(0, Number(current.pendingApprovals || 0) - 1) }
        : current);
      setNotice(status === "approved" ? "Manuscript approved." : "Revision request sent and manuscript rejected.");
      setRevisionItem(null);
      setFeedback("");
    } catch (error) {
      const message = error.response?.data?.message || "Unable to update this manuscript review.";
      if (status === "rejected") setReviewError(message);
      else setNotice(message);
    } finally {
      setReviewingId("");
    }
  };

  const openEditModal = (resource) => {
    setEditingResource(resource);
    setEditForm({
      title: resource.title || "",
      author: resource.author || "",
      department: resource.department || "",
      category: resource.category || "Research Papers",
      description: resource.description || "",
      publicationYear: resource.publicationYear ?? resource.year ?? "",
    });
    setEditError("");
    setManagementNotice("");
  };

  const saveResource = async (event) => {
    event.preventDefault();
    if (!editingResource || !editForm) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const id = resourceId(editingResource);
      const { data } = await api.put(`/resources/${id}`, editForm);
      const updatedResource = data.resource;
      setManagedResources((current) => current.map((resource) => (
        resourceId(resource) === id ? updatedResource : resource
      )));
      setResources((current) => current.map((resource) => (
        resourceId(resource) === id ? updatedResource : resource
      )));
      setPending((current) => current.map((resource) => (
        resourceId(resource) === id ? updatedResource : resource
      )));
      setEditingResource(null);
      setEditForm(null);
      setManagementNotice("Manuscript updated successfully.");
    } catch (error) {
      setEditError(error.response?.data?.message || "Unable to update this manuscript.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteResource = async (resource) => {
    if (!window.confirm("Are you sure you want to permanently delete this manuscript?")) return;
    const id = resourceId(resource);
    setManagementError("");
    setManagementNotice("");
    setManagedResources((current) => current.filter((item) => resourceId(item) !== id));
    setResources((current) => current.filter((item) => resourceId(item) !== id));
    setPending((current) => current.filter((item) => resourceId(item) !== id));
    try {
      await api.delete(`/resources/${id}`);
      if (resource.status === "pending") {
        setSummary((current) => current
          ? { ...current, pendingApprovals: Math.max(0, Number(current.pendingApprovals || 0) - 1) }
          : current);
      }
      setManagementNotice("Manuscript deleted successfully.");
    } catch (error) {
      setManagedResources((current) => [...current, resource].sort((a, b) => (
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )));
      setResources((current) => [...current, resource]);
      if (resource.status === "pending") {
        setPending((current) => [...current, resource]);
      }
      setManagementError(error.response?.data?.message || "Unable to delete this manuscript.");
    }
  };

  const scrollToReviewQueue = () => {
    setActiveTab("reviews");
    window.requestAnimationFrame(() => {
      document.getElementById("pending-review-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const cards = [
    {
      label: "Repository manuscripts",
      value: summary?.totalResources,
      icon: FileStack,
      detail: "Across the institutional repository",
      tone: "text-indigo-700 bg-indigo-50",
      onClick: () => navigate("/explore"),
    },
    {
      label: "Document downloads",
      value: summary?.totalDownloads,
      icon: Download,
      detail: "All-time repository activity",
      tone: "text-sky-700 bg-sky-50",
      onClick: () => navigate("/explore"),
    },
    {
      label: "Active research groups",
      value: groupsCount,
      icon: FolderKanban,
      detail: "Collaborative academic groups",
      tone: "text-emerald-700 bg-emerald-50",
      onClick: () => navigate("/groups"),
    },
    {
      label: "Pending faculty reviews",
      value: summary?.pendingApprovals ?? pending.length,
      icon: MessageSquare,
      detail: "Submissions awaiting a decision",
      tone: "text-amber-700 bg-amber-50",
      onClick: scrollToReviewQueue,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Institutional intelligence</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Analytics &amp; Faculty Review</h1>
          <p className="mt-2 text-sm text-slate-600">
            Repository performance, departmental reach, and your faculty review queue.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
            <Users className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-xs text-slate-500">Signed in as</span>
            <span className="block text-sm font-semibold text-slate-900">{user?.name || "Faculty reviewer"}</span>
          </span>
        </div>
      </header>

      <section aria-label="Repository analytics" className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Repository at a glance</h2>
          {loading && <span className="text-xs text-slate-500">Refreshing analytics…</span>}
        </div>
        <ErrorMessage>{summaryError || groupsError}</ErrorMessage>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="group rounded-2xl border border-slate-800 bg-[#0E1422] p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300/40 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-200" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {card.value === null || card.value === undefined ? (loading ? "…" : "—") : displayNumber(card.value)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-200">{card.label}</p>
              <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="repository-health-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Faculty overview</p>
            <h2 id="repository-health-heading" className="mt-1 font-serif text-xl font-semibold text-slate-900">Analytics &amp; Repository Health</h2>
          </div>
          <span className="text-xs text-slate-500">Live repository data</span>
        </div>
        <ErrorMessage>{realStatsError}</ErrorMessage>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submission status</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
                Approved · {realStats ? displayNumber(realStats.totalApprovedSubmissions) : loading ? "…" : "—"}
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-sm font-semibold text-amber-200">
                Pending · {realStats ? displayNumber(realStats.totalPendingSubmissions) : loading ? "…" : "—"}
              </span>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department uploads</h3>
            {departmentUploadCounts.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {departmentUploadCounts.map((item) => (
                  <span key={item.department} className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
                    {item.department} · {displayNumber(item.count)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{loading ? "Loading department uploads…" : "No department uploads to show."}</p>
            )}
          </article>
        </div>
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top 3 most viewed papers</h3>
          {topViewedPapers.length ? (
            <ol className="mt-3 grid gap-3 md:grid-cols-3">
              {topViewedPapers.map((paper, index) => (
                <li key={resourceId(paper)} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-400/10 text-xs font-bold text-indigo-200">{index + 1}</span>
                  <div className="min-w-0">
                    <Link to={`/resources/${resourceId(paper)}`} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-indigo-300">{paper.title}</Link>
                    <p className="mt-1 truncate text-xs text-slate-500">{paper.author || paper.department || "ScholarHub resource"}</p>
                    <p className="mt-2 text-xs tabular-nums text-slate-400">{displayNumber(paper.views)} views</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {loading ? "Loading most viewed papers…" : "No approved papers are available yet."}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="department-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Research footprint</p>
            <h2 id="department-heading" className="mt-1 font-serif text-xl font-semibold text-slate-900">Departmental distribution</h2>
          </div>
          <p className="text-xs text-slate-500">Share of approved repository manuscripts by department</p>
        </div>
        <ErrorMessage>{resourcesError}</ErrorMessage>
        {resources.length ? (
          <div className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
            {departmentDistribution.map((department) => (
              <div key={department.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{department.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {department.count} {department.count === 1 ? "paper" : "papers"} · {department.percentage}%
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${department.label} manuscript share`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={department.percentage}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-[width]"
                    style={{ width: `${department.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {loading ? "Loading department data…" : "No approved manuscripts are available to summarize."}
          </p>
        )}
      </section>

      {notice && (
        <p role="status" className="mt-5 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">{notice}</p>
      )}

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-4 pt-3 sm:px-6" role="tablist" aria-label="Dashboard sections">
          <button
            id="reviews-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "reviews"}
            aria-controls="reviews-panel"
            onClick={() => setActiveTab("reviews")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
              activeTab === "reviews"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Faculty review queue
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{pending.length}</span>
          </button>
          <button
            id="submissions-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "submissions"}
            aria-controls="submissions-panel"
            onClick={() => setActiveTab("submissions")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
              activeTab === "submissions"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileStack className="h-4 w-4" />
            {isReviewer ? "Faculty archive" : "My submissions"}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{managedResources.length}</span>
          </button>
          <button
            id="library-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "library"}
            aria-controls="library-panel"
            onClick={() => setActiveTab("library")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
              activeTab === "library"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            My saved library
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{savedResources.length}</span>
          </button>
        </div>

        {activeTab === "reviews" ? (
          <div id="reviews-panel" role="tabpanel" aria-labelledby="reviews-tab">
            <div id="pending-review-queue" className="flex flex-wrap items-end justify-between gap-2 px-4 pb-4 pt-5 sm:px-6">
              <div>
                <h2 className="font-serif text-xl font-semibold text-slate-900">Submissions awaiting your review</h2>
                <p className="mt-1 text-sm text-slate-500">Review the PDF, then approve or request a revision.</p>
              </div>
              <span className="text-xs text-slate-500">{pending.length} pending</span>
            </div>
            <ErrorMessage>{pendingError}</ErrorMessage>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold sm:px-6">Manuscript title</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Student name</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Department</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Submitted date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">PDF preview</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          <Check className="h-5 w-5" />
                        </span>
                        <p className="mt-3 font-medium text-slate-800">
                          {loading ? "Loading review queue…" : "You’re all caught up"}
                        </p>
                        {!loading && <p className="mt-1 text-xs text-slate-500">New student submissions will appear here.</p>}
                      </td>
                    </tr>
                  ) : pending.map((item) => {
                    const id = resourceId(item);
                    const pdf = fileHref(item);
                    const busy = reviewingId === id;
                    return (
                      <tr key={id} className="border-t border-slate-100">
                        <td className="max-w-xs px-4 py-4 font-semibold text-slate-900 sm:px-6">{item.title || "Untitled manuscript"}</td>
                        <td className="px-4 py-4 text-slate-700">{item.uploadedBy?.name || item.uploaderName || "Unknown student"}</td>
                        <td className="px-4 py-4 text-slate-600">{item.uploadedBy?.department || item.department || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-4">
                          {pdf ? (
                            <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-indigo-700 hover:text-indigo-900">
                              <FileText className="h-4 w-4" /> Preview PDF
                            </a>
                          ) : <span className="text-slate-400">Unavailable</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={Boolean(reviewingId)}
                              onClick={() => updateReview(item, "approved")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(reviewingId)}
                              onClick={() => {
                                setRevisionItem(item);
                                setFeedback("");
                                setReviewError("");
                              }}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" /> Request Revision / Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "submissions" ? (
          <div id="submissions-panel" role="tabpanel" aria-labelledby="submissions-tab" className="bg-[#060911]">
            <div className="px-4 pb-4 pt-5 sm:px-6">
              <h2 className="font-serif text-xl font-semibold text-white">{isReviewer ? "Faculty archive" : "My uploads / submissions"}</h2>
              <p className="mt-1 text-sm text-slate-400">Edit manuscript details or permanently remove a submission.</p>
            </div>
            {managementError && <p role="alert" className="mx-4 mb-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-200 sm:mx-6">{managementError}</p>}
            {managementNotice && <p role="status" className="mx-4 mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2 text-sm text-emerald-200 sm:mx-6">{managementNotice}</p>}
            {managedResources.length ? (
              <ul className="divide-y divide-slate-800">
                {managedResources.map((resource) => (
                  <li key={resourceId(resource)} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{resource.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {[resource.author, resource.department, resource.category, resource.year].filter(Boolean).join(" · ")}
                        {resource.status ? ` · ${resource.status}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => openEditModal(resource)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0E1422] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-300/50 hover:bg-indigo-300/[0.08] hover:text-indigo-100">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button type="button" onClick={() => deleteResource(resource)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/[0.12]">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-12 text-center text-sm text-slate-400">{loading ? "Loading submissions…" : "No submissions to manage."}</p>
            )}
          </div>
        ) : (
          <div id="library-panel" role="tabpanel" aria-labelledby="library-tab">
            <div className="px-4 pb-4 pt-5 sm:px-6">
              <h2 className="font-serif text-xl font-semibold text-slate-900">My saved library</h2>
              <p className="mt-1 text-sm text-slate-500">Bookmarked research, ready to pick up where you left off.</p>
            </div>
            <ErrorMessage>{resourcesError}</ErrorMessage>
            {savedResources.length ? (
              <ul className="divide-y divide-slate-100">
                {savedResources.map((resource) => (
                  <li key={resourceId(resource)} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{resource.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[resource.department, resource.category, resource.author].filter(Boolean).join(" · ") || "Saved manuscript"}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/resources/${resourceId(resource)}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:self-auto"
                    >
                      <BookOpen className="h-4 w-4" /> Read now
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Bookmark className="h-5 w-5" />
                </span>
                <p className="mt-3 font-medium text-slate-800">
                  {loading ? "Loading your saved library…" : "Your saved library is empty"}
                </p>
                {!loading && (
                  <p className="mt-1 text-sm text-slate-500">
                    Save documents from the repository and they’ll be ready to read here.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {revisionItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !reviewingId) setRevisionItem(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="revision-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Faculty decision</p>
                <h2 id="revision-title" className="mt-1 font-serif text-2xl font-semibold text-slate-900">Request a revision</h2>
              </div>
              <button
                type="button"
                aria-label="Close revision dialog"
                disabled={Boolean(reviewingId)}
                onClick={() => setRevisionItem(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              This will reject <span className="font-semibold text-slate-800">{revisionItem.title}</span> and send the optional feedback to its student author.
            </p>
            <label htmlFor="review-feedback" className="mt-5 block text-sm font-semibold text-slate-800">
              Feedback <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="review-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Explain what should be revised or why the submission was rejected."
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
            <ErrorMessage>{reviewError}</ErrorMessage>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(reviewingId)}
                onClick={() => setRevisionItem(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(reviewingId)}
                onClick={() => updateReview(revisionItem, "rejected", feedback)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                {reviewingId ? "Sending…" : "Reject & send feedback"}
              </button>
            </div>
          </section>
        </div>
      )}
      {editingResource && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/80 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingEdit) setEditingResource(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-resource-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0E1422] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Manuscript metadata</p>
                <h2 id="edit-resource-title" className="mt-1 font-serif text-2xl font-semibold text-white">Edit manuscript</h2>
              </div>
              <button type="button" aria-label="Close edit dialog" disabled={savingEdit} onClick={() => setEditingResource(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveResource} className="mt-5 space-y-4">
              {[
                ["title", "Title"],
                ["author", "Author"],
                ["department", "Department"],
                ["publicationYear", "Publication year"],
              ].map(([field, label]) => (
                <label key={field} className="block text-sm font-medium text-slate-300">
                  {label}
                  <input required={field === "title"} type={field === "publicationYear" ? "number" : "text"} min={field === "publicationYear" ? 1900 : undefined} max={field === "publicationYear" ? 2100 : undefined} value={editForm[field]} onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-300" />
                </label>
              ))}
              <label className="block text-sm font-medium text-slate-300">
                Category
                <select value={editForm.category} onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-300">
                  {["Books", "Research Papers", "Dissertations", "Seminar Reports", "Lecture Notes"].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Description
                <textarea rows={4} value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full resize-y rounded-xl border border-slate-700 bg-[#060911] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-300" />
              </label>
              {editError && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-200">{editError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={savingEdit} onClick={() => setEditingResource(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={savingEdit} className="inline-flex items-center gap-2 rounded-xl bg-indigo-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-indigo-200 disabled:cursor-wait disabled:opacity-60">
                  <Check className="h-4 w-4" /> {savingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

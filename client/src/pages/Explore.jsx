import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bookmark, Check, CircleCheck, Eye, FileText, LoaderCircle, Pencil, Quote, Search, Sparkles, Trash2, X } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const categories = [
  { label: "All", value: "All" },
  { label: "Books", value: "Books" },
  { label: "Papers", value: "Research Papers" },
  { label: "Theses", value: "Dissertations" },
  { label: "Lecture Notes", value: "Lecture Notes" },
];

function getResources(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.resources)) return data.resources;
  return [];
}

function identityId(identity) {
  return String(identity?._id || identity?.id || identity || "");
}

function matchesCategory(resourceCategory, selectedCategory) {
  if (selectedCategory === "All") return true;
  if (selectedCategory === "Dissertations") return ["Dissertations", "Theses"].includes(resourceCategory);
  return resourceCategory === selectedCategory;
}

function citationFor(resource) {
  const year = resource.year || (resource.createdAt ? new Date(resource.createdAt).getFullYear() : "n.d.");
  return `${resource.author || "Unknown author"}. (${year}). ${resource.title}. ScholarHub Digital Library${resource.department ? `. ${resource.department}` : ""}.`;
}

export default function Explore() {
  const location = useLocation();
  const { isAuthenticated, user, updateSavedResource } = useAuth();
  const isTeacher = user?.role?.toLowerCase()?.trim() === "teacher";
  const initialParams = new URLSearchParams(location.search);
  const initialCategory = categories.find(
    (item) => item.value === initialParams.get("category") || item.label === initialParams.get("category"),
  )?.label || "All";
  const [search, setSearch] = useState(initialParams.get("search") || "");
  const [category, setCategory] = useState(initialCategory);
  const [department, setDepartment] = useState(initialParams.get("department") || "All");
  const [sortBy, setSortBy] = useState("newest");
  const [activeTab, setActiveTab] = useState("catalog");
  const [resources, setResources] = useState([]);
  const [libraryResources, setLibraryResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [error, setError] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const [citationFeedback, setCitationFeedback] = useState({});
  const [bookmarkLoading, setBookmarkLoading] = useState("");
  const [bookmarkFeedback, setBookmarkFeedback] = useState({});
  const [editingResource, setEditingResource] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [managementFeedback, setManagementFeedback] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const selectedCategory = categories.find((item) => item.label === category)?.value || "All";
        const { data } = await api.get("/resources", {
          params: {
            search: search.trim() || undefined,
            category: selectedCategory !== "All" ? selectedCategory : undefined,
          },
          signal: controller.signal,
        });
        setResources(getResources(data).filter((resource) => !resource.status || resource.status === "approved"));
      } catch (requestError) {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") {
          setResources([]);
          setError("Unable to load the research catalog. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, category]);

  useEffect(() => {
    if (activeTab === "catalog") return undefined;
    if (!isAuthenticated) {
      setLibraryResources([]);
      setLibraryError("");
      setLibraryLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const loadPersonalResources = async () => {
      setLibraryLoading(true);
      setLibraryError("");
      try {
        const endpoint = activeTab === "saved"
          ? "/resources/user/saved"
          : activeTab === "reviewed" && isTeacher
            ? "/resources/reviewed-by-me"
            : "/resources/my";
        const { data } = await api.get(endpoint, { signal: controller.signal });
        setLibraryResources(getResources(data));
      } catch (requestError) {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") {
          setLibraryResources([]);
          setLibraryError(requestError.response?.data?.message || "Unable to load your library. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLibraryLoading(false);
      }
    };
    loadPersonalResources();
    return () => controller.abort();
  }, [activeTab, isAuthenticated, isTeacher, user?._id, user?.id]);

  const departments = useMemo(
    () => [...new Set(resources.map((resource) => resource.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [resources],
  );

  const visibleResources = useMemo(() => {
    const filteredResources = resources.filter((resource) => (
      matchesCategory(resource.category, categories.find((item) => item.label === category)?.value || "All")
      && (department === "All" || resource.department === department)
    ));
    const resourceDate = (resource) => {
      const date = new Date(resource.createdAt || (resource.year ? `${resource.year}-01-01` : 0)).getTime();
      return Number.isNaN(date) ? 0 : date;
    };
    const resourceViews = (resource) => Number(resource.views ?? resource.viewCount ?? resource.viewsCount ?? 0) || 0;

    return filteredResources.sort((first, second) => {
      if (sortBy === "views") return resourceViews(second) - resourceViews(first);
      if (sortBy === "title") return (first.title || "").localeCompare(second.title || "", undefined, { sensitivity: "base" });
      return resourceDate(second) - resourceDate(first);
    });
  }, [resources, category, department, sortBy]);

  const copyCitation = async (resource) => {
    const id = resource._id || resource.id;
    try {
      await navigator.clipboard.writeText(citationFor(resource));
      setCitationFeedback((previous) => ({ ...previous, [id]: "APA citation copied" }));
    } catch {
      setCitationFeedback((previous) => ({ ...previous, [id]: "Clipboard access is unavailable" }));
    }
  };

  const toggleBookmark = async (resource) => {
    const id = resource._id || resource.id;
    if (!isAuthenticated) {
      setBookmarkFeedback((previous) => ({ ...previous, [id]: "Sign in to save this resource to your library." }));
      return;
    }
    setBookmarkLoading(id);
    setBookmarkFeedback((previous) => ({ ...previous, [id]: "" }));
    try {
      const { data } = await api.post(`/resources/${id}/bookmark`);
      updateSavedResource(id, Boolean(data.isBookmarked));
      if (activeTab === "saved" && !data.isBookmarked) {
        setLibraryResources((previous) => previous.filter((item) => String(item._id || item.id) !== String(id)));
      }
      setBookmarkFeedback((previous) => ({
        ...previous,
        [id]: data.isBookmarked ? "Saved to your library." : "Removed from your library.",
      }));
    } catch (requestError) {
      setBookmarkFeedback((previous) => ({
        ...previous,
        [id]: requestError.response?.data?.message || "Unable to update your library. Please try again.",
      }));
    } finally {
      setBookmarkLoading("");
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
    setManagementFeedback("");
  };

  const saveResource = async (event) => {
    event.preventDefault();
    if (!editingResource || !editForm) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const id = editingResource._id || editingResource.id;
      const { data } = await api.put(`/resources/${id}`, editForm);
      setLibraryResources((current) => current.map((resource) => (
        String(resource._id || resource.id) === String(id) ? data.resource : resource
      )));
      setResources((current) => current.map((resource) => (
        String(resource._id || resource.id) === String(id) ? data.resource : resource
      )));
      setEditingResource(null);
      setEditForm(null);
      setManagementFeedback("Manuscript updated successfully.");
    } catch (requestError) {
      setEditError(requestError.response?.data?.message || "Unable to update this manuscript.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteResource = async (resource) => {
    if (!window.confirm("Are you sure you want to permanently delete this manuscript?")) return;
    const id = resource._id || resource.id;
    setManagementFeedback("");
    setLibraryResources((current) => current.filter((item) => String(item._id || item.id) !== String(id)));
    setResources((current) => current.filter((item) => String(item._id || item.id) !== String(id)));
    try {
      await api.delete(`/resources/${id}`);
      setManagementFeedback("Manuscript deleted successfully.");
    } catch (requestError) {
      setLibraryResources((current) => [resource, ...current]);
      setResources((current) => [resource, ...current]);
      setManagementFeedback(requestError.response?.data?.message || "Unable to delete this manuscript.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setDepartment("All");
  };

  const displayedResources = activeTab === "catalog"
    ? visibleResources
    : activeTab === "submissions"
      ? libraryResources.filter((resource) => identityId(resource.uploadedBy) === identityId(user))
      : libraryResources;
  const displayedLoading = activeTab === "catalog" ? loading : libraryLoading;
  const displayedError = activeTab === "catalog" ? error : libraryError;

  return (
    <div className="min-h-screen bg-[#060911] text-slate-200">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#060911]/95 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {activeTab === "catalog" && (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-[#0E1422] px-4 transition focus-within:border-indigo-300/60">
                  <Search className="h-5 w-5 shrink-0 text-indigo-200" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search manuscripts, authors, or ideas..."
                    aria-label="Search manuscripts"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-[#0E1422] px-3 text-xs font-medium text-slate-400 lg:min-w-56">
                  <span className="shrink-0">Department</span>
                  <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none">
                    <option className="bg-[#0E1422]" value="All">All departments</option>
                    {department !== "All" && !departments.includes(department) && <option className="bg-[#0E1422]" value={department}>{department}</option>}
                    {departments.map((name) => <option className="bg-[#0E1422]" key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
                <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
                {categories.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setCategory(item.label)}
                    aria-pressed={category === item.label}
                    className={`min-h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition active:scale-[0.97] ${category === item.label ? "border-indigo-200 bg-indigo-300 text-slate-950 shadow-md shadow-indigo-950/30" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-white"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              {activeTab === "catalog" ? "Academic catalog" : activeTab === "saved" ? "Personal digital library" : activeTab === "reviewed" ? "Faculty reviews" : "Your contributions"}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-white">
              {activeTab === "catalog" ? "Explore Manuscripts" : activeTab === "saved" ? "Saved Papers" : activeTab === "reviewed" ? "Reviewed by Me" : "My submissions"}
            </h1>
          </div>
          {activeTab === "catalog" && !loading && !error && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-400">{visibleResources.length} {visibleResources.length === 1 ? "manuscript" : "manuscripts"}</p>
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-[#0E1422] px-3 text-xs font-medium text-slate-400 transition focus-within:border-indigo-300/60">
                <span className="shrink-0">Sort by:</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort manuscripts" className="bg-transparent py-2 text-sm text-white outline-none">
                  <option className="bg-[#0E1422]" value="newest">Newest First</option>
                  <option className="bg-[#0E1422]" value="views">Most Viewed</option>
                  <option className="bg-[#0E1422]" value="title">Title (A-Z)</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-800" role="tablist" aria-label="Research library">
          {[
            ["catalog", "Public catalog"],
            ["submissions", "My submissions"],
            ...(isTeacher ? [["reviewed", "Reviewed by Me"]] : []),
            ["saved", "Saved Papers"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-indigo-300 text-indigo-100"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!isAuthenticated && activeTab !== "catalog" ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0E1422] px-6 py-12 text-center">
            <p className="text-sm text-slate-300">Sign in to view your {activeTab === "saved" ? "saved papers" : activeTab === "reviewed" ? "reviewed manuscripts" : "submissions"}.</p>
            <Link to="/login" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-indigo-200">Sign in</Link>
          </div>
        ) : null}

        {displayedError && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">{displayedError}</p>}
        {managementFeedback && <p role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${managementFeedback.startsWith("Unable") ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-200" : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"}`}>{managementFeedback}</p>}
        {displayedLoading && <p role="status" className="py-12 text-center text-sm text-slate-400">Loading manuscripts…</p>}

        {isAuthenticated || activeTab === "catalog" ? !displayedLoading && !displayedError && displayedResources.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0E1422]/60 px-6 py-16 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-500" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-white">
              {activeTab === "saved" ? "No saved papers yet." : activeTab === "submissions" ? "You haven’t submitted any papers yet." : activeTab === "reviewed" ? "You haven’t approved any manuscripts yet." : "No manuscripts found matching your criteria."}
            </p>
            {activeTab === "catalog" && <button type="button" onClick={clearFilters} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-indigo-200 active:scale-[0.98]">Clear Filters</button>}
          </div>
        ) : null}

        {(isAuthenticated || activeTab === "catalog") && !displayedLoading && !displayedError && displayedResources.length > 0 && (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedResources.map((resource) => {
              const id = resource._id || resource.id;
              const year = resource.year || (resource.createdAt ? new Date(resource.createdAt).getFullYear() : null);
              const saved = Boolean(user?.savedResources?.some((item) => String(item?._id || item?.id || item) === String(id)));
              const views = Number(resource.views ?? resource.viewCount ?? resource.viewsCount ?? 0) || 0;
              return (
                <article key={id || resource.title} className="flex min-w-0 flex-col rounded-2xl border border-slate-800 bg-[#0E1422] p-5 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300/40 hover:shadow-xl hover:shadow-black/20">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-indigo-300/20 bg-indigo-300/[0.08] px-3 py-1 text-xs font-semibold text-indigo-100">{resource.category || "Academic Resource"}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-slate-500">
                        {year || "Year unavailable"}
                        <span aria-hidden="true">•</span>
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {views} views
                      </span>
                      {id && (
                        <button
                          type="button"
                          onClick={() => toggleBookmark(resource)}
                          disabled={Boolean(bookmarkLoading)}
                          aria-label={saved ? "Remove bookmark" : "Save to Personal Library"}
                          aria-pressed={saved}
                          title={saved ? "Saved to your library" : "Save to your library"}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition duration-200 disabled:cursor-wait disabled:opacity-60 ${saved ? "border-indigo-300/30 bg-indigo-300/10 text-indigo-200" : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-indigo-300/30 hover:bg-indigo-300/[0.08] hover:text-indigo-100"}`}
                        >
                          {bookmarkLoading === id
                            ? <LoaderCircle className="h-4 w-4 animate-spin" />
                            : saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-bold leading-snug text-white">{resource.title}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-300">{resource.author || "Unknown author"}</p>
                  <p className="mt-1 text-xs text-slate-500">{resource.department || "Academic Department"}</p>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <p>Submitted by: {resource.uploadedBy?.name || resource.author || "Student"} ({resource.uploadedBy?.department || "Student"})</p>
                    {resource.status === "approved" && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
                        <CircleCheck className="h-3.5 w-3.5" aria-label="Verified" />
                        <span>Peer-Verified by Prof. {resource.approvedBy?.name || "Faculty Reviewer"}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-slate-400">{resource.abstract || resource.description || `Archived academic work in ${resource.department || "an academic department"}. Open manuscript to read full documentation and findings.`}</p>
                  {resource.reviewerFeedback && (
                    <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-xs leading-5 text-emerald-100">
                      <span className="font-semibold">Faculty Endorsement / Feedback:</span> {resource.reviewerFeedback}
                    </p>
                  )}
                  {bookmarkFeedback[id] && <p role="status" className="mt-2 text-xs text-indigo-200">{bookmarkFeedback[id]}</p>}
                  <div className="mt-5 flex w-fit items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1.5 text-xs font-semibold text-emerald-200">
                    <Sparkles className="h-3.5 w-3.5" /> AI Summary Ready
                  </div>
                  {activeTab === "submissions" && id && (
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => openEditModal(resource)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-300/50 hover:bg-indigo-300/[0.08] hover:text-indigo-100">
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button type="button" onClick={() => deleteResource(resource)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-300/50 hover:bg-rose-400/[0.12]">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                  <div className="mt-4 grid gap-2 border-t border-slate-800 pt-4">
                    {id ? (
                      <>
                        <Link to={`/resources/${id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 active:scale-[0.99]">
                          <FileText className="h-4 w-4" /> Read Manuscript (PDF)
                        </Link>
                        <Link to={`/resources/${id}?tab=summary#ai-summary`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-300/35 bg-indigo-300/[0.08] px-4 py-2.5 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200/60 hover:bg-indigo-300/[0.14] active:scale-[0.99]">
                          <Sparkles className="h-4 w-4" /> Open AI Summary
                        </Link>
                        <button type="button" onClick={() => copyCitation(resource)} aria-label={citationFeedback[id] || "Copy APA citation"} title={citationFeedback[id] || "Copy APA citation"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white active:scale-[0.99]">
                          {citationFeedback[id] === "APA citation copied" ? <Check className="h-4 w-4 text-emerald-300" /> : <Quote className="h-4 w-4" />} Cite (APA)
                        </button>
                        {citationFeedback[id] && <span role="status" className={`text-center text-xs ${citationFeedback[id] === "APA citation copied" ? "text-emerald-300" : "text-rose-300"}`}>{citationFeedback[id]}</span>}
                      </>
                    ) : (
                      <p className="text-xs text-amber-200">This record is missing its resource identifier.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      {editingResource && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/80 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingEdit) setEditingResource(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="explore-edit-resource-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0E1422] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Manuscript metadata</p>
                <h2 id="explore-edit-resource-title" className="mt-1 font-serif text-2xl font-semibold text-white">Edit manuscript</h2>
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
                  {["Books", "Research Papers", "Dissertations", "Seminar Reports", "Lecture Notes"].map((categoryItem) => <option key={categoryItem} value={categoryItem}>{categoryItem}</option>)}
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

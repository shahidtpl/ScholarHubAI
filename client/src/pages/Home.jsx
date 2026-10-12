import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Eye,
  FileText,
  GraduationCap,
  Landmark,
  Quote,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import api from "../api/axios.js";

const quickFilters = [
  { label: "All", value: "" },
  { label: "Books", value: "Books" },
  { label: "Theses", value: "Dissertations" },
  { label: "Seminar Reports", value: "Seminar Reports" },
];

function getResources(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.resources)) return data.resources;
  return [];
}

function getGroups(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.groups)) return data.groups;
  return [];
}

function getId(item) {
  return String(item?._id || item?.id || "");
}

function getViewCount(resource) {
  return Number(resource.views ?? resource.viewCount ?? resource.viewsCount ?? 0) || 0;
}

function authorInitials(name) {
  return String(name || "")
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function categoryLabel(category) {
  if (category === "Research Papers") return "Research Paper";
  if (category === "Dissertations") return "Thesis";
  return category || "Academic Resource";
}

function apaCitation(resource) {
  const year = resource.year || (resource.createdAt ? new Date(resource.createdAt).getFullYear() : "n.d.");
  return `${resource.author || "Unknown author"}. (${year}). ${resource.title}. ScholarHub Digital Library${resource.department ? `. ${resource.department}` : ""}.`;
}

function departmentIcon(name) {
  const department = name.toLowerCase();
  if (/computer|data|technology|engineering|math|physics/.test(department)) return BrainCircuit;
  if (/history|politic|law|econom/.test(department)) return Landmark;
  if (/social|psychology|sociology|education/.test(department)) return Users;
  if (/humanit|literature|language|arts/.test(department)) return BookOpen;
  return GraduationCap;
}

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [resources, setResources] = useState([]);
  const [groups, setGroups] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [resourceError, setResourceError] = useState("");
  const [groupError, setGroupError] = useState("");
  const [citationNotice, setCitationNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get("/resources", { signal: controller.signal })
      .then(({ data }) => {
        const approved = getResources(data)
          .filter((resource) => !resource.status || resource.status === "approved")
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setResources(approved);
      })
      .catch((requestError) => {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") {
          setResourceError("Unable to load the latest manuscripts. Please try again later.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setResourcesLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/groups", { signal: controller.signal })
      .then(({ data }) => setGroups(getGroups(data)))
      .catch((requestError) => {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") {
          setGroupError("Unable to load research circle data.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setGroupsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const departments = useMemo(() => {
    const counts = new Map();
    resources.forEach((resource) => {
      const name = resource.department?.trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, icon: departmentIcon(name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resources]);

  const featuredResource = useMemo(
    () => [...resources].sort((a, b) => getViewCount(b) - getViewCount(a))[0],
    [resources],
  );

  const activeMembers = useMemo(() => {
    const members = new Map();
    groups.forEach((group) => {
      (group.members || []).forEach((member) => {
        const name = typeof member === "string" ? "" : member?.name;
        const id = getId(member) || name;
        if (name && id && !members.has(id)) members.set(id, name);
      });
    });
    return [...members.values()].slice(0, 4);
  }, [groups]);

  const searchLibrary = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/explore?search=${encodeURIComponent(query)}` : "/explore");
  };

  const copyCitation = async (resource) => {
    try {
      await navigator.clipboard.writeText(apaCitation(resource));
      setCitationNotice(`APA citation copied for “${resource.title}”.`);
    } catch {
      setCitationNotice("Clipboard access is unavailable. Open the manuscript to copy its citation.");
    }
  };

  return (
    <div className="min-h-screen bg-[#060911] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950/80 to-[#060911] text-slate-200">
      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10" aria-labelledby="home-title">
          <div className="min-w-0 lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-800/40 bg-indigo-950/60 px-3 py-1 text-xs text-indigo-300">
              <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
              ScholarHub Digital Library
            </span>
            <h1 id="home-title" className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                Advancing Scholarly Discovery &amp; Preservation
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              Explore peer-reviewed manuscripts, discover new perspectives, and connect with the people advancing your field.
            </p>

            <form onSubmit={searchLibrary} className="mt-6">
              <label className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-800 bg-[#0B101D]/90 p-2 shadow-xl shadow-black/20 transition focus-within:border-indigo-500/70 focus-within:ring-4 focus-within:ring-indigo-500/10">
                <Search className="ml-2 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search manuscripts, authors, or ideas..."
                  aria-label="Search manuscripts"
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-0 sm:text-base"
                />
                <span className="hidden shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-500 sm:inline-flex">Enter</span>
                <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-indigo-200 active:scale-[0.98] sm:px-5">
                  Search <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </label>
            </form>

            <nav aria-label="Quick manuscript filters" className="mt-4 -mx-1 overflow-x-auto px-1">
              <div className="flex w-max min-w-full gap-2 pb-1">
                {quickFilters.map((filter) => {
                  const query = filter.value ? `?category=${encodeURIComponent(filter.value)}` : "";
                  return (
                    <Link
                      key={filter.label}
                      to={`/explore${query}`}
                      className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-slate-800 bg-[#0B101D]/80 px-3.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-100"
                    >
                      {filter.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400 sm:text-sm" aria-label="Live library statistics">
              <span><strong className="font-semibold text-white">{resourcesLoading ? "…" : resourceError ? "Unavailable" : resources.length.toLocaleString()}</strong> Manuscripts</span>
              <span className="hidden text-slate-700 sm:inline" aria-hidden="true">•</span>
              <span><strong className="font-semibold text-white">{groupsLoading ? "…" : groupError ? "Unavailable" : groups.length.toLocaleString()}</strong> Research Circles</span>
              <span className="hidden text-slate-700 sm:inline" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />100% Peer-Verified</span>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0B101D]/90 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6 lg:col-span-5" aria-labelledby="featured-title">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p id="featured-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">Featured Research Spotlight</p>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-950/50 px-2.5 py-1 text-[10px] text-slate-400">
                  <Sparkles className="h-3 w-3 text-indigo-300" aria-hidden="true" /> Editor&apos;s pick
                </span>
              </div>
              {featuredResource ? (
                <>
                  <p className="mt-6 text-xs font-medium text-indigo-300">{featuredResource.department || categoryLabel(featuredResource.category)}</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug text-white sm:text-3xl">{featuredResource.title}</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300/20 bg-indigo-300/10 text-xs font-bold text-indigo-100">
                      {authorInitials(featuredResource.author) || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{featuredResource.author || "Unknown author"}</p>
                      <p className="text-xs text-slate-500">{categoryLabel(featuredResource.category)}{featuredResource.year ? ` · ${featuredResource.year}` : ""}</p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-400">
                    {featuredResource.abstract || featuredResource.description || "Open this manuscript to explore its research and full publication details."}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Eye className="h-3.5 w-3.5" />{getViewCount(featuredResource).toLocaleString()} reads</span>
                    {getId(featuredResource) ? (
                      <Link to={`/resources/${getId(featuredResource)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 active:scale-[0.99]">
                        <FileText className="h-4 w-4" aria-hidden="true" /> Read Manuscript
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">Manuscript details unavailable</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="relative mt-6 rounded-xl border border-dashed border-slate-700 p-5 text-sm leading-6 text-slate-400">
                  {resourcesLoading ? "Finding a featured manuscript…" : resourceError || "No approved manuscripts are available yet."}
                </p>
              )}
            </div>
          </aside>
        </section>

        <section aria-labelledby="browse-disciplines">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Browse the collection</p>
              <h2 id="browse-disciplines" className="mt-2 font-serif text-2xl font-semibold text-white sm:text-3xl">Explore by discipline</h2>
            </div>
            <Link to="/explore" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-indigo-200 transition hover:text-white">
              All disciplines <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {resourceError ? (
            <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">{resourceError}</p>
          ) : resourcesLoading ? (
            <p role="status" className="mt-5 text-sm text-slate-400">Loading disciplines…</p>
          ) : departments.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-800 p-6 text-sm text-slate-400">Department collections will appear as manuscripts are added to the archive.</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {departments.map(({ name, count, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => navigate(`/explore?department=${encodeURIComponent(name)}`)}
                  className="group rounded-2xl border border-slate-800 bg-[#0B101D]/85 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-[#0D1423] sm:p-5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-400/[0.08] text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.08)] transition group-hover:border-indigo-300/30 group-hover:bg-indigo-400/[0.14]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-3">
                    <span className="truncate font-semibold text-white">{name}</span>
                    <span className="shrink-0 rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-1 text-[10px] font-medium text-slate-400">
                      {count} {count === 1 ? "Manuscript" : "Manuscripts"}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-5 text-slate-500">Explore scholarship from this department</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="latest-manuscripts">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live Archive
              </p>
              <h2 id="latest-manuscripts" className="mt-2 font-serif text-2xl font-semibold text-white sm:text-3xl">Latest Academic Manuscripts</h2>
            </div>
            <Link to="/explore" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-indigo-200 transition hover:text-white">
              View All Manuscripts <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {citationNotice && <p role="status" className="mt-4 text-sm text-emerald-300">{citationNotice}</p>}
          {resourceError && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">{resourceError}</p>}
          {resourcesLoading && <p role="status" className="mt-5 text-sm text-slate-400">Loading the latest manuscripts…</p>}
          {!resourcesLoading && !resourceError && resources.length === 0 && (
            <p className="mt-5 rounded-xl border border-dashed border-slate-800 p-7 text-center text-sm text-slate-400">No approved manuscripts are available yet.</p>
          )}

          {!resourcesLoading && resources.length > 0 && (
            <div className="mt-5 columns-1 gap-4 sm:columns-2 xl:columns-3">
              {resources.slice(0, 6).map((resource) => {
                const id = getId(resource);
                const author = resource.author || "Unknown author";
                const abstract = resource.abstract || resource.description || "No abstract is available for this manuscript.";
                return (
                  <article key={id || resource.title} className="mb-4 break-inside-avoid rounded-2xl border border-slate-800/90 bg-[#0C1220] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="max-w-full truncate rounded-full border border-indigo-300/15 bg-indigo-300/[0.07] px-2.5 py-1 text-[10px] font-semibold text-indigo-200">
                        {resource.department || categoryLabel(resource.category)}
                      </span>
                      <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[10px] text-slate-400">{categoryLabel(resource.category)}</span>
                    </div>
                    <h3 className="mt-4 font-serif text-xl font-semibold leading-snug text-white">{resource.title}</h3>
                    <div className="mt-3 flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 text-[10px] font-bold text-slate-200">
                        {authorInitials(author) || "?"}
                      </span>
                      <span className="min-w-0 truncate text-xs font-medium text-slate-300">{author}</span>
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                        <Eye className="h-3 w-3" aria-hidden="true" />{getViewCount(resource).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-400">{abstract}</p>
                    {id ? (
                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4">
                        <Link to={`/resources/${id}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-200">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Read PDF
                        </Link>
                        <Link to={`/resources/${id}?tab=summary#ai-summary`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-indigo-300/20 bg-indigo-300/[0.06] px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:border-indigo-200/50 hover:bg-indigo-300/[0.12]">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI Summary
                        </Link>
                        <button
                          type="button"
                          onClick={() => copyCitation(resource)}
                          title="Copy APA citation"
                          aria-label={`Copy APA citation for ${resource.title}`}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          <Quote className="h-3.5 w-3.5" aria-hidden="true" /> Cite
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 border-t border-slate-800 pt-4 text-xs text-amber-200">This record is missing its resource identifier.</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-950/70 via-[#10172A] to-[#0C1820] p-5 sm:p-7" aria-labelledby="circles-title">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-400/[0.08] blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">Research, together</p>
              <h2 id="circles-title" className="mt-2 font-serif text-2xl font-semibold text-white">Good ideas grow in company.</h2>
              <p className="text-slate-300 text-sm font-normal mt-1 max-w-xl leading-6">Find your people, share manuscripts, and move your research forward in a circle.</p>
              {groupError && <p role="status" className="mt-2 text-xs text-amber-200">{groupError}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
              <div className="flex -space-x-2" aria-label={`${activeMembers.length} active circle members`}>
                {activeMembers.map((name, index) => (
                  <span
                    key={name}
                    title={name}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#10172A] ring-2 ring-indigo-500/30 text-[10px] font-bold text-white ${index % 3 === 0 ? "bg-indigo-500" : index % 3 === 1 ? "bg-sky-700" : "bg-emerald-700"}`}
                  >
                    {authorInitials(name) || "?"}
                  </span>
                ))}
                {activeMembers.length === 0 && !groupsLoading && (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#10172A] ring-2 ring-indigo-500/30 bg-slate-700 text-slate-200">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                {groupsLoading && <span className="h-9 w-9 animate-pulse rounded-full border-2 border-[#10172A] ring-2 ring-indigo-500/30 bg-slate-700" />}
              </div>
              <Link to="/groups" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition duration-200">
                Join or Form Circle <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import GroupDetail from "./GroupDetail.jsx";

const departments = [
  "Computer Science",
  "Economics",
  "History",
  "Mathematics",
  "Literature",
  "Physics",
  "Biology",
  "Political Science",
];

function getId(value) {
  return String(value?._id || value?.id || value || "");
}

function getResources(group) {
  const resources = [...(group.resources || []), ...(group.sharedResources || [])];
  return [...new Map(resources.map((resource) => [getId(resource), resource])).values()];
}

function getCreatorRole(group) {
  const role = group.createdBy?.role;
  if (role === "teacher" || role === "admin") return "Faculty";
  if (role === "researcher") return "Researcher";
  return "Student";
}

export default function Groups() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user && token);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [pendingGroup, setPendingGroup] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [authToast, setAuthToast] = useState("");

  useEffect(() => {
    if (!authToast) return undefined;
    const timeout = setTimeout(() => setAuthToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [authToast]);

  const requireAuthentication = (message) => {
    setAuthModalMessage(message);
    setShowAuthModal(true);
  };

  const handleAuthenticationFailure = (message) => {
    requireAuthentication(message);
    setAuthToast("Your session may have expired. Please sign in to continue.");
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/groups", {
          params: {
            search: search.trim() || undefined,
            department: department !== "All departments" ? department : undefined,
          },
          signal: controller.signal,
        });
        setGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch (requestError) {
        if (requestError.name !== "CanceledError") {
          setError(requestError.response?.data?.message || "Unable to load research circles. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, department]);

  const availableDepartments = useMemo(
    () => [...new Set([...departments, ...groups.map((group) => group.department).filter(Boolean)])].sort(),
    [groups],
  );

  const isMember = (group) =>
    Boolean(user && group.members?.some((member) => getId(member) === getId(user)));

  const updateGroup = (nextGroup) => {
    setGroups((current) => current.map((group) => getId(group) === getId(nextGroup) ? nextGroup : group));
    setActiveGroup((current) => current && getId(current) === getId(nextGroup) ? nextGroup : current);
  };

  const enterCircle = async (group) => {
    if (!isAuthenticated) {
      requireAuthentication("Sign in to access group discussions, view shared manuscripts, and participate in academic forums.");
      return;
    }
    setWorkspaceLoading(true);
    try {
      const { data } = await api.get(`/groups/${getId(group)}`);
      setActiveGroup(data.group);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        handleAuthenticationFailure("Sign in to access group discussions, view shared manuscripts, and participate in academic forums.");
      } else {
        setNotice(requestError.response?.data?.message || "Unable to open this circle. Please try again.");
      }
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const toggleMembership = async (group) => {
    if (!isAuthenticated) {
      requireAuthentication("Sign in to join academic research circles, collaborate with peers, and share references.");
      return;
    }
    setPendingGroup(getId(group));
    setNotice("");
    try {
      const { data } = await api.post(`/groups/${getId(group)}/join`);
      const members = data.joined
        ? [...(group.members || []), user]
        : (group.members || []).filter((member) => getId(member) !== getId(user));
      updateGroup({ ...group, members });
      setNotice(data.joined ? `You joined ${group.name}.` : `You left ${group.name}.`);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        handleAuthenticationFailure("Sign in to join academic research circles, collaborate with peers, and share references.");
      } else {
        setNotice(requestError.response?.data?.message || "Unable to update circle membership. Please try again.");
      }
    } finally {
      setPendingGroup("");
    }
  };

  const leaveCircle = (groupId) => {
    setGroups((current) => current.map((group) => (
      getId(group) === groupId
        ? { ...group, members: (group.members || []).filter((member) => getId(member) !== getId(user)) }
        : group
    )));
    setActiveGroup(null);
    setNotice("You left the research circle.");
  };

  const createGroup = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!isAuthenticated) {
      setFormError("Log in to create a research circle.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    setCreating(true);
    try {
      const { data } = await api.post("/groups", {
        name: formData.get("name"),
        department: formData.get("department"),
        description: formData.get("description"),
      });
      const createdGroup = {
        ...data.group,
        createdBy: user,
        members: [user],
        resources: [],
        sharedResources: [],
        messages: [],
      };
      setGroups((current) => [createdGroup, ...current]);
      setModalOpen(false);
      setSearch("");
      setDepartment("All departments");
      setNotice(`${createdGroup.name} was created.`);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        handleAuthenticationFailure("Sign in to create a research circle and collaborate with peers.");
      } else {
        setFormError(requestError.response?.data?.message || "Unable to create the circle. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-200">
              <Users className="h-3.5 w-3.5" />
              SCHOLARHUB COMMUNITY
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Research Collaboration Circles
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Join departmental reading groups, share citations, and collaborate on academic research.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setFormError(""); setModalOpen(true); }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Plus className="h-4 w-4" />
            Create Research Circle
          </button>
        </div>

        {notice && (
          <p role="status" className="mt-6 rounded-xl border border-indigo-300/20 bg-indigo-300/10 px-4 py-3 text-sm text-indigo-100">
            {notice}
            {!isAuthenticated && notice.startsWith("Authentication required") && (
              <Link to="/login" className="ml-2 font-semibold underline underline-offset-4">Log in</Link>
            )}
          </p>
        )}
        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/55 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur sm:p-5" aria-label="Search research circles">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search research circles by name or topic..."
                aria-label="Search research circles by name or topic"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3.5 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10"
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-4 focus-within:border-indigo-400/70">
              <span className="shrink-0 text-xs font-medium text-slate-500">Department</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-200 outline-none">
                <option value="All departments" className="bg-slate-900">All departments</option>
                {availableDepartments.map((item) => <option key={item} value={item} className="bg-slate-900">{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <div className="mt-10 flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-white">Explore circles</h2>
            <p className="mt-1 text-sm text-slate-500">Find your research community and exchange knowledge.</p>
          </div>
          {!loading && <span className="text-xs font-medium text-slate-500">{groups.length} {groups.length === 1 ? "circle" : "circles"}</span>}
        </div>

        {loading ? (
          <p className="py-14 text-center text-sm text-slate-400">Loading research circles…</p>
        ) : groups.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-500" />
            <h3 className="mt-4 font-medium text-white">{search || department !== "All departments" ? "No circles match these filters" : "No research circles yet"}</h3>
            <p className="mt-2 text-sm text-slate-400">{search || department !== "All departments" ? "Try another search or department." : "Create the first circle and invite your department to join."}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const member = isMember(group);
              const groupMembers = Array.isArray(group.members) ? group.members : [];
              const papers = getResources(group);
              const groupId = getId(group);
              return (
                <article key={groupId} className="flex min-h-72 flex-col rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_14px_38px_rgba(0,0,0,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-300/25">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl font-semibold leading-snug text-white">{group.name}</h3>
                    <span className="shrink-0 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2.5 py-1 text-[11px] font-medium text-indigo-200">{group.department || "Interdisciplinary"}</span>
                  </div>
                  <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-400">
                    {group.description || "A space for researchers to exchange ideas and work together."}
                  </p>
                  <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-950/40 px-2.5 py-1.5 text-[11px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    Initiated by {getCreatorRole(group)}
                    {group.createdBy?.name && <span className="text-slate-500">· {group.createdBy.name}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-300" />
                      {groupMembers.length} {groupMembers.length === 1 ? "Member" : "Members"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-300" />
                      {papers.length} {papers.length === 1 ? "Paper" : "Papers"}
                    </span>
                  </div>
                  <div className="mt-auto grid gap-2 pt-6">
                    {member ? (
                      <>
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5 text-sm font-semibold text-emerald-200">
                          <Check className="h-4 w-4" /> Joined
                        </span>
                        <button type="button" onClick={() => enterCircle(group)} disabled={workspaceLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-400 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-wait disabled:opacity-60">
                          <BookOpen className="h-4 w-4" /> {workspaceLoading ? "Opening…" : "Enter Circle"}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => toggleMembership(group)} disabled={pendingGroup === groupId} className="w-full rounded-xl bg-emerald-400 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">
                        {pendingGroup === groupId ? "Joining…" : "Join Circle"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-group-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-group-title" className="font-serif text-2xl font-semibold text-white">Create a research circle</h2>
                <p className="mt-1 text-sm text-slate-400">Start a focused space for your academic community.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={createGroup} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Circle name
                <input required maxLength={120} name="name" placeholder="e.g. Modern Literature Reading Circle" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400" />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Department / subject area
                <input name="department" list="circle-departments" placeholder="e.g. Computer Science" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400" />
                <datalist id="circle-departments">{availableDepartments.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Purpose and focus
                <textarea name="description" rows={4} maxLength={2000} placeholder="What will your group read, discuss, or research?" className="mt-1.5 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400" />
              </label>
              {formError && <p role="alert" className="text-sm text-rose-300">{formError}</p>}
              {!isAuthenticated && <p className="text-sm text-slate-400">You’ll need to <Link to="/login" className="font-semibold text-indigo-300 underline underline-offset-4">log in</Link> to create a circle.</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={creating || !isAuthenticated} className="rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Creating…" : "Create Circle"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAuthModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-required-title"
            className="w-full max-w-md rounded-2xl border border-indigo-400/25 bg-[#0E1422] p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-300/10 text-indigo-200">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <h2 id="auth-required-title" className="font-serif text-xl font-semibold text-white">
                  Authentication Required
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                aria-label="Close authentication prompt"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{authModalMessage}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/login", { state: { from: "/groups" } })}
                className="rounded-xl bg-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300/40 hover:bg-slate-800"
              >
                Create Account
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-white"
            >
              Cancel
            </button>
          </section>
        </div>
      )}

      {authToast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border border-amber-300/20 bg-slate-900 px-4 py-3 text-sm text-amber-100 shadow-xl"
        >
          {authToast}
        </div>
      )}

      {activeGroup && <GroupDetail group={activeGroup} onClose={() => setActiveGroup(null)} onGroupChange={updateGroup} onLeave={leaveCircle} />}
    </div>
  );
}

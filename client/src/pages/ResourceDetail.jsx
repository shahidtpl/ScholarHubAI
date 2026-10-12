import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Quote,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  X,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { DUMMY_RESOURCES, findDummyById } from "../data/dummyResources.js";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const panelClass = "rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_50px_rgba(0,0,0,0.18)]";
const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15";

function citationYear(resource) {
  return resource.year || (resource.createdAt ? new Date(resource.createdAt).getFullYear() : new Date().getFullYear());
}

function apaCitation(resource) {
  return `${resource.author || "Unknown"}. (${citationYear(resource)}). ${resource.title}. ScholarHub Digital Library${resource.department ? `. ${resource.department}` : ""}.`;
}

function mlaCitation(resource) {
  return `${resource.author || "Unknown"}. "${resource.title}." ScholarHub Digital Library, ${citationYear(resource)}, ${resource.category}.`;
}

function identityId(identity) {
  return String(identity?._id || identity?.id || identity || "");
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function resourceFileHref(fileUrl) {
  if (typeof fileUrl !== "string" || !fileUrl) return "";
  const storedPath = fileUrl
    .replace(/^https?:\/\/[^/]+/i, "")
    .split(/[?#]/, 1)[0];
  const filename = storedPath.split("/").filter(Boolean).pop();
  return filename ? `${API_BASE}/uploads/${encodeURIComponent(filename)}` : "";
}

function roleLabel(role) {
  const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : "";
  return normalizedRole === "teacher" || normalizedRole === "admin" ? "Teacher" : "Student";
}

function Stars({ value = 0, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`${size} ${star <= Math.round(value) ? "fill-amber-300 text-amber-300" : "text-slate-700"}`} />
      ))}
    </span>
  );
}

export default function ResourceDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user, token, updateSavedResource } = useAuth();
  const isAuthenticated = Boolean(user && token);
  const userRole = user?.role?.toLowerCase()?.trim();
  const [resource, setResource] = useState(null);
  const [dummy, setDummy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [activeSummaryTab, setActiveSummaryTab] = useState(0);
  const [copiedCitation, setCopiedCitation] = useState("");
  const [notice, setNotice] = useState("");
  const [authWallOpen, setAuthWallOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [pdfPreviewStatus, setPdfPreviewStatus] = useState("checking");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchResource = async () => {
      setLoading(true);
      setNotice("");
      try {
        const { data } = await api.get(`/resources/${id}`);
        if (!active) return;
        setResource(data.resource || data);
        setDummy(false);
      } catch {
        if (!active) return;
        const fallback = findDummyById(id);
        setResource(fallback || null);
        setDummy(Boolean(fallback));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchResource();
    return () => { active = false; };
  }, [id]);

  const fileHref = resourceFileHref(resource?.fileUrl || resource?.fileName || "");
  const isPdfPreview = /\.pdf$/i.test(fileHref);

  useEffect(() => {
    if (!fileHref || !isPdfPreview || !isAuthenticated) {
      setPdfPreviewStatus("idle");
      return undefined;
    }

    let active = true;
    setPdfPreviewStatus("checking");
    fetch(fileHref, { method: "HEAD" })
      .then((response) => {
        if (active) setPdfPreviewStatus(response.ok ? "available" : "unavailable");
      })
      .catch(() => {
        if (active) setPdfPreviewStatus("unavailable");
      });

    return () => { active = false; };
  }, [fileHref, isAuthenticated, isPdfPreview]);

  useEffect(() => {
    const wantsSummary = new URLSearchParams(location.search).get("tab") === "summary"
      || location.hash === "#ai-summary";
    if (!wantsSummary || loading) return undefined;
    setActiveSummaryTab(0);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("ai-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.search, loading]);

  useEffect(() => {
    setSaved(Boolean(user?.savedResources?.some((item) => identityId(item) === id)));
  }, [id, user]);

  useEffect(() => {
    if (!resource) return;
    let active = true;
    const fetchRecommendations = async () => {
      setRecommendationsError("");
      try {
        const { data } = await api.get(`/resources/${id}/recommendations`);
        if (active) setRecommendations(data.recommendations || []);
      } catch (error) {
        if (!active) return;
        if (dummy) {
          setRecommendations(DUMMY_RESOURCES.filter((item) => item._id !== id && (
            item.category === resource.category || (resource.department && item.department === resource.department)
          )).slice(0, 4));
        } else {
          setRecommendations([]);
          setRecommendationsError(error.response?.data?.message || "Related studies are unavailable right now.");
        }
      }
    };
    fetchRecommendations();
    return () => { active = false; };
  }, [id, resource?.category, resource?.department, dummy]);

  useEffect(() => {
    const existingRating = resource?.ratings?.find((rating) => identityId(rating.user) === identityId(user));
    setRatingScore(existingRating?.score || 0);
    setRatingReview(existingRating?.review || "");
  }, [resource, user]);

  useEffect(() => {
    setReviewFeedback(resource?.reviewerFeedback || resource?.feedback || "");
  }, [resource?._id]);

  const citations = useMemo(() => {
    if (!resource) return {};
    const bibtexEscape = (value) => String(value || "").replace(/[{}]/g, "");
    const key = `scholarhub${String(resource._id || "resource").slice(-6)}`;
    return {
      APA: apaCitation(resource),
      MLA: mlaCitation(resource),
      BibTeX: `@misc{${key},\n  title = {${bibtexEscape(resource.title)}},\n  author = {${bibtexEscape(resource.author || "Unknown")}},\n  year = {${citationYear(resource)}},\n  howpublished = {ScholarHub Digital Library}\n}`,
    };
  }, [resource]);

  const downloadHref = fileHref ? `${fileHref}${fileHref.includes("?") ? "&" : "?"}download=1` : "";
  const canReviewResource = Boolean(
    resource?.status === "pending" &&
    (userRole === "admin" || (
      userRole === "teacher" &&
      (
        resource.assignedReviewerEmail?.toLowerCase()?.trim() === user?.email?.toLowerCase()?.trim() ||
        identityId(resource.assignedReviewer) === identityId(user)
      )
    ))
  );
  const ratings = resource?.ratings || [];
  const averageRating = Number(resource?.averageRating)
    || (ratings.length ? ratings.reduce((total, item) => total + Number(item.score || 0), 0) / ratings.length : 0);
  const storedSummary = resource?.aiSummary;
  const legacySummaryLines = typeof storedSummary === "string" ? storedSummary.split(/\r?\n/).filter(Boolean) : [];
  const summarySections = typeof storedSummary === "string"
    ? [
      ["Executive Summary", ""],
      ["Key Objectives", legacySummaryLines[0] || ""],
      ["Methodology", legacySummaryLines[1] || ""],
      ["Practical Findings", legacySummaryLines[2] || ""],
      ["Academic Impact", ""],
    ]
    : [
      ["Executive Summary", storedSummary?.executiveSummary || ""],
      ["Key Objectives", storedSummary?.keyObjectives || ""],
      ["Methodology", storedSummary?.methodology || ""],
      ["Practical Findings", storedSummary?.practicalFindings || ""],
      ["Academic Impact", storedSummary?.academicImpact || ""],
    ];

  const generateSummary = async () => {
    if (dummy) {
      const local = [
        `• ${resource.title} by ${resource.author} is a ${resource.category.toLowerCase()} contribution in ${resource.department || "academia"}.`,
        `• Abstract focus: ${(resource.description || "").slice(0, 160)}`,
        `• Suggested use: coursework, literature review, and seminar discussion. Keywords: ${(resource.tags || []).join(", ") || resource.category}.`,
      ].join("\n");
      setResource((previous) => ({ ...previous, aiSummary: local }));
      return;
    }
    setSummaryLoading(true);
    setNotice("");
    try {
      const { data } = await api.post(`/resources/${id}/summarize`);
      setResource((previous) => (previous ? { ...previous, aiSummary: data.summary || data.aiSummary } : previous));
      setActiveSummaryTab(0);
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to generate an AI summary. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const submitPeerReview = async (status) => {
    if (!canReviewResource || reviewSubmitting || dummy) return;
    setReviewSubmitting(true);
    setNotice("");
    try {
      const feedback = reviewFeedback.trim();
      const { data } = status === "approved"
        ? await api.put(`/resources/${id}/approve`, { feedback })
        : await api.patch(`/resources/${id}/review`, { status, feedback });
      setResource(data.resource || {
        ...resource,
        status,
        reviewerFeedback: reviewFeedback.trim(),
        feedback: reviewFeedback.trim(),
      });
      setNotice(status === "approved"
        ? "Manuscript approved and published."
        : "Revision request sent and manuscript rejected.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to submit this peer review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const text = comment.trim();
    if (!text || commentSubmitting) return;
    if (!isAuthenticated) {
      setNotice("Sign in to join the scholarly discussion.");
      return;
    }
    setCommentSubmitting(true);
    setNotice("");
    try {
      if (dummy) {
        setResource((previous) => ({
          ...previous,
          comments: [...(previous.comments || []), {
            _id: String(Date.now()),
            userName: user?.name || "You",
            userRole: user?.role || "student",
            text,
            createdAt: new Date().toISOString(),
          }],
        }));
      } else {
        const { data } = await api.post(`/resources/${id}/comments`, { text });
        setResource((previous) => ({
          ...previous,
          comments: data.comments || [...(previous.comments || []), data.comment],
        }));
      }
      setComment("");
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to post comment. Please try again.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const toggleBookmark = async () => {
    if (!isAuthenticated) {
      setNotice("Sign in to save this resource to your library.");
      return;
    }
    if (dummy) {
      const nextSaved = !saved;
      setSaved(nextSaved);
      updateSavedResource(id, nextSaved);
      return;
    }
    setBookmarkLoading(true);
    setNotice("");
    try {
      const { data } = await api.post(`/resources/${id}/bookmark`);
    setSaved(Boolean(data.isBookmarked));
    updateSavedResource(id, Boolean(data.isBookmarked));
    setNotice(data.isBookmarked ? "Saved to your library." : "Removed from your library.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to update your library. Please try again.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const submitRating = async (event) => {
    event.preventDefault();
    if (!ratingScore || ratingSubmitting) {
      setNotice("Choose a star rating before submitting.");
      return;
    }
    if (!isAuthenticated) {
      setNotice("Sign in to rate this resource.");
      return;
    }
    setRatingSubmitting(true);
    setNotice("");
    try {
      if (dummy) {
        const currentUserId = identityId(user);
        const nextRatings = [...ratings.filter((rating) => identityId(rating.user) !== currentUserId), {
          user: currentUserId,
          score: ratingScore,
          review: ratingReview.trim(),
          createdAt: new Date().toISOString(),
        }];
        setResource((previous) => ({
          ...previous,
          ratings: nextRatings,
          averageRating: nextRatings.reduce((total, item) => total + item.score, 0) / nextRatings.length,
        }));
      } else {
        const { data } = await api.post(`/resources/${id}/rating`, {
          score: ratingScore,
          review: ratingReview.trim(),
        });
        setResource((previous) => previous ? {
          ...previous,
          ratings: data.ratings || previous.ratings,
          averageRating: data.averageRating,
        } : previous);
      }
      setRatingOpen(false);
      setNotice("Thank you. Your academic review has been recorded.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to submit your review. Please try again.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const startDownload = () => {
    if (!isAuthenticated) {
      setAuthWallOpen(true);
      return;
    }
    if (!downloadHref) return;
    if (!dummy) {
      api.post(`/resources/${id}/download-increment`)
        .then(({ data }) => {
          setResource((previous) => previous ? { ...previous, downloadsCount: data.downloadsCount } : previous);
        })
        .catch((error) => {
          setNotice(error.response?.data?.message || "The download started, but its usage could not be recorded.");
        });
    }
  };

  const copyCitation = async (format) => {
    try {
      await navigator.clipboard.writeText(citations[format]);
      setCopiedCitation(format);
      setNotice(`${format} citation copied to clipboard.`);
      window.setTimeout(() => setCopiedCitation(""), 1800);
    } catch {
      setNotice("Copy failed. Select the citation text instead.");
    }
  };

  if (loading) {
    return     <div className="min-h-[75vh] bg-[#060911] px-4 py-20 text-center text-sm text-slate-400">Loading academic record…</div>;
  }

  if (!resource) {
    return (
      <div className="min-h-[75vh] bg-[#060911] px-4 py-16 text-center">
        <p className="mb-5 text-slate-400">Resource not found.</p>
        <Link className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white" to="/explore">
          <ArrowLeft className="h-4 w-4 text-indigo-300" />Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-300 shadow-sm transition hover:-translate-x-0.5 hover:border-indigo-400/60 hover:bg-slate-800 hover:text-white" to="/explore">
            <ArrowLeft className="h-4 w-4 text-indigo-300" />Back to Explore
          </Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleBookmark} disabled={bookmarkLoading} aria-pressed={saved} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${saved ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-indigo-400/50 hover:text-white"}`}>
              {bookmarkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? "Saved to Library" : "Save to Library"}
            </button>
            {downloadHref && isAuthenticated ? (
              <a href={downloadHref} onClick={startDownload} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400">
                <ArrowDownToLine className="h-4 w-4" />Download Document
              </a>
            ) : downloadHref ? (
              <button type="button" onClick={() => setAuthWallOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400">
                <ArrowDownToLine className="h-4 w-4" />Download Document
              </button>
            ) : (
              <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm font-semibold text-slate-600">
                <ArrowDownToLine className="h-4 w-4" />No document attached
              </button>
            )}
          </div>
        </div>

        {dummy && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">Sample catalog record — collaboration changes are previewed locally.</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-100">{notice}</p>}

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <main className="min-w-0 space-y-6">
            <article className={`${panelClass} overflow-hidden`}>
              <div className="border-b border-slate-800 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-200">{resource.category}</span>
                  <span className="text-xs text-slate-500">{resource.year || citationYear(resource)} · {resource.department || "Academic collection"}</span>
                </div>
                <h1 className="mt-5 max-w-4xl font-serif text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">{resource.title}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">{resource.abstract || resource.description || "No abstract was provided for this resource."}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-400/15 text-xs font-bold text-indigo-200">{(resource.author || "?").split(/[\s&]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("")}</span>
                    {resource.author || "Unknown author"}
                  </span>
                  <span className="text-xs text-slate-500">
                    Submitted by: {resource.uploadedBy?.name || resource.uploaderName || "Academic contributor"} ({resource.uploadedBy?.department || "Student"})
                  </span>
                </div>
                {resource.status === "approved" && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium text-emerald-300">
                    <BadgeCheck className="h-4 w-4" aria-label="Verified" />
                    Peer-Verified by Prof. {resource.approvedBy?.name || "Verified Faculty"}
                    {resource.approvalDate && <span className="text-slate-500">· {formatDate(resource.approvalDate)}</span>}
                  </div>
                )}
                {(resource.tags || []).length > 0 && <div className="mt-5 flex flex-wrap gap-2">{resource.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-400">{tag}</span>)}</div>}
              </div>
              {resource.reviewerFeedback && (
                <div className="border-t border-emerald-400/15 bg-emerald-400/[0.04] px-6 py-4 sm:px-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Faculty Endorsement / Feedback</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-emerald-50">{resource.reviewerFeedback}</p>
                </div>
              )}
              <dl className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
                <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Publication year</dt><dd className="mt-2 text-sm font-semibold text-slate-200">{resource.year || citationYear(resource)}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Resource type</dt><dd className="mt-2 text-sm font-semibold text-slate-200">{resource.category}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Department</dt><dd className="mt-2 text-sm font-semibold text-slate-200">{resource.department || "Not specified"}</dd></div>
              </dl>
            </article>

            <section className={`${panelClass} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Community assessment</p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold text-white">Reader ratings & reviews</h2>
                </div>
                <button type="button" onClick={() => isAuthenticated ? setRatingOpen(true) : setNotice("Sign in to rate this resource.")} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/50 hover:text-white">
                  <Star className="h-4 w-4 text-amber-300" />{ratings.some((item) => identityId(item.user) === identityId(user)) ? "Update your rating" : "Write a review"}
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-baseline gap-2"><span className="text-4xl font-semibold tabular-nums text-white">{averageRating.toFixed(1)}</span><span className="text-sm text-slate-500">/ 5</span></div>
                <div><Stars value={averageRating} size="h-5 w-5" /><p className="mt-1 text-xs text-slate-500">{ratings.length} {ratings.length === 1 ? "rating" : "ratings"}</p></div>
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-500"><ThumbsUp className="h-4 w-4 text-indigo-300" />Peer perspectives help guide discovery</div>
              </div>
              {ratings.some((item) => item.review?.trim()) && (
                <div className="mt-4 space-y-3">
                  {ratings.filter((item) => item.review?.trim()).slice(0, 3).map((item, index) => (
                    <article key={`${identityId(item.user)}-${item.createdAt || index}`} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2"><Stars value={item.score} /><span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span></div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.review}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={`${panelClass} p-5 sm:p-6`}>
              <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-white"><Quote className="h-5 w-5 text-indigo-300" />Citations</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(citations).map(([format, text]) => (
                  <div key={format} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{format}</h3><button type="button" onClick={() => copyCitation(format)} aria-label={`Copy ${format} citation`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-400/10">{copiedCitation === format ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedCitation === format ? "Copied" : "Copy"}</button></div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${panelClass} p-5 sm:p-6`}>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Academic exchange</p><h2 className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-white"><MessageSquare className="h-5 w-5 text-indigo-300" />Scholarly discussion</h2></div>
                <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-400">{(resource.comments || []).length} contributions</span>
              </div>
              <form onSubmit={submitComment} className="mt-5 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                {isAuthenticated ? (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-medium text-slate-400">Contributing as <span className="font-semibold text-slate-200">{user?.name || "Member"}</span></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${roleLabel(user?.role) === "Teacher" ? "bg-amber-400/10 text-amber-200" : "bg-sky-400/10 text-sky-200"}`}>{roleLabel(user?.role)}</span></div>
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Share a question, methodological insight, or related citation…" className={fieldClass} />
                    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-600">{comment.length}/1000</span><button type="submit" disabled={!comment.trim() || commentSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{commentSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Post contribution</button></div>
                  </>
                ) : <p className="text-sm text-slate-400"><Link to="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">Sign in</Link> to contribute to this discussion.</p>}
              </form>
              <div className="mt-5 space-y-3">
                {(resource.comments || []).length === 0 && <p className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">No contributions yet. Start the scholarly conversation.</p>}
                {[...(resource.comments || [])].reverse().map((item, index) => {
                  const name = item.userName || item.user?.name || item.name || "Community member";
                  return (
                    <article key={item._id || item.createdAt || index} className="rounded-xl border border-slate-800/90 bg-slate-950/35 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-400/10 text-xs font-bold text-indigo-200">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-100">{name}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleLabel(item.userRole || item.user?.role) === "Teacher" ? "bg-amber-400/10 text-amber-200" : "bg-sky-400/10 text-sky-200"}`}>{roleLabel(item.userRole || item.user?.role)}</span></div>
                        </div>
                        <time className="shrink-0 pt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</time>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
            <section className={`${panelClass} overflow-hidden`}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-white"><FileText className="h-5 w-5 text-indigo-300" />Document reader</h2>
                <span className="text-xs text-slate-500">{resource.downloadsCount ?? resource.downloadCount ?? 0} downloads</span>
              </div>
              <div className="relative">
                {fileHref && isPdfPreview
                  ? !isAuthenticated
                    ? <div className="min-h-72 blur-sm" aria-hidden="true" />
                    : pdfPreviewStatus === "unavailable"
                      ? <div role="alert" className="flex min-h-72 items-center justify-center px-6 text-center text-sm leading-relaxed text-slate-400">The document file preview is unavailable or has expired. Please re-upload this document.</div>
                      : pdfPreviewStatus === "available"
                        ? <iframe title="Document preview" src={fileHref} onError={() => setPdfPreviewStatus("unavailable")} className="h-[min(72vh,760px)] min-h-[440px] w-full bg-slate-950" />
                        : <div className="flex min-h-72 items-center justify-center px-6 text-center text-sm text-slate-500">Checking document preview…</div>
                  : <div className={`flex min-h-72 items-center justify-center px-6 text-center text-sm leading-relaxed text-slate-500 ${!isAuthenticated ? "blur-sm" : ""}`}>{fileHref ? "Preview is available for PDF documents." : "No document is attached to this sample record."}</div>}
                {!isAuthenticated && fileHref && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#070B14]/65 p-5 text-center backdrop-blur-[2px]">
                    <button type="button" onClick={() => setAuthWallOpen(true)} className="rounded-xl border border-indigo-300/30 bg-[#0E1422] px-5 py-3 text-sm font-semibold text-indigo-100 shadow-xl transition hover:border-indigo-200/60 hover:bg-slate-900">
                      Sign in to view full manuscript
                    </button>
                  </div>
                )}
              </div>
            </section>

            {canReviewResource && (
              <section className={`${panelClass} border-amber-400/20 p-5 sm:p-6`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-200">
                    <BadgeCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">Faculty workflow</p>
                    <h2 className="mt-1 font-serif text-xl font-semibold text-white">Review &amp; Approve</h2>
                  </div>
                </div>
                <label htmlFor="peer-review-feedback" className="mt-5 block text-sm font-semibold text-slate-200">
                  Reviewer Comments &amp; Feedback (Suggestions for improvement or endorsement)
                </label>
                <textarea
                  id="peer-review-feedback"
                  value={reviewFeedback}
                  onChange={(event) => setReviewFeedback(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  className={`${fieldClass} mt-2 resize-y`}
                  placeholder="Share suggestions for improvement or an endorsement for publication."
                  disabled={reviewSubmitting}
                />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => submitPeerReview("approved")}
                    disabled={reviewSubmitting}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                  >
                    {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve &amp; Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => submitPeerReview("rejected")}
                    disabled={reviewSubmitting}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/[0.07] px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/[0.13] disabled:cursor-wait disabled:opacity-60"
                  >
                    {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Request Revisions / Reject
                  </button>
                </div>
              </section>
            )}

            <section id="ai-summary" className={`${panelClass} scroll-mt-36 p-5 sm:p-6`}>
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-200"><Sparkles className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-300">Research companion</p><h2 className="mt-1 font-serif text-xl font-semibold text-white">Smart Summary</h2></div></div>
              <div className="mt-5 flex border-b border-slate-800" role="tablist" aria-label="Summary sections">
                {summarySections.map(([label], index) => <button key={label} type="button" role="tab" aria-selected={activeSummaryTab === index} onClick={() => setActiveSummaryTab(index)} className={`min-w-0 flex-1 border-b-2 px-1 pb-2 text-xs font-semibold leading-tight ${activeSummaryTab === index ? "border-indigo-400 text-indigo-200" : "border-transparent text-slate-500 hover:text-slate-300"}`}>{label}</button>)}
              </div>
              <p className="mt-4 min-h-20 whitespace-pre-line text-sm leading-relaxed text-slate-300">{summarySections[activeSummaryTab]?.[1] || "Generate a summary to see this research section."}</p>
              {summaryLoading && <p role="status" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-400/10 px-3 py-2 text-xs font-semibold text-indigo-200"><Loader2 className="h-4 w-4 shrink-0 animate-spin" />Generating scholarly summary…</p>}
              <button type="button" onClick={() => isAuthenticated ? generateSummary() : setAuthWallOpen(true)} disabled={summaryLoading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{summaryLoading ? "Generating summary…" : !isAuthenticated ? "Sign in to unlock AI Research Companion" : resource.aiSummary ? "Regenerate Smart Summary" : "Generate Smart Summary"}</button>
            </section>

            <section className={`${panelClass} p-5 sm:p-6`}>
              <div className="mb-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-300">AI-assisted discovery</p><h2 className="mt-1 font-serif text-xl font-semibold text-white">Related Recommended Research</h2></div>
              {recommendationsError && <p role="status" className="mb-3 text-xs text-amber-200">{recommendationsError}</p>}
              <div className="space-y-3">
                {recommendations.map((paper) => (
                  <article key={paper._id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-indigo-400/40">
                    <span className="inline-flex rounded-full bg-indigo-400/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-200">{paper.category}</span>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-100">{paper.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{paper.author || "Unknown author"}</p>
                    <Link to={`/resources/${paper._id}`} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200">Read Paper <ArrowDownToLine className="h-3.5 w-3.5 rotate-[-45deg]" /></Link>
                  </article>
                ))}
                {!recommendations.length && !recommendationsError && <p className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">No related studies found yet.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {authWallOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthWallOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="resource-auth-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0E1422] p-6 shadow-2xl shadow-black/60 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Academic access</p>
                <h2 id="resource-auth-title" className="mt-2 font-serif text-2xl font-semibold text-white">Institutional Sign-In Required</h2>
              </div>
              <button type="button" onClick={() => setAuthWallOpen(false)} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">Sign in with your campus account or register to read the full manuscript, run AI summaries, and download research files.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link to="/login" onClick={() => setAuthWallOpen(false)} className="inline-flex items-center justify-center rounded-xl bg-indigo-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-200">Sign In</Link>
              <Link to="/register" onClick={() => setAuthWallOpen(false)} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300/40 hover:text-white">Register</Link>
            </div>
          </section>
        </div>
      )}

      {ratingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setRatingOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="rating-dialog-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Peer review</p>
            <h2 id="rating-dialog-title" className="mt-2 font-serif text-2xl font-semibold text-white">Rate this academic resource</h2>
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">{resource.title}</p>
            <form onSubmit={submitRating} className="mt-6">
              <fieldset>
                <legend className="text-sm font-medium text-slate-300">Your rating</legend>
                <div className="mt-3 flex items-center gap-2" onMouseLeave={() => setRatingHover(0)}>
                  {[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" onMouseEnter={() => setRatingHover(score)} onFocus={() => setRatingHover(score)} onBlur={() => setRatingHover(0)} onClick={() => setRatingScore(score)} aria-label={`${score} star${score > 1 ? "s" : ""}`} aria-pressed={ratingScore === score} className="rounded-md p-1 text-amber-300 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400"><Star className={`h-8 w-8 ${(ratingHover || ratingScore) >= score ? "fill-amber-300" : "text-slate-700"}`} /></button>)}
                  <span className="ml-2 text-sm text-slate-400">{ratingScore ? `${ratingScore} out of 5` : "Select a rating"}</span>
                </div>
              </fieldset>
              <label className="mt-5 block text-sm font-medium text-slate-300" htmlFor="academic-review">Academic feedback <span className="font-normal text-slate-500">(optional)</span></label>
              <textarea id="academic-review" value={ratingReview} onChange={(event) => setRatingReview(event.target.value)} maxLength={2000} rows={4} placeholder="Comment on the work's contribution, rigor, or usefulness…" className={`${fieldClass} mt-2`} />
              <p className="mt-1 text-right text-xs text-slate-600">{ratingReview.length}/2000</p>
              <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRatingOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancel</button><button type="submit" disabled={ratingSubmitting || !ratingScore} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{ratingSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Submit review</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

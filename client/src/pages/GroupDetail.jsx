import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  FileText,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const panelClass = "rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_50px_rgba(0,0,0,0.18)]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

function getId(value) {
  return String(value?._id || value?.id || value || "");
}

function getResources(group) {
  const resources = [...(group.resources || []), ...(group.sharedResources || [])];
  return [...new Map(resources.map((resource) => [getId(resource), resource])).values()];
}

function getInitials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

function roleLabel(role) {
  const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : "";
  if (normalizedRole === "teacher" || normalizedRole === "admin") return "Faculty";
  if (normalizedRole === "researcher") return "Researcher";
  return "Student";
}

function formatDate(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderFormattedText(text) {
  const output = [];
  const codeLines = [];
  const lines = text.split("\n");
  let inCodeBlock = false;

  lines.forEach((line, lineIndex) => {
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        output.push(
          <pre key={`code-${lineIndex}`} className="my-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-indigo-100">
            <code>{codeLines.splice(0).join("\n")}</code>
          </pre>,
        );
      }
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const parts = [];
    const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let cursor = 0;
    let match;
    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > cursor) parts.push(line.slice(cursor, match.index));
      const token = match[0];
      const content = token.startsWith("**") ? token.slice(2, -2) : token.slice(1, -1);
      if (token.startsWith("**")) {
        parts.push(<strong key={`${lineIndex}-${match.index}`} className="font-semibold text-slate-100">{content}</strong>);
      } else if (token.startsWith("`")) {
        parts.push(<code key={`${lineIndex}-${match.index}`} className="rounded bg-slate-800 px-1 py-0.5 text-indigo-200">{content}</code>);
      } else {
        parts.push(<em key={`${lineIndex}-${match.index}`} className="italic text-slate-200">{content}</em>);
      }
      cursor = match.index + token.length;
    }
    if (cursor < line.length) parts.push(line.slice(cursor));
    const isQuote = line.startsWith("> ");
    output.push(
      <span key={`line-${lineIndex}`} className={isQuote ? "block border-l-2 border-indigo-400/40 pl-3 text-slate-400" : undefined}>
        {isQuote ? parts.map((part, index) => index === 0 && typeof part === "string" ? part.slice(2) : part) : parts}
        {lineIndex < lines.length - 1 && <br />}
      </span>,
    );
  });

  if (codeLines.length) {
    output.push(<pre key="code-unclosed" className="my-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-indigo-100"><code>{codeLines.join("\n")}</code></pre>);
  }
  return output;
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to prepare the audio note."));
    reader.readAsDataURL(blob);
  });
}

export default function GroupDetail({ group, onClose, onGroupChange, onLeave }) {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState("discussion");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [sharingError, setSharingError] = useState("");
  const [sharingId, setSharingId] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const textareaRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const members = Array.isArray(group.members) ? group.members : [];
  const papers = useMemo(() => getResources(group), [group]);
  const messages = Array.isArray(group.messages) ? group.messages : [];
  const isMember = members.some((member) => getId(member) === getId(user));

  useEffect(() => () => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!catalogOpen) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        const { data } = await api.get("/resources", {
          params: { search: catalogSearch.trim() || undefined },
          signal: controller.signal,
        });
        setCatalogResults(Array.isArray(data.resources) ? data.resources : []);
      } catch (error) {
        if (error.name !== "CanceledError") {
          setCatalogError(error.response?.data?.message || "Unable to load the library catalog.");
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [catalogOpen, catalogSearch]);

  const insertFormatting = (prefix, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = messageText.slice(start, end);
    const nextText = `${messageText.slice(0, start)}${prefix}${selected}${suffix}${messageText.slice(end)}`;
    setMessageText(nextText);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const addSnippet = (snippet) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const before = messageText.slice(0, cursor);
    const after = messageText.slice(cursor);
    const separator = before && !before.endsWith("\n") ? "\n" : "";
    const inserted = `${separator}${snippet}\n`;
    setMessageText(`${before}${inserted}${after}`);
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = cursor + inserted.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const startRecording = async () => {
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Audio recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => setRecordingError("The audio recording could not be completed.");
      recorder.onstop = async () => {
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) return;
        if (blob.size > 2 * 1024 * 1024) {
          setRecordingError("This recording is too large. Please record a shorter note.");
          return;
        }
        try {
          const dataUrl = await readAsDataUrl(blob);
          setAttachment({ url: dataUrl, type: "audio" });
        } catch (error) {
          setRecordingError(error.message);
        }
      };
      recorder.start();
      setRecording(true);
      recordingTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 30_000);
    } catch (error) {
      setRecordingError(error.name === "NotAllowedError"
        ? "Allow microphone access to record an audio note."
        : "Unable to access the microphone.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    setMessageError("");
    if (!isAuthenticated) {
      setMessageError("Log in to contribute to this discussion.");
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(`/groups/${getId(group)}/messages`, {
        text: messageText,
        attachmentUrl: attachment?.url || "",
        attachmentType: attachment?.type,
      });
      onGroupChange({
        ...group,
        messages: [...messages, data.message],
      });
      setMessageText("");
      setAttachment(null);
    } catch (error) {
      setMessageError(error.response?.data?.message || "Unable to post your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const shareResource = async (resource) => {
    const resourceId = getId(resource);
    setSharingId(resourceId);
    setSharingError("");
    try {
      await api.post(`/groups/${getId(group)}/share-resource`, { resourceId });
      const nextResources = getResources(group);
      if (!nextResources.some((item) => getId(item) === resourceId)) nextResources.push(resource);
      onGroupChange({ ...group, sharedResources: nextResources, resources: [] });
      setCatalogOpen(false);
    } catch (error) {
      setSharingError(error.response?.data?.message || "Unable to attach this resource.");
    } finally {
      setSharingId("");
    }
  };

  const leaveCircle = async () => {
    setLeaving(true);
    try {
      await api.post(`/groups/${getId(group)}/join`);
      onLeave(getId(group));
    } catch (error) {
      setMessageError(error.response?.data?.message || "Unable to leave this circle.");
    } finally {
      setLeaving(false);
    }
  };

  const tabs = [
    { id: "discussion", label: "Scholarly Discussions", icon: MessageCircle },
    { id: "vault", label: "Shared Vault", icon: BookOpen },
    { id: "members", label: "Active Researchers", icon: Users },
  ];

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-detail-title"
        className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950 shadow-2xl sm:min-h-[calc(100vh-3rem)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/70 px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Research circle workspace</p>
            <h2 id="group-detail-title" className="mt-2 truncate font-serif text-2xl font-semibold text-white sm:text-3xl">{group.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{group.department || "Interdisciplinary"} · {members.length} researchers</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isMember && (
              <button type="button" onClick={leaveCircle} disabled={leaving} className="hidden rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-rose-200 sm:inline-flex">
                {leaving ? "Leaving…" : "Leave circle"}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close circle workspace" className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/40 px-4 sm:px-8" role="tablist" aria-label="Circle workspace">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition ${tab === id ? "border-indigo-400 text-indigo-200" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "discussion" && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{messages.length}</span>}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 p-4 sm:p-8">
          {tab === "discussion" && (
            <div className="mx-auto grid h-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
              <section className={`${panelClass} flex min-h-[65vh] flex-col overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-white">Circle conversation</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Share evidence, questions, and methodological insight.</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2.5 py-1 text-[11px] text-emerald-200">Member space</span>
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {messages.length === 0 ? (
                    <div className="flex min-h-56 flex-col items-center justify-center text-center">
                      <div className="rounded-2xl border border-indigo-400/15 bg-indigo-400/5 p-3 text-indigo-200"><BookOpen className="h-6 w-6" /></div>
                      <p className="mt-4 font-medium text-slate-200">Begin the scholarly conversation</p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Post a research question, share a useful citation, or reflect on a paper your circle is reading.</p>
                    </div>
                  ) : messages.map((message) => {
                    const author = message.user || {};
                    return (
                      <article key={getId(message)} className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300/20 bg-indigo-400/10 text-xs font-semibold text-indigo-100">
                          {getInitials(author.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-slate-100">{author.name || "Circle member"}</span>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-indigo-200">{roleLabel(author.role)}</span>
                            <time className="text-[11px] text-slate-500" dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
                          </div>
                          {message.text && <div className="mt-2 break-words text-sm leading-6 text-slate-300">{renderFormattedText(message.text)}</div>}
                          {message.attachmentType === "audio" && message.attachmentUrl && (
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                              <Headphones className="h-4 w-4 shrink-0 text-indigo-300" />
                              <audio controls preload="metadata" src={message.attachmentUrl} className="h-9 min-w-0 max-w-full flex-1" />
                            </div>
                          )}
                          {message.attachmentType !== "audio" && message.attachmentUrl && (
                            <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs text-indigo-200 hover:bg-slate-800">
                              <Paperclip className="h-3.5 w-3.5" /> Open attached resource <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <form onSubmit={submitMessage} className="border-t border-slate-800 bg-slate-950/50 p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => insertFormatting("**")} aria-label="Bold text" className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white">B</button>
                    <button type="button" onClick={() => insertFormatting("*")} aria-label="Italic text" className="rounded-lg px-2.5 py-1.5 text-xs italic text-slate-400 hover:bg-slate-800 hover:text-white">I</button>
                    <button type="button" onClick={() => addSnippet("```text\n\n```")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"><Code2 className="h-3.5 w-3.5" /> Code</button>
                    <button type="button" onClick={() => addSnippet("> Citation: Author, “Title,” Journal, year, DOI/URL.")} className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white">Citation</button>
                    <span className="ml-auto text-[10px] text-slate-600">Markdown supported</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    maxLength={5000}
                    rows={3}
                    placeholder="Share an observation, research question, or citation with your circle…"
                    className="w-full resize-y rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-400/60"
                  />
                  {attachment && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-indigo-400/15 bg-indigo-400/5 px-3 py-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Headphones className="h-4 w-4 shrink-0 text-indigo-300" />
                        <audio controls preload="metadata" src={attachment.url} className="h-8 min-w-0 max-w-xs flex-1" />
                      </div>
                      <button type="button" onClick={() => setAttachment(null)} aria-label="Remove audio note" className="ml-2 rounded p-1 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  {recordingError && <p role="alert" className="mt-2 text-xs text-rose-300">{recordingError}</p>}
                  {messageError && <p role="alert" className="mt-2 text-xs text-rose-300">{messageError}</p>}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button type="button" onClick={recording ? stopRecording : startRecording} disabled={sending || Boolean(attachment)} className={`${buttonClass} ${recording ? "border-rose-400/30 text-rose-200 hover:bg-rose-400/10" : ""}`}>
                      {recording ? <><MicOff className="h-4 w-4" /> Stop recording</> : <><Mic className="h-4 w-4" /> Audio note</>}
                    </button>
                    <button type="submit" disabled={sending || recording || (!messageText.trim() && !attachment)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:opacity-50">
                      {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {sending ? "Posting…" : "Post to circle"}
                    </button>
                  </div>
                </form>
              </section>
              <aside className="hidden space-y-4 lg:block">
                <div className={`${panelClass} p-5`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-indigo-300" /> Circle at a glance</div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{group.description || "An academic space to exchange ideas and work together."}</p>
                  <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">{members.length} active researchers · {papers.length} shared papers</div>
                </div>
                <div className={`${panelClass} p-5`}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Academic etiquette</h4>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                    <li>• Cite primary sources where possible.</li>
                    <li>• Keep feedback constructive and evidence-led.</li>
                    <li>• Respect authorship and attribution.</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}

          {tab === "vault" && (
            <section className="mx-auto max-w-5xl">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Shared repository</p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Circle research vault</h3>
                  <p className="mt-1 text-sm text-slate-400">A curated collection of papers linked from the ScholarHub library.</p>
                </div>
                {isMember && <button type="button" onClick={() => { setCatalogError(""); setSharingError(""); setCatalogOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"><Paperclip className="h-4 w-4" /> Attach Resource from Catalog</button>}
              </div>
              {sharingError && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-200">{sharingError}</p>}
              {papers.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {papers.map((paper) => (
                    <article key={getId(paper)} className={`${panelClass} flex min-h-48 flex-col p-5`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/5 text-indigo-200"><FileText className="h-5 w-5" /></div>
                      <h4 className="mt-4 line-clamp-2 font-medium leading-6 text-white">{paper.title || "Shared academic resource"}</h4>
                      <p className="mt-1 text-xs text-slate-500">{[paper.author, paper.year, paper.category].filter(Boolean).join(" · ") || "ScholarHub Library"}</p>
                      <Link to={`/resources/${getId(paper)}`} onClick={onClose} className="mt-auto inline-flex items-center gap-1 pt-5 text-xs font-semibold text-indigo-200 hover:text-indigo-100">View paper <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={`${panelClass} flex min-h-64 flex-col items-center justify-center border-dashed p-8 text-center`}>
                  <BookOpen className="h-8 w-8 text-slate-600" />
                  <h4 className="mt-4 font-medium text-slate-200">Your shared vault is ready</h4>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Attach approved library papers to build a focused reading list for this research circle.</p>
                </div>
              )}
            </section>
          )}

          {tab === "members" && (
            <section className="mx-auto max-w-4xl">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Circle directory</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Active researchers</h3>
                <p className="mt-1 text-sm text-slate-400">{members.length} students, faculty, and researchers collaborating in this circle.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {members.map((member) => (
                  <article key={getId(member)} className={`${panelClass} flex items-center gap-4 p-4`}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-300/20 bg-indigo-300/10 text-sm font-semibold text-indigo-100">{getInitials(member.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{member.name || "Scholar"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{member.department || "Independent scholar"}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[10px] font-medium text-slate-300">{roleLabel(member.role)}</span>
                    {getId(member) === getId(user) && <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-label="You" />}
                  </article>
                ))}
              </div>
              {isMember && (
                <button type="button" onClick={leaveCircle} disabled={leaving} className="mt-6 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-rose-400/30 hover:text-rose-200 sm:hidden">
                  {leaving ? "Leaving…" : "Leave this circle"}
                </button>
              )}
            </section>
          )}
        </div>
      </section>

      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setCatalogOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="catalog-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <h3 id="catalog-title" className="font-serif text-xl font-semibold text-white">Attach a library resource</h3>
                <p className="mt-1 text-sm text-slate-400">Choose an approved paper to add to this circle’s vault.</p>
              </div>
              <button type="button" onClick={() => setCatalogOpen(false)} aria-label="Close catalog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </header>
            <label className="relative m-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search papers by title, author, or topic…" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/60" />
            </label>
            {catalogError && <p role="alert" className="mx-4 mb-3 text-sm text-rose-300">{catalogError}</p>}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              {catalogLoading ? (
                <p className="py-10 text-center text-sm text-slate-400">Searching the library…</p>
              ) : catalogResults.filter((resource) => !papers.some((paper) => getId(paper) === getId(resource))).length ? (
                catalogResults.filter((resource) => !papers.some((paper) => getId(paper) === getId(resource))).map((resource) => (
                  <article key={getId(resource)} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <FileText className="h-5 w-5 shrink-0 text-indigo-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{resource.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{[resource.author, resource.year, resource.category].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button type="button" onClick={() => shareResource(resource)} disabled={Boolean(sharingId)} className="shrink-0 rounded-lg border border-indigo-300/20 bg-indigo-300/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-300/15 disabled:opacity-50">
                      {sharingId === getId(resource) ? "Adding…" : "Add"}
                    </button>
                  </article>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">No unshared approved papers match this search.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

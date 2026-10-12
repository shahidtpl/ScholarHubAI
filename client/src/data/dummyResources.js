export const CATEGORIES = [
  "Books",
  "Research Papers",
  "Dissertations",
  "Seminar Reports",
  "Lecture Notes",
];

export const DUMMY_RESOURCES = [
  {
    _id: "66f100000000000000000001",
    title: "Foundations of Knowledge Graphs for Scholarly Discovery",
    description:
      "A graduate-level treatment of entity linking, citation graphs, and retrieval-augmented reading for digital libraries. Includes lab notebooks and evaluation protocols.",
    author: "A. Ramanathan",
    category: "Books",
    year: 2024,
    department: "Computer Science",
    fileUrl: "",
    fileName: "knowledge-graphs-scholarly-discovery.pdf",
    tags: ["knowledge graphs", "IR", "digital libraries"],
    uploadedBy: { name: "Priya Menon", role: "teacher", department: "Computer Science" },
    status: "approved",
    aiSummary: "",
    comments: [
      {
        _id: "c1",
        name: "Jonah Hale",
        text: "Excellent primer for seminar students starting literature mapping.",
        createdAt: "2026-03-12T10:00:00.000Z",
      },
    ],
    createdAt: "2026-02-18T09:00:00.000Z",
  },
  {
    _id: "66f100000000000000000002",
    title: "Transformer Attention as a Model of Academic Reading",
    description:
      "Research paper proposing a cognitive-inspired evaluation of long-context models on dissertation-length PDFs and annotation quality.",
    author: "L. Chen & M. Okonkwo",
    category: "Research Papers",
    year: 2025,
    department: "Information Science",
    fileUrl: "",
    fileName: "transformer-academic-reading.pdf",
    tags: ["NLP", "attention", "evaluation"],
    uploadedBy: { name: "Mei Chen", role: "researcher", department: "Information Science" },
    status: "approved",
    aiSummary: "",
    comments: [],
    createdAt: "2026-04-02T14:20:00.000Z",
  },
  {
    _id: "66f100000000000000000003",
    title: "Open Access Policy and Citation Equity in STEM",
    description:
      "Doctoral dissertation analyzing citation networks across 40 universities and the effect of repository mandates on early-career visibility.",
    author: "Sofia Alvarez",
    category: "Dissertations",
    year: 2023,
    department: "Science Policy",
    fileUrl: "",
    fileName: "alvarez-open-access-equity.pdf",
    tags: ["open access", "bibliometrics", "equity"],
    uploadedBy: { name: "Sofia Alvarez", role: "researcher", department: "Science Policy" },
    status: "approved",
    aiSummary: "",
    comments: [],
    createdAt: "2025-11-21T11:00:00.000Z",
  },
  {
    _id: "66f100000000000000000004",
    title: "Seminar Report: Reproducible Experimental Notebooks",
    description:
      "Department seminar notes covering containerized workflows, data provenance, and peer review of computational appendices.",
    author: "Dept. of Statistics Colloquium",
    category: "Seminar Reports",
    year: 2026,
    department: "Statistics",
    fileUrl: "",
    fileName: "reproducible-notebooks-seminar.pdf",
    tags: ["reproducibility", "R", "Python"],
    uploadedBy: { name: "Elena Voss", role: "teacher", department: "Statistics" },
    status: "approved",
    aiSummary: "",
    comments: [],
    createdAt: "2026-01-09T16:45:00.000Z",
  },
  {
    _id: "66f100000000000000000005",
    title: "Lecture Notes: Research Methods for Mixed-Methods Studies",
    description:
      "Week-by-week notes for a graduate methods course: sampling, coding interviews, triangulation, and IRB ethics.",
    author: "Prof. David Kim",
    category: "Lecture Notes",
    year: 2025,
    department: "Education",
    fileUrl: "",
    fileName: "mixed-methods-lecture-notes.pdf",
    tags: ["methods", "qualitative", "ethics"],
    uploadedBy: { name: "David Kim", role: "teacher", department: "Education" },
    status: "approved",
    aiSummary: "",
    comments: [],
    createdAt: "2025-09-04T08:30:00.000Z",
  },
  {
    _id: "66f100000000000000000006",
    title: "A Survey of Retrieval-Augmented Generation in Digital Libraries",
    description:
      "Comparative study of chunking strategies, metadata filters, and hallucination audits for campus repository chat assistants.",
    author: "N. Patel, R. Singh, H. Nakamura",
    category: "Research Papers",
    year: 2026,
    department: "Library Science",
    fileUrl: "",
    fileName: "rag-digital-libraries-survey.pdf",
    tags: ["RAG", "LLMs", "libraries"],
    uploadedBy: { name: "Nadia Patel", role: "researcher", department: "Library Science" },
    status: "approved",
    aiSummary: "",
    comments: [],
    createdAt: "2026-06-15T12:00:00.000Z",
  },
];

export const DUMMY_PENDING = [
  {
    _id: "66f100000000000000000101",
    title: "Climate Archives and Community Oral Histories",
    description: "Working paper submitted for faculty review prior to cataloguing.",
    author: "Imani Brooks",
    category: "Research Papers",
    year: 2026,
    department: "Environmental Studies",
    tags: ["climate", "oral history"],
    uploadedBy: { name: "Imani Brooks", role: "student", department: "Environmental Studies" },
    status: "pending",
    createdAt: "2026-09-20T09:12:00.000Z",
  },
  {
    _id: "66f100000000000000000102",
    title: "Notes on Linear Algebra for Data Journalism",
    description: "Supplementary lecture packet awaiting departmental approval.",
    author: "Chris Lang",
    category: "Lecture Notes",
    year: 2026,
    department: "Mathematics",
    tags: ["linear algebra", "journalism"],
    uploadedBy: { name: "Chris Lang", role: "teacher", department: "Mathematics" },
    status: "pending",
    createdAt: "2026-09-22T18:40:00.000Z",
  },
];

export function filterDummy(list, { search = "", category = "All" } = {}) {
  const q = search.trim().toLowerCase();
  return list.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    if (!matchesCategory) return false;
    if (!q) return true;
    const haystack = [
      item.title,
      item.author,
      item.description,
      item.department,
      ...(item.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function findDummyById(id) {
  return [...DUMMY_RESOURCES, ...DUMMY_PENDING].find((item) => item._id === id);
}

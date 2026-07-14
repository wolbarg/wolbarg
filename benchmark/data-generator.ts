/**
 * Realistic AI-agent memory text generator.
 * Produces varied operational notes instead of lorem ipsum.
 */

const PEOPLE = [
  "Alex Chen",
  "Priya Sharma",
  "Jordan Lee",
  "Sam Okonkwo",
  "Maya Patel",
  "Chris Nguyen",
  "Riley Brooks",
  "Elena Vargas",
  "Noah Kim",
  "Ava Thompson",
  "Marcus Reid",
  "Sofia Alvarez",
];

const PROJECTS = [
  "Agent ORC",
  "Phoenix Checkout",
  "Nebula Analytics",
  "Atlas Migrator",
  "Helios Dashboard",
  "Orbit Messaging",
  "Quasar Search",
  "Lumen Billing",
  "Forge CI",
  "Cascade Support",
];

const COMPANIES = [
  "OpenAI",
  "Stripe",
  "Anthropic",
  "Vercel",
  "Datadog",
  "Notion",
  "Linear",
  "Snowflake",
  "Cloudflare",
  "MongoDB",
  "PostgreSQL Inc",
  "LangChain",
];

const TASKS = [
  "Fix PostgreSQL adapter",
  "Research LangChain integration",
  "Update project roadmap",
  "Deploy production release",
  "Investigate RAG latency spike",
  "Write SDK migration guide",
  "Tune sqlite-vec index settings",
  "Add concurrency stress tests",
  "Review customer refund flow",
  "Ship embedding provider fallback",
  "Document compression API",
  "Optimize warm-start path",
];

const MEETING_TOPICS = [
  "Q3 roadmap sync",
  "Incident postmortem",
  "Partner API kickoff",
  "Billing integration review",
  "Security compliance walkthrough",
  "Performance budget planning",
];

const AGENTS = [
  "research",
  "support",
  "ops",
  "billing",
  "engineering",
  "product",
  "sre",
  "sales",
];

export interface GeneratedMemory {
  agent: string;
  text: string;
  metadata: {
    category: string;
    project?: string;
    person?: string;
    company?: string;
    invoice?: string;
    priority: "low" | "medium" | "high";
    generatedAt: string;
    seed: number;
  };
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

function padInvoice(n: number): string {
  return `INV-${String(1000 + (n % 9000)).padStart(4, "0")}`;
}

function relativeDate(seed: number): string {
  const offsets = [
    "today",
    "tomorrow",
    "yesterday",
    "next Monday",
    "this Friday",
    "in 3 days",
    "next week",
    "on 2026-08-01",
    "on 2026-07-21",
  ];
  return pick(offsets, seed);
}

const TEMPLATES: Array<(seed: number) => Omit<GeneratedMemory, "agent">> = [
  (seed) => {
    const invoice = padInvoice(seed);
    const company = pick(COMPANIES, seed + 1);
    return {
      text: `User paid invoice ${invoice} for ${company}`,
      metadata: {
        category: "billing",
        company,
        invoice,
        priority: "medium",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const company = pick(COMPANIES, seed + 2);
    return {
      text: `Meeting with ${company} ${relativeDate(seed)} about ${pick(MEETING_TOPICS, seed)}`,
      metadata: {
        category: "meeting",
        company,
        priority: "high",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const task = pick(TASKS, seed);
    const project = pick(PROJECTS, seed + 3);
    return {
      text: `${task} for ${project}`,
      metadata: {
        category: "task",
        project,
        priority: pick(["low", "medium", "high"] as const, seed),
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const person = pick(PEOPLE, seed);
    const project = pick(PROJECTS, seed + 4);
    return {
      text: `${person} requested status update on ${project}`,
      metadata: {
        category: "communication",
        person,
        project,
        priority: "medium",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const company = pick(COMPANIES, seed + 5);
    return {
      text: `Customer from ${company} requested refund for invoice ${padInvoice(seed + 17)}`,
      metadata: {
        category: "support",
        company,
        invoice: padInvoice(seed + 17),
        priority: "high",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const project = pick(PROJECTS, seed + 6);
    return {
      text: `Deploy production release for ${project} scheduled ${relativeDate(seed + 1)}`,
      metadata: {
        category: "ops",
        project,
        priority: "high",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const person = pick(PEOPLE, seed + 7);
    const company = pick(COMPANIES, seed + 8);
    return {
      text: `${person} shared research notes on ${company} API rate limits`,
      metadata: {
        category: "research",
        person,
        company,
        priority: "low",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const project = pick(PROJECTS, seed + 9);
    return {
      text: `Update project roadmap for ${project}: prioritize ${pick(TASKS, seed + 11)}`,
      metadata: {
        category: "planning",
        project,
        priority: "medium",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const company = pick(COMPANIES, seed + 10);
    const person = pick(PEOPLE, seed + 12);
    return {
      text: `Follow up with ${person} at ${company} regarding LangChain integration timeline`,
      metadata: {
        category: "follow-up",
        person,
        company,
        priority: "medium",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
  (seed) => {
    const project = pick(PROJECTS, seed + 13);
    return {
      text: `Incident note: ${project} saw elevated recall latency after 10k memory load`,
      metadata: {
        category: "incident",
        project,
        priority: "high",
        generatedAt: new Date().toISOString(),
        seed,
      },
    };
  },
];

/** Generate a single realistic memory for the given seed. */
export function generateMemory(seed: number): GeneratedMemory {
  const template = TEMPLATES[Math.abs(seed) % TEMPLATES.length]!;
  const body = template(seed);
  return {
    agent: pick(AGENTS, seed + 99),
    ...body,
  };
}

/** Generate `count` unique realistic memories. */
export function generateMemories(count: number, startSeed = 1): GeneratedMemory[] {
  const out: GeneratedMemory[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(generateMemory(startSeed + i));
  }
  return out;
}

/** Realistic semantic search queries aligned with generated content. */
export const SEARCH_QUERIES = [
  "Which invoices were paid recently?",
  "Meetings scheduled with OpenAI",
  "PostgreSQL adapter fixes",
  "LangChain integration research",
  "Customer refund requests",
  "Production deployment plans",
  "Project roadmap updates",
  "Billing issues and invoice disputes",
  "Recall latency incidents",
  "Follow ups with partners this week",
  "Who requested a status update?",
  "Security or compliance meetings",
] as const;

export function pickSearchQueries(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(SEARCH_QUERIES[i % SEARCH_QUERIES.length]!);
  }
  return out;
}

export { AGENTS, PEOPLE, PROJECTS, COMPANIES, TASKS };

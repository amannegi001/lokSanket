import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedComplaint {
  category: string;
  subcategory: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  language: string;
  affectedGroups: string[];
  keywords: string[];
  normalizedText: string;
}

const SYSTEM_INSTRUCTION = `
You are the intelligence extraction component for LokSanket, an AI-powered constituency development platform.
Your objective is to analyze citizen grievances submitted in Hindi, English, or Hinglish (Romanized Hindi) and convert them into clean, structured data.

Strict Guidelines:
1. Understand natural colloquial phrasing, local civic vocabulary, and mixed-language expressions (Hinglish/Hindi/English).
2. Categorize accurately into civic infrastructure and governance categories (e.g., Road Infrastructure, Water Supply & Sanitation, Electricity & Power, Public Health, Education & Schools, Public Transport, Waste Management, Law & Order, Environment).
3. Determine subcategory describing the specific problem (e.g., Potholes / Road Damage, Contaminated Drinking Water, Transformer Breakdown, Garbage Dump, etc.).
4. Assess severity strictly based on immediate public danger, disruption of essential services, and vulnerability:
   - "critical": Imminent danger to life, major electrical hazard, epidemic threat, collapsed bridge/road.
   - "high": Severe disruption to daily life, sewage overflow in residential areas, hospital/school access blocked, prolonged water/power blackout.
   - "medium": Significant inconvenience, persistent road potholes, street lights non-functional, irregular garbage collection.
   - "low": Minor civic aesthetic issues, small non-blocking repairs, general suggestions.
5. Identify affected groups (e.g., "students", "daily commuters", "residents", "senior citizens", "shopkeepers", "pedestrians").
6. Extract key searchable topical tags/keywords.
7. Provide a concise, clear factual summary in English (1-2 sentences).
8. Provide a normalized representation of the core issue in clear, standardized English (normalizedText) for future clustering.
9. DO NOT compute numerical priority scores or rank the issue. Keep extraction purely descriptive and objective.
`;

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: "Primary civic governance category",
    },
    subcategory: {
      type: Type.STRING,
      description: "Specific civic issue or problem subcategory",
    },
    severity: {
      type: Type.STRING,
      enum: ["low", "medium", "high", "critical"],
      description: "Severity level of the civic issue",
    },
    summary: {
      type: Type.STRING,
      description: "Objective English summary of the grievance (1-2 sentences)",
    },
    language: {
      type: Type.STRING,
      description: "Detected language: hindi, english, or hinglish",
    },
    affectedGroups: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Demographics or groups impacted by this issue",
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Salient keywords for indexing and search",
    },
    normalizedText: {
      type: Type.STRING,
      description: "Standardized English representation of the problem for clustering",
    },
  },
  required: [
    "category",
    "subcategory",
    "severity",
    "summary",
    "language",
    "affectedGroups",
    "keywords",
    "normalizedText",
  ],
};

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  return new GoogleGenAI({ apiKey });
}

export async function extractComplaintWithGemini(
  rawText: string,
  userSelectedLanguage?: string
): Promise<ExtractedComplaint> {
  const ai = getAiClient();

  const userPrompt = `
Citizen Complaint:
"""
${rawText}
"""
${
  userSelectedLanguage && userSelectedLanguage !== "auto"
    ? `User indicated language: ${userSelectedLanguage}`
    : ""
}

Extract structured intelligence from this complaint according to the schema.
`;

  // Candidate models to try in order of capability, falling back if transient high demand (503) occurs
  const preferredModel = process.env.GEMINI_MODEL;
  const candidateModels = preferredModel
    ? [preferredModel, "gemini-3.5-flash-lite", "gemini-3.8-flash"]
    : ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"];

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: EXTRACTION_SCHEMA,
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error(`Empty response from Gemini model ${model}`);
      }

      const parsed = JSON.parse(text) as ExtractedComplaint;

      // Validate and sanitize values
      const validSeverities: ExtractedComplaint["severity"][] = [
        "low",
        "medium",
        "high",
        "critical",
      ];
      const severity = validSeverities.includes(parsed.severity)
        ? parsed.severity
        : "medium";

      return {
        category: parsed.category?.trim() || "General Civic Issue",
        subcategory: parsed.subcategory?.trim() || "Uncategorized",
        severity,
        summary: parsed.summary?.trim() || rawText.slice(0, 200),
        language: (parsed.language || "unknown").toLowerCase().trim(),
        affectedGroups: Array.isArray(parsed.affectedGroups)
          ? parsed.affectedGroups.map((g) => String(g).trim()).filter(Boolean)
          : [],
        keywords: Array.isArray(parsed.keywords)
          ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean)
          : [],
        normalizedText: parsed.normalizedText?.trim() || parsed.summary || rawText,
      };
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[lib/gemini] Model ${model} generation attempt failed:`, errMsg);
      // If it's a 503 (high demand) or 404, loop continues to try fallback model
    }
  }

  throw new Error(
    `Failed to extract complaint structure with Gemini: ${
      lastError instanceof Error ? lastError.message : "Unknown error"
    }`
  );
}

export interface ClusterExplanationInput {
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  priorityScore: number;
  priorityLevel: string;
  evidence: {
    reportCount: number;
    affectedLocalities: number;
    localities: string[];
    photoEvidenceCount: number;
    trendPercent: number;
    recentCount: number;
    previousCount: number;
    severityBreakdown: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    affectedGroups: string[];
    demandVolumeScore: number;
    severityScore: number;
    trendScore: number;
    geographicScore: number;
    evidenceScore: number;
    priorityScore: number;
  };
  sampleComplaints?: string[];
}

export async function explainClusterWithGemini(
  input: ClusterExplanationInput
): Promise<string> {
  const ai = getAiClient();

  const explanationSystemPrompt = `
You are the intelligence explanation component for LokSanket, an AI-powered constituency development decision-support platform.
Your purpose is to explain why an issue cluster was flagged with its specific priority score based strictly on the verified civic statistics supplied to you.

CRITICAL RULES:
1. You are explaining verified statistics supplied by the application. Do not calculate, modify, estimate, or invent statistics.
2. Every number you reference must come directly from the provided evidence object.
3. This is a decision-support system, NOT an autonomous government decision-maker.
4. Tone guidelines:
   - Use objective, professional phrasing: "LokSanket identified this as a high-priority issue based on the available evidence."
   - NEVER use directive language like "The government must immediately fix this" or "Authorities are ordered to...".
5. Structure your explanation into concise, informative sections:
   - Synthesis: Why LokSanket flagged this cluster (combining report volume, severity, and recent trend).
   - Geographic & Evidence Grounds: Specific localities affected, photo submissions, and clustering density.
   - Impacted Groups: Vulnerable populations and daily stakeholders affected.
   - Verification Context & Limitations: Note any data limitations (e.g. photo ratio, reporting period) and note that on-ground verification by constituency officers is recommended before fund allocation.
`;

  const userPrompt = `
Verified Cluster Intelligence from LokSanket Engine:
- Title: ${input.title}
- Category: ${input.category} (${input.subcategory})
- Ward(s): ${input.wardIds.join(", ")}
- Priority Score: ${input.priorityScore}/100 (Level: ${input.priorityLevel})
- Total Report Count: ${input.evidence.reportCount}
- Affected Localities (${input.evidence.affectedLocalities} total): ${input.evidence.localities.join(", ")}
- Photo Evidences: ${input.evidence.photoEvidenceCount} submissions
- Recent Trend: ${input.evidence.trendPercent >= 0 ? "+" : ""}${input.evidence.trendPercent}% (${input.evidence.recentCount} reports in recent 14 days vs ${input.evidence.previousCount} in previous 14 days)
- Severity Distribution: ${input.evidence.severityBreakdown.critical} Critical, ${input.evidence.severityBreakdown.high} High, ${input.evidence.severityBreakdown.medium} Medium, ${input.evidence.severityBreakdown.low} Low
- Affected Demographics: ${input.evidence.affectedGroups.join(", ")}
- Engine Component Scores:
  * Demand Volume: ${input.evidence.demandVolumeScore}/100 (Weight: 30%)
  * Severity: ${input.evidence.severityScore}/100 (Weight: 25%)
  * Recent Trend: ${input.evidence.trendScore}/100 (Weight: 20%)
  * Geographic Concentration: ${input.evidence.geographicScore}/100 (Weight: 15%)
  * Evidence Strength: ${input.evidence.evidenceScore}/100 (Weight: 10%)

${
  input.sampleComplaints && input.sampleComplaints.length > 0
    ? `Sample Citizen Grievance Quotes:\n${input.sampleComplaints
        .slice(0, 3)
        .map((s) => `• "${s}"`)
        .join("\n")}`
    : ""
}

Explain why LokSanket flagged this issue following the decision-support instructions.
`;

  const preferredModel = process.env.GEMINI_MODEL;
  const candidateModels = preferredModel
    ? [preferredModel, "gemini-3.5-flash-lite", "gemini-3.8-flash"]
    : ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"];

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: explanationSystemPrompt,
          temperature: 0.2,
        },
      });

      const explanation = response.text?.trim();
      if (explanation) {
        return explanation;
      }
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[lib/gemini] Model ${model} explanation attempt failed:`, errMsg);
    }
  }

  throw new Error(
    `Failed to generate explanation with Gemini: ${
      lastError instanceof Error ? lastError.message : "Unknown error"
    }`
  );
}

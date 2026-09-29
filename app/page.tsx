"use client";

import { useState } from "react";

interface StructuredComplaint {
  _id: string;
  rawText: string;
  language: string;
  normalizedText?: string;
  category: string;
  subcategory: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedGroups: string[];
  keywords: string[];
  location?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

const SAMPLE_COMPLAINTS = [
  {
    label: "Hinglish (Road & Rain)",
    text: "School ke paas wali road bilkul toot gayi hai, baarish mein bahut paani bhar jaata hai aur bachchon ko nikalne mein problem hoti hai.",
    location: "Ward 9, Near Govt Senior Secondary School",
  },
  {
    label: "Hindi (Drinking Water)",
    text: "हमारे वार्ड नंबर 14 में पिछले तीन दिनों से पीने के पानी की सप्लाई बिल्कुल बंद है और लोग टैंकर के लिए परेशान हो रहे हैं।",
    location: "वार्ड नंबर 14, पुराना बाजार",
  },
  {
    label: "English (Health Dispensary)",
    text: "The primary health dispensary in Sector 4 has had no doctor available for the past two weeks, and essential generic medicines are out of stock.",
    location: "Sector 4, Community Health Center",
  },
];

export default function Home() {
  const [complaintText, setComplaintText] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("auto");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StructuredComplaint | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: complaintText,
          location: location.trim() || undefined,
          language: language !== "auto" ? language : undefined,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process complaint");
      }

      setResult(data.complaint);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (sample: (typeof SAMPLE_COMPLAINTS)[0]) => {
    setComplaintText(sample.text);
    setLocation(sample.location);
    setError(null);
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
      case "low":
      default:
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  लोकसंकेत
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Citizen Grievance Intake
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-2">
                Constituency Intelligence Grievance Intake
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Citizen Voice → Google Gemini → Structured Complaint → MongoDB
              </p>
            </div>
            <div>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-colors shadow-2xs"
              >
                <span>Constituency Dashboard →</span>
              </a>
            </div>
          </div>
        </header>

        {/* Quick Samples */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Try Sample Grievances (Hindi / English / Hinglish):
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_COMPLAINTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loadSample(sample)}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors font-medium border border-zinc-200 dark:border-zinc-700 cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </section>

        {/* Input Form */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Submit Citizen Complaint</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="complaintText"
                className="block text-sm font-medium mb-1"
              >
                Citizen Voice / Complaint Details{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                id="complaintText"
                rows={4}
                required
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="उदा. 'School ke paas wali road bilkul toot gayi hai...' या अपनी भाषा में शिकायत लिखें..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium mb-1"
                >
                  Locality / Location (Optional)
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Ward 12, Rampur Road"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                />
              </div>

              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-medium mb-1"
                >
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                >
                  <option value="auto">Auto Detect (Gemini)</option>
                  <option value="hinglish">Hinglish</option>
                  <option value="hindi">Hindi (हिंदी)</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>

            {/* Optional Image field placeholder */}
            <div>
              <label
                htmlFor="imageUrl"
                className="block text-sm font-medium mb-1"
              >
                Evidence / Image URL (Placeholder for future upload)
              </label>
              <input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/evidence-pothole.jpg"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
              />
            </div>

            {error && (
              <div className="p-3 text-sm rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !complaintText.trim()}
              className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Processing with Gemini & Storing in DB...
                </>
              ) : (
                "Submit Grievance"
              )}
            </button>
          </form>
        </section>

        {/* Live Demonstration of Output Flow */}
        {result && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Structured Extraction & MongoDB Record
              </h2>
              <span className="text-xs text-zinc-500">
                DB ID: {result._id}
              </span>
            </div>

            {/* Pipeline Flow representation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Raw Voice */}
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Step 1 · Citizen Voice
                  </div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">
                    Detected Language: <span className="font-semibold uppercase text-zinc-800 dark:text-zinc-200">{result.language}</span>
                  </div>
                  <p className="text-sm italic text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    &ldquo;{result.rawText}&rdquo;
                  </p>
                </div>
                {result.location && (
                  <div className="text-xs text-zinc-500 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    📍 Location: {result.location}
                  </div>
                )}
              </div>

              {/* Step 2: Gemini Intelligence */}
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 shadow-sm md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Step 2 · Gemini Structured Understanding
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getSeverityBadgeClass(
                      result.severity
                    )}`}
                  >
                    Severity: {result.severity.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 block">Category</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {result.category}
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 block">Subcategory</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {result.subcategory}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-zinc-500 block mb-1">
                    English Summary (1-2 sentences)
                  </span>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    {result.summary}
                  </p>
                </div>

                {result.normalizedText && (
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">
                      Normalized Issue (Clustering Representation)
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded border border-zinc-100 dark:border-zinc-800">
                      {result.normalizedText}
                    </p>
                  </div>
                )}

                {/* Affected groups & keywords */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  {result.affectedGroups?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-zinc-500 font-medium">Affected Groups:</span>
                      {result.affectedGroups.map((group, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.keywords?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-zinc-500 font-medium">Keywords:</span>
                      {result.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* DB Metadata */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Status: <strong className="text-zinc-700 dark:text-zinc-300">{result.status}</strong></span>
                  <span>Created: {new Date(result.createdAt).toLocaleString()}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Saved to MongoDB</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

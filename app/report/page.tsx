"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";
import {
  CheckCircle2,
  ArrowRight,
  Camera,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { validatePhotoFile } from "@/lib/photo-validation";

export default function ReportIssuePage() {
  const { t } = useLanguage();
  const [complaintText, setComplaintText] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("auto");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    referenceId: string;
    category: string;
    subcategory?: string;
    severity?: string;
    summary: string;
    location?: string;
    language?: string;
    imageUrl?: string;
    affectedGroups?: string[];
    keywords?: string[];
  } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      setFileError(validation.error || "Invalid file format or size.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let response: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("rawText", complaintText);
        if (location.trim()) formData.append("location", location.trim());
        if (language !== "auto") formData.append("language", language);
        formData.append("photo", selectedFile);

        response = await fetch("/api/complaints", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/complaints", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rawText: complaintText,
            location: location.trim() || undefined,
            language: language !== "auto" ? language : undefined,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to submit grievance. Please try again.");
      }

      setSubmittedData({
        referenceId: data.complaint?._id || "REF-" + Math.floor(Math.random() * 90000 + 10000),
        category: data.complaint?.category || "Civic Grievance",
        subcategory: data.complaint?.subcategory,
        severity: data.complaint?.severity,
        summary: data.complaint?.summary || complaintText.slice(0, 100),
        location: data.complaint?.location,
        language: data.complaint?.language,
        imageUrl: data.complaint?.imageUrl,
        affectedGroups: data.complaint?.affectedGroups,
        keywords: data.complaint?.keywords,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (text: string, loc: string) => {
    setComplaintText(text);
    setLocation(loc);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
          <Link href="/" className="hover:text-slate-800">
            {t.report.breadcrumbHome}
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{t.report.breadcrumbCurrent}</span>
        </nav>

        {!submittedData ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
            {/* Header */}
            <div className="space-y-2 border-b border-slate-100 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t.report.title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.report.subtitle}
              </p>
            </div>

            {/* Quick Helper Samples */}
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80 text-xs text-slate-600 space-y-2">
              <span className="font-semibold text-slate-700 block">
                {t.report.quickExamplesLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    loadSample(
                      "School ke paas wali road bilkul toot gayi hai, baarish mein bahut paani bhar jaata hai aur bachchon ko nikalne mein problem hoti hai.",
                      "Ward 17 - Near Govt Girls Inter College"
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Hinglish (Road &amp; Rain)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadSample(
                      "हमारे वार्ड नंबर 14 में पिछले तीन दिनों से पीने के पानी की सप्लाई बिल्कुल बंद है और लोग टैंकर के लिए परेशान हो रहे हैं।",
                      "Ward 14 - Purana Bazaar"
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Hindi (Water Supply)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadSample(
                      "Primary health dispensary in Sector 4 has had no doctor available for two weeks and essential generic medicines are out of stock.",
                      "Ward 9 - Civil Lines South"
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
                >
                  English (Healthcare)
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Field 1: Issue description */}
              <div className="space-y-1.5">
                <label htmlFor="issueText" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t.report.issueLabel} <span className="text-rose-600">{t.report.issueRequired}</span>
                </label>
                <textarea
                  id="issueText"
                  rows={5}
                  required
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder={t.report.issuePlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
                <span className="text-[11px] text-slate-500 block">
                  {t.report.issueHint}
                </span>
              </div>

              {/* Field 2 & 3: Locality & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="locality" className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {t.report.localityLabel}
                  </label>
                  <input
                    id="locality"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t.report.localityPlaceholder}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="langSelect" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t.report.languageLabel}
                  </label>
                  <select
                    id="langSelect"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  >
                    <option value="auto">{t.report.autoDetect}</option>
                    <option value="hinglish">Hinglish</option>
                    <option value="hindi">Hindi (हिंदी)</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </div>

              {/* Field 4: Optional Photo / Evidence */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  {t.report.photoLabel}
                </label>

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="photo-file-input"
                    />
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-indigo-600">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <span className="text-xs font-semibold text-indigo-700 hover:text-indigo-800">
                        {t.report.photoUploadBtn}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {t.report.photoFormatHint}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewUrl}
                          alt="Evidence preview"
                          className="w-14 h-14 rounded-md object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                          <Camera className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold text-slate-800 truncate"
                          title={selectedFile.name}
                        >
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors cursor-pointer"
                      >
                        {t.report.photoChangeBtn}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                      >
                        {t.report.photoRemoveBtn}
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="photo-file-input-change"
                    />
                  </div>
                )}

                {fileError && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}

                <span className="text-[11px] text-slate-500 block">
                  {t.report.photoHint}
                </span>
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={isLoading || !complaintText.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t.report.submittingBtn}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.report.submitBtn}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-500 text-center sm:text-right">
                  {t.report.submitHint}
                </span>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation Screen (UX4G Citizen Confirmation) */
          <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-xs animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {t.report.successTitle}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.report.successSubtitle}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 max-w-lg mx-auto border border-slate-200 text-xs text-left space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span>{t.report.refIdLabel}</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {submittedData.referenceId}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>{t.report.categoryLabel}</span>
                <span className="font-semibold text-slate-900">
                  {submittedData.category}
                </span>
              </div>

              {submittedData.subcategory && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t.report.subcategoryLabel}</span>
                  <span className="font-medium text-slate-800">
                    {submittedData.subcategory}
                  </span>
                </div>
              )}

              {submittedData.severity && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t.report.severityLabel}</span>
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] border ${
                      submittedData.severity === "critical"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : submittedData.severity === "high"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : submittedData.severity === "medium"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {submittedData.severity}
                  </span>
                </div>
              )}

              {submittedData.affectedGroups && submittedData.affectedGroups.length > 0 && (
                <div className="flex items-start justify-between gap-2 text-slate-600">
                  <span className="shrink-0">{t.report.affectedGroupsLabel}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {submittedData.affectedGroups.map((group) => (
                      <span key={group} className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px]">
                        {group}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {submittedData.imageUrl && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t.report.photoLabel.split("(")[0].trim()}:</span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Attached ({submittedData.imageUrl.split("/").pop()})
                  </span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-200/80 text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200/60">
                &ldquo;{submittedData.summary}&rdquo;
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{t.report.viewInsightsBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmittedData(null);
                  setComplaintText("");
                  setLocation("");
                  handleRemoveFile();
                  setError(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t.report.reportAnotherBtn}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

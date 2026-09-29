"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  Droplets,
  Lightbulb,
  Zap,
  Bus,
  Trash2,
  ShieldCheck,
  Stethoscope,
  GraduationCap,
  FileText,
  Sparkles,
  TrendingUp,
  Camera,
  Sliders,
} from "lucide-react";

export default function LandingPage() {
  const { t } = useLanguage();

  const stepIcons = [
    FileText,
    Sparkles,
    Layers,
    Camera,
    TrendingUp,
    CheckCircle2,
  ];

  const civicDomainIcons = [
    Layers,
    Droplets,
    Droplets,
    ShieldCheck,
    Lightbulb,
    Stethoscope,
    GraduationCap,
    Zap,
    Bus,
    Trash2,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />

      {/* =========================================================================
          SECTION 1: HERO (CENTERED COMPOSITION)
          Generous whitespace, editorial typography, soft layered pastel wave field
          ========================================================================= */}
      <section className="relative overflow-hidden bg-white border-b border-[#EEF0F5] min-h-[680px] sm:min-h-[740px] flex flex-col justify-center">
        {/* Abstract Soft Pastel Lavender/Pink Decorative Flowing Layers (lower 25-30%) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          {/* Subtle soft lavender ambient glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-[#FAF8FF] to-transparent opacity-50 rounded-full blur-3xl" />

          {/* Large flowing civic data contours anchored to bottom */}
          <svg
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1920px] max-w-none h-[280px] sm:h-[360px] md:h-[420px]"
            viewBox="0 0 1920 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Layer 1: Soft subtle pink/rose wave */}
            <path
              d="M0 250C320 180 640 330 1020 240C1400 150 1680 290 1920 220V420H0V250Z"
              fill="#F9F2F7"
              fillOpacity="0.75"
            />
            {/* Layer 2: Pale lilac wave */}
            <path
              d="M0 295C280 220 720 350 1140 270C1520 190 1760 310 1920 280V420H0V295Z"
              fill="#F5F0FF"
              fillOpacity="0.8"
            />
            {/* Layer 3: Soft lavender landscape curve */}
            <path
              d="M0 340C360 275 820 375 1260 305C1600 250 1820 330 1920 320V420H0V340Z"
              fill="#F0EBFA"
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Centered Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center space-y-7">
          {/* Eyebrow: subtle, restrained */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50/90 border border-indigo-100 text-indigo-900 text-xs sm:text-[13px] font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span>{t.hero.eyebrow}</span>
          </div>

          {/* Headline: 60-72px desktop, compact, tight line-height */}
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-slate-900 tracking-tight leading-[1.10] max-w-3xl mx-auto">
            {t.hero.headlinePart1}<br className="hidden sm:inline" /> {t.hero.headlinePart2}
          </h1>

          {/* Supporting Text: 1-2 lines, ~650px max width */}
          <p className="max-w-xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            {t.hero.description}
          </p>

          {/* Centered CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/report"
              className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{t.hero.reportBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-slate-300 text-slate-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs"
            >
              <span>{t.hero.insightsBtn}</span>
            </Link>
          </div>

          {/* Subtle Supporting Statistics Row (No giant KPI cards) */}
          <div className="pt-8 border-t border-[#EEF0F5] max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-700 flex-wrap justify-center">
              <span><strong className="text-slate-900 font-bold">1,247</strong> {t.hero.statReports}</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-900 font-bold">49</strong> {t.hero.statClusters}</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-900 font-bold">86</strong> {t.hero.statLocalities}</span>
            </div>
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
              {t.hero.demoData}
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: THE IDEA / HOW IT WORKS (HORIZONTAL INFORMATION FLOW)
          Background: Very subtle #F7F8FC
          ========================================================================= */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-[#F7F8FC] border-b border-[#EEF0F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Section Header */}
          <div className="max-w-3xl space-y-3">
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-700">
              {t.pipeline.eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t.pipeline.heading}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.pipeline.description}
            </p>
          </div>

          {/* Horizontal Linear Process Flow (Connected Timeline on Desktop, Stacked on Mobile) */}
          <div className="relative">
            {/* Desktop Connecting Rail */}
            <div className="hidden lg:block absolute top-10 left-6 right-6 h-0.5 bg-[#E6E8EF] z-0" aria-hidden="true" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6 relative z-10">
              {t.pipeline.steps.map((step, idx) => {
                const Icon = stepIcons[idx] || FileText;
                return (
                  <div key={step.num} className="space-y-4">
                    {/* Number Badge & Icon Node */}
                    <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-indigo-700 font-mono text-sm font-black shadow-xs shrink-0">
                        {step.num}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                          {t.pipeline.stepLabel} {idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Step Title & Story */}
                    <div className="space-y-1.5 pl-15 lg:pl-0">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: REAL DEVELOPMENT INTELLIGENCE EXAMPLE (LARGE SPLIT SHOWCASE)
          Background: PURE WHITE (#FFFFFF)
          ========================================================================= */}
      <section className="py-24 sm:py-32 bg-white border-b border-[#EEF0F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column (5 cols): Narrative context */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{t.showcase.badge}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                {t.showcase.heading}
              </h2>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {t.showcase.description}
              </p>

              <div className="pt-2 space-y-3 border-t border-[#EEF0F5]">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t.showcase.bullet1}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t.showcase.bullet2}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t.showcase.bullet3}</span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
                >
                  <span>{t.showcase.dashboardLink}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column (7 cols): The Large Product Dossier Showcase Panel */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-[#E6E8EF] shadow-sm p-6 sm:p-9 space-y-7">
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#EEF0F5] pb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        {t.showcase.highPriority}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F7F8FC] text-slate-700 border border-[#E6E8EF]">
                        {t.showcase.category}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {t.showcase.locality}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {t.showcase.issueTitle}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t.showcase.issueSubtitle}
                    </p>
                  </div>

                  {/* Score Callout */}
                  <div className="text-left sm:text-right shrink-0 bg-[#F7F8FC] sm:bg-transparent p-3 sm:p-0 rounded-lg border border-[#E6E8EF] sm:border-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t.showcase.priorityScoreLabel}
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900">
                      80.1 <span className="text-sm sm:text-base font-normal text-slate-400">/ 100</span>
                    </div>
                  </div>
                </div>

                {/* 4 Clean Separated Metrics Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                  <div className="bg-[#F7F8FC] p-4 rounded-xl border border-[#E6E8EF]">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">137</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">{t.showcase.metricReports}</div>
                  </div>
                  <div className="bg-[#F7F8FC] p-4 rounded-xl border border-[#E6E8EF]">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">5</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">{t.showcase.metricLocalities}</div>
                  </div>
                  <div className="bg-[#F7F8FC] p-4 rounded-xl border border-[#E6E8EF]">
                    <div className="text-2xl sm:text-3xl font-black text-blue-600">18</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">{t.showcase.metricPhoto}</div>
                  </div>
                  <div className="bg-[#F7F8FC] p-4 rounded-xl border border-[#E6E8EF]">
                    <div className="text-2xl sm:text-3xl font-black text-rose-600">+159%</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">{t.showcase.metricTrend}</div>
                  </div>
                </div>

                {/* Why Was This Flagged? Box */}
                <div className="bg-indigo-50/50 rounded-xl border border-indigo-100/80 p-5 space-y-2">
                  <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-700" />
                    <span>{t.showcase.whyFlaggedHeading}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-normal">
                    {t.showcase.whyFlaggedBody}
                  </p>
                </div>

                {/* Footer strip of showcase */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 border-t border-[#EEF0F5]">
                  <span className="italic">
                    {t.showcase.decisionNotice}
                  </span>
                  <Link
                    href="/dashboard"
                    className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 shrink-0"
                  >
                    <span>{t.showcase.viewDossierLink}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: WHY THE PRIORITY IS TRUSTWORTHY (SPLIT ANALYTICAL SECTION)
          Background: Very subtle #F7F8FC
          ========================================================================= */}
      <section className="py-24 sm:py-32 bg-[#F7F8FC] border-b border-[#EEF0F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column (5 cols): Principle & Trust */}
            <div className="lg:col-span-5 space-y-6">
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-700">
                {t.evidence.eyebrow}
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {t.evidence.heading}
              </h2>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {t.evidence.description}
              </p>

              {/* Core Principle Callout */}
              <div className="p-5 rounded-xl bg-white border-l-4 border-indigo-600 border border-[#E6E8EF] text-slate-800 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>{t.evidence.principleHeading}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {t.evidence.principleBody}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
                >
                  <span>{t.evidence.inspectLink}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column (7 cols): Clean Vertical Scoring Visualization on White Card */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E8EF] p-6 sm:p-9 space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#EEF0F5] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.evidence.formulaHeader}
                </span>
                <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                  {t.evidence.totalWeight}
                </span>
              </div>

              {/* Formula Components Stack */}
              <div className="space-y-4">
                {t.evidence.weights.map((item) => (
                  <div key={item.label} className="bg-[#F7F8FC] p-4 rounded-xl border border-[#E6E8EF] space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className="text-xs font-normal text-slate-500">· {item.detail}</span>
                      </div>
                      <span className="text-base font-black text-indigo-700 font-mono">
                        {item.weight}%
                      </span>
                    </div>

                    {/* Visual Meter Bar */}
                    <div className="w-full h-2 rounded-full bg-[#E6E8EF] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${item.weight * 2.5}%` }}
                      />
                    </div>

                    <div className="text-xs text-slate-500">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Result Line */}
              <div className="pt-4 border-t border-[#EEF0F5] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F7F8FC] p-4 rounded-xl border border-[#E6E8EF]">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.evidence.auditReady}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">{t.evidence.resultLabel}</span>
                  <span className="text-lg font-black text-slate-900 font-mono">80.1 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: WHAT LOKSANKET COVERS (EDITORIAL TYPOGRAPHIC DIRECTORY)
          Background: PURE WHITE (#FFFFFF)
          ========================================================================= */}
      <section className="pt-20 sm:pt-24 lg:pt-28 pb-10 sm:pb-12 bg-white border-b border-[#EEF0F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-700">
              {t.categories.eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t.categories.heading}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              {t.categories.description}
            </p>
          </div>

          {/* Clean Editorial Typographic Grid (2 cols mobile, 5 cols desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-l border-[#E5E7EB] bg-white">
            {t.categories.items.map((domain, idx) => {
              const Icon = civicDomainIcons[idx] || Layers;
              return (
                <div
                  key={domain.name}
                  className="p-6 border-r border-b border-[#E5E7EB] bg-white space-y-3 hover:bg-[#F7F8FC] transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {domain.name}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                    {domain.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: FINAL CTA (CALM, EDITORIAL, CENTERED)
          Background: Very subtle pale lavender tint (#FAF8FF)
          ========================================================================= */}
      <section id="about" className="pt-10 sm:pt-12 pb-20 sm:pb-24 bg-[#FAF8FF] border-b border-[#EEF0F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t.cta.heading}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              {t.cta.description}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/report"
              className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold transition-colors shadow-xs"
            >
              {t.cta.reportBtn}
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-colors shadow-2xs"
            >
              {t.cta.insightsBtn}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

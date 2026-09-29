"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const navLinks = [
    { name: t.nav.home, href: "/" },
    { name: t.nav.howItWorks, href: "/#how-it-works" },
    { name: t.nav.insights, href: "/dashboard" },
    { name: t.nav.about, href: "/#about" },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      {/* Top micro-bar: Civic Portal Metadata */}
      <div className="bg-slate-100 border-b border-slate-200/80 px-4 py-1 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              लोकसंकेत · LokSanket
            </span>
            <span className="text-slate-300">|</span>
            <span>{t.nav.metaTitle.includes("|") ? t.nav.metaTitle.split("|")[1].trim() : t.nav.metaTitle}</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
              {t.nav.demoBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo.svg"
              alt="LokSanket — Civic Development Intelligence"
              width={1200}
              height={360}
              className="h-9 sm:h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href) && link.href !== "/#how-it-works" && link.href !== "/#about";

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-indigo-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Items */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Language Toggle */}
          <div
            role="group"
            aria-label={t.nav.languageLabel}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              aria-label="Switch to English"
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                language === "en"
                  ? "bg-slate-100 text-slate-900 font-bold border border-slate-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              English
            </button>
            <span className="text-slate-300 text-xs select-none" aria-hidden="true">|</span>
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              aria-pressed={language === "hi"}
              aria-label="हिन्दी में बदलें"
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                language === "hi"
                  ? "bg-slate-100 text-slate-900 font-bold border border-slate-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Primary CTA: Report an Issue */}
          <Link
            href="/report"
            className="px-4 py-2 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>{t.nav.reportCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center sm:hidden gap-2">
          <Link
            href="/report"
            className="px-3 py-1.5 rounded-md bg-indigo-700 text-white text-xs font-semibold"
          >
            {t.nav.reportShort}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-700"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">{t.nav.languageLabel}</span>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                aria-label="Switch to English"
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  language === "en"
                    ? "bg-slate-100 font-bold text-slate-900 border border-slate-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                English
              </button>
              <span className="text-slate-300 text-xs select-none" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                aria-pressed={language === "hi"}
                aria-label="हिन्दी में बदलें"
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  language === "hi"
                    ? "bg-slate-100 font-bold text-slate-900 border border-slate-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ArrowUpRight, ShieldCheck, LogOut } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");
  const { language, setLanguage, t } = useLanguage();

  const isOfficialWorkspace =
    pathname?.startsWith("/official") && pathname !== "/official/access";

  const publicNavLinks = [
    { id: "home", name: t.nav.home, href: "/" },
    { id: "how-it-works", name: t.nav.howItWorks, href: "/#how-it-works" },
    { id: "insights", name: t.nav.insights, href: "/dashboard" },
    { id: "about", name: t.nav.about, href: "/#about" },
  ];

  const officialNavLinks = [
    { id: "official-dash", name: "Dashboard", href: "/official" },
    { id: "official-briefs", name: "Development Brief", href: "/official/briefs" },
  ];

  const currentNavLinks = isOfficialWorkspace ? officialNavLinks : publicNavLinks;

  // Dynamically track active section on scroll or hash change when on the homepage
  useEffect(() => {
    if (pathname !== "/") return;

    const computeActiveSection = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollY + windowHeight >= documentHeight - 120) {
        setActiveSection("about");
        return;
      }

      const aboutEl = document.getElementById("about");
      if (aboutEl) {
        const rect = aboutEl.getBoundingClientRect();
        if (rect.top <= windowHeight * 0.5) {
          setActiveSection("about");
          return;
        }
      }

      const howItWorksEl = document.getElementById("how-it-works");
      if (howItWorksEl) {
        const rect = howItWorksEl.getBoundingClientRect();
        if (rect.top <= 200) {
          setActiveSection("how-it-works");
          return;
        }
      }

      setActiveSection("home");
    };

    const initialRafId = window.requestAnimationFrame(() => {
      if (window.location.hash === "#about") {
        setActiveSection("about");
      } else if (window.location.hash === "#how-it-works") {
        setActiveSection("how-it-works");
      } else {
        computeActiveSection();
      }
    });

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          computeActiveSection();
          ticking = false;
        });
        ticking = true;
      }
    };

    const onHashChange = () => {
      if (window.location.hash === "#about") {
        setActiveSection("about");
      } else if (window.location.hash === "#how-it-works") {
        setActiveSection("how-it-works");
      } else if (window.location.hash === "#home" || !window.location.hash) {
        setActiveSection("home");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.cancelAnimationFrame(initialRafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  const handleNavClick = (id: string, href: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);

    if (pathname === "/" && href.startsWith("/#")) {
      const targetId = href.replace("/#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else if (pathname === "/" && href === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/official/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  const getIsActive = (id: string) => {
    if (isOfficialWorkspace) {
      if (id === "official-dash" && pathname === "/official") return true;
      if (id === "official-briefs" && pathname?.startsWith("/official/briefs")) return true;
      return false;
    }
    if (pathname?.startsWith("/dashboard")) {
      return id === "insights";
    }
    if (pathname === "/") {
      return activeSection === id;
    }
    return false;
  };

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
        <div className="flex items-center gap-3">
          <Link
            href={isOfficialWorkspace ? "/official" : "/"}
            onClick={() => handleNavClick("home", isOfficialWorkspace ? "/official" : "/")}
            className="flex items-center group"
          >
            <Image
              src="/loksanket-logo-light.png"
              alt="LokSanket — Civic Development Intelligence"
              width={875}
              height={724}
              className="h-10 sm:h-11 md:h-12 w-auto object-contain"
              priority
            />
          </Link>

          {isOfficialWorkspace && (
            <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Official Review Mode
            </span>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          {currentNavLinks.map((link) => {
            const isActive = getIsActive(link.id);

            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => handleNavClick(link.id, link.href)}
                className={`text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-indigo-700 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Items */}
        <div className="hidden sm:flex items-center gap-3">
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

          {/* Conditional Actions: Official Workspace vs Public Site */}
          {isOfficialWorkspace ? (
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
              title="Exit official review mode"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Exit Official Mode</span>
            </button>
          ) : (
            <>
              {/* Public link to Official Access */}
              <Link
                href="/official/access"
                className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Access official review workspace (Demo)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>{t.nav.officialReviewBtn}</span>
              </Link>

              {/* Citizen CTA: Report an Issue */}
              <Link
                href="/report"
                className="px-4 py-2 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>{t.nav.reportCta}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center sm:hidden gap-2">
          {!isOfficialWorkspace && (
            <Link
              href="/report"
              className="px-3 py-1.5 rounded-md bg-indigo-700 text-white text-xs font-semibold"
            >
              {t.nav.reportShort}
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          {currentNavLinks.map((link) => {
            const isActive = getIsActive(link.id);

            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => handleNavClick(link.id, link.href)}
                className={`block py-1.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? "text-indigo-700 font-bold"
                    : "text-slate-700 hover:text-indigo-700 font-medium"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.name}
              </Link>
            );
          })}

          {!isOfficialWorkspace && (
            <Link
              href="/official/access"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-sm font-semibold text-indigo-700 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>{t.nav.officialReviewBtn}</span>
            </Link>
          )}

          {isOfficialWorkspace && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left py-1.5 text-sm font-semibold text-rose-700 flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Exit Official Mode</span>
            </button>
          )}

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

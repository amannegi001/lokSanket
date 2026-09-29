"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/loksanket-logo-dark.png"
                alt="LokSanket Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain shrink-0"
              />
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">
                  LokSanket
                </span>
                <span className="text-slate-600 font-mono text-sm">|</span>
                <span className="text-sm text-slate-300 font-medium">
                  लोकसंकेत
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              {t.footer.brandDescription}
            </p>
            <div className="text-xs text-slate-400">
              {t.footer.ux4gCredit}
            </div>
          </div>

          {/* Column 2: Platform Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t.footer.platformHeading}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                  {t.footer.home}
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-slate-400 hover:text-white transition-colors">
                  {t.footer.howItWorks}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                  {t.footer.dashboard}
                </Link>
              </li>
              <li>
                <Link href="/report" className="text-slate-400 hover:text-white transition-colors">
                  {t.footer.report}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance / Decision Support Notice */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t.footer.noticeHeading}
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t.footer.noticeBody}
            </p>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} {t.footer.copyright}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">{t.footer.decisionSupportMode}</span>
            <span>·</span>
            <span>{t.footer.groundTruthRequired}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logoSrc from "@/app/assets/logo.svg";
import { ArrowRightUp } from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function Footer() {
  const { t } = useLanguage();
  const router = useRouter();
  const year = new Date().getFullYear();
  const candidateLinks = [
    { label: t("landing.footer.candidateLink1"), path: "/practice", highlight: true },
    { label: t("landing.footer.candidateLink2"), path: "/cv-review", highlight: true },
    { label: t("landing.footer.candidateLink3"), path: "/question-bank" },
    { label: t("landing.footer.candidateLink4"), path: "/history" },
  ];
  const employerLinks = [
    { label: t("landing.footer.employerLink1"), path: "/hiring-solutions", highlight: true },
    { label: t("landing.footer.employerLink2"), path: "/interview-automation" },
    { label: t("landing.footer.employerLink3"), path: "/evaluation-ranking" },
    { label: t("landing.footer.employerLink4"), path: "/b2b-pricing" },
  ];
  const resourceLinks = [
    { label: t("landing.footer.resourceLink1"), path: "/blog" },
    { label: t("landing.footer.resourceLink2"), path: "/terms" },
    { label: t("landing.footer.resourceLink3"), path: "/privacy" },
    { label: t("landing.footer.resourceLink4"), path: "/contact-support" },
  ];
  const socials = ["LinkedIn", "Twitter", "GitHub", "Facebook"];

  const navigate = (path: string) => router.push(path);
  const linkClass = "text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group";

  return (
    <footer className="w-full bg-zinc-950/70 backdrop-blur-md border-t border-white/5 py-16 px-12 md:px-36 relative z-10">
      <div className="w-full flex flex-col gap-12">
        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Logo & Description */}
          <div className="flex flex-col gap-4 lg:col-span-2 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Image
                  src={logoSrc}
                  alt="InterV Logo"
                  width={32}
                  height={32}
                  className="brightness-0 invert object-contain"
                />
              </div>
              <span className="font-logo font-bold text-xl tracking-tight text-white">
                InterV
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mt-2">
              {t("landing.footer.description")}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-4">
              {socials.map((social, index) => (
              <button
                key={social}
                type="button"
                className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:bg-[var(--chart-1)] hover:text-zinc-950 transition-all duration-300"
                aria-label={social}
              >
                {index === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                  </svg>
                ) : index === 1 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                  </svg>
                ) : index === 2 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                )}
              </button>
              ))}
            </div>
          </div>

          {/* Links Column 1: Candidates */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-sm tracking-wide">{t("landing.footer.candidatesTitle")}</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {candidateLinks.map((item) => (
                <li key={item.path}>
                  <button type="button" onClick={() => navigate(item.path)} className={linkClass}>
                    {item.label}
                    {item.highlight ? <ArrowRightUp className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2: Employers */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-sm tracking-wide">{t("landing.footer.employersTitle")}</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {employerLinks.map((item) => (
                <li key={item.path}>
                  <button type="button" onClick={() => navigate(item.path)} className={linkClass}>
                    {item.label}
                    {item.highlight ? <ArrowRightUp className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 3: Legal & Resources */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-sm tracking-wide">{t("landing.footer.resourcesTitle")}</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {resourceLinks.map((item) => (
                <li key={item.path}>
                  <button type="button" onClick={() => navigate(item.path)} className={linkClass}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/5" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <span>{t("landing.footer.copyright", { year })}</span>
        </div>
      </div>
    </footer>
  );
}

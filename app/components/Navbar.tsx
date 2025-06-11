"use client";
import { useState } from "react";

export default function Navbar({ landing = false }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo always left */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-black rounded-md" />
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">
                Pluto Wallet
              </span>
            </div>
            {/* Hamburger for mobile */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Right nav (desktop) */}
            {landing && (
              <div className="hidden md:flex items-center gap-3 md:gap-4">
                <a
                  href="https://www.solanaappkit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 font-light text-sm md:text-base hover:underline"
                >
                  Solana App Kit
                </a>
                <a
                  href="https://thesendcoin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 font-light text-sm md:text-base hover:underline"
                >
                  SEND
                </a>
                {/* X icon */}
                <a
                  href="https://x.com/solanaappkit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M4 4L14 14M14 4L4 14"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
                {/* Telegram icon */}
                <a
                  href="https://t.me/solanaappkit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M15.5 3.5L2.5 8.5L7.5 10.5M15.5 3.5L7.5 10.5M15.5 3.5L12.5 15.5L7.5 10.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                {/* Docs button */}
                <a
                  href="https://docs.solanaappkit.com/docs/introduction"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black font-semibold px-4 py-1.5 rounded-full text-sm shadow hover:bg-gray-100 transition flex items-center gap-2"
                >
                  <svg
                    className="ml-2"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ transform: "rotate(-45deg)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  Docs
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-50 transition ${open ? "block" : "hidden"}`}
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <aside className="fixed top-0 right-0 h-full w-72 bg-transparent flex flex-col items-end p-4">
          <div className="flex flex-col gap-4 w-full">
            {/* Each nav item in a glassy/liquid container */}
            <button
              className="ml-auto mb-2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-cyan-200/30"
              onClick={() => setOpen(false)}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
            <div className="flex flex-col gap-3">
              <a
                href="https://www.solanaappkit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base"
              >
                Solana App Kit
              </a>
              <a
                href="https://thesendcoin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base"
              >
                SEND
              </a>
              <a
                href="https://x.com/solanaappkit"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M4 4L14 14M14 4L4 14"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Twitter
              </a>
              <a
                href="https://t.me/solanaappkit"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M15.5 3.5L2.5 8.5L7.5 10.5M15.5 3.5L7.5 10.5M15.5 3.5L12.5 15.5L7.5 10.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Telegram
              </a>
              <a
                href="https://docs.solanaappkit.com/docs/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base"
              >
                <svg
                  className="ml-2"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: "rotate(-45deg)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                Docs
              </a>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

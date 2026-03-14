'use client'

import React from "react";
import Link from "next/link";

type Props = {
  title: string;
  subtitle: string;
  bullets: string[];
  learnMoreHref: string;
  id?: string;
};

export default function SecurityStrip({
  title,
  subtitle,
  bullets,
  learnMoreHref,
  id = "security",
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative w-full bg-white py-20 md:py-24"
    >
      {/* Container ensures equal left/right spacing site-wide */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Icon + Heading Block */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 ring-1 ring-inset ring-blue-100">
            {/* Shield icon (SVG) — currentColor controlled by text-blue-600 */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l7 3v6c0 5-3.8 8-7 9-3.2-1-7-4-7-9V6l7-3z" />
              <path d="M9.5 12.5l1.8 1.8 3.2-3.6" />
            </svg>
          </div>

          <h2
            id={`${id}-title`}
            className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            {title}
          </h2>

          {subtitle ? (
            <p className="mx-auto mt-3 max-w-2xl text-balance text-lg leading-7 text-slate-600">
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Bullets - Fixed spacing with equal left/right margins */}
        <div className="mx-auto mt-10 max-w-3xl">
          <ul
            role="list"
            className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 justify-center"
          >
            {bullets.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full bg-blue-600/90" />
                <span className="text-base leading-7 text-slate-700">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        {learnMoreHref ? (
          <div className="mt-10 text-center">
            <Link
              href={learnMoreHref}
              className="inline-flex items-center gap-2 text-base font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2 rounded-md"
              aria-label="Learn more about our security"
              onClick={() => {
                // optional tracking hook, no-op friendly
                (window as any)?.track?.("security_learn_more_click", {
                  location: "security-strip",
                });
              }}
            >
              Learn more about our security
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 12h10M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

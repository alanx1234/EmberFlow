"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Estimate Age" },
  { href: "/batch", label: "Batch Estimates" },
  { href: "/forward", label: "Forward Model" },
  { href: "/docs", label: "Documentation" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            (href === "/" ? pathname === "/" : pathname.startsWith(href))
              ? "active"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
      <a
        href="https://github.com/alanx1234/EmberFlow"
        target="_blank"
        rel="noreferrer"
      >
        Python Package<span className="ext">↗</span>
      </a>
    </nav>
  );
}

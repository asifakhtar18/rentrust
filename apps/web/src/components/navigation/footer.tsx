import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-[1200px] px-6 py-14 lg:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <span className="font-serif text-xl text-foreground">RenTrust</span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">First-hand rental experiences, handled with care.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-[14px] sm:grid-cols-3">
            <FooterCol title="Product" links={[["Search", "/search"], ["Compare", "/compare"], ["Saved", "/saved"]]} />
            <FooterCol title="Community" links={[["Review guidelines", "/guidelines#writing"], ["How reporting works", "/guidelines#report"], ["Appeals process", "/guidelines#appeals"]]} />
            <FooterCol title="Legal" links={[["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Content policy", "/legal/content"]]} />
          </div>
        </div>
        <p className="mt-12 max-w-3xl border-t border-border pt-5 text-[13px] leading-relaxed text-muted-foreground">
          Reviews describe individual resident experiences. Verification confirms residency, not that every statement is an independently established fact. © {new Date().getFullYear()} RenTrust.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 font-semibold text-foreground">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}><Link href={href} className="text-muted-foreground transition-colors hover:text-primary">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

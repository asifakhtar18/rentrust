import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <span className="text-body font-semibold text-foreground">RentTrust</span>
            </div>
            <p className="mt-3 text-small text-text-secondary">
              Know the place before you rent. Real resident experiences and transparent trust scores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-small sm:grid-cols-3">
            <FooterCol title="Product" links={[['Search', '/search'], ['Compare', '/compare'], ['Saved', '/saved']]} />
            <FooterCol title="Community" links={[['Review guidelines', '/guidelines'], ['Report a review', '/guidelines'], ['Appeals', '/guidelines']]} />
            <FooterCol title="Legal" links={[['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Content policy', '/legal/content']]} />
          </div>
        </div>
        <p className="mt-12 text-caption text-text-tertiary">
          Reviews reflect individual resident experiences, not verified platform facts. © {new Date().getFullYear()} RentTrust.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 font-medium text-foreground">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-text-secondary transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

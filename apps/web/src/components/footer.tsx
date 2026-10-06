import Link from 'next/link';

/** Quiet footer with the legal/community placeholders the platform requires. */
export function Footer() {
  return (
    <footer className="border-t border-hairline/10 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-xs">
            <p className="text-callout font-semibold text-ink">RentTrust</p>
            <p className="mt-2 text-footnote text-ink-secondary">
              Know what it&apos;s actually like to live there before you rent.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-footnote sm:grid-cols-3">
            <FooterCol title="Product" links={[['Search', '/search'], ['Compare', '/compare'], ['Localities', '/search?type=locality']]} />
            <FooterCol title="Community" links={[['Review guidelines', '/guidelines'], ['Report a review', '/guidelines#report'], ['Appeals', '/guidelines#appeals']]} />
            <FooterCol title="Legal" links={[['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Content policy', '/legal/content']]} />
          </div>
        </div>
        <p className="mt-10 text-caption text-ink-tertiary">
          Reviews reflect individual resident experiences, not verified platform facts. © {new Date().getFullYear()} RentTrust.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 font-medium text-ink">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-ink-secondary transition-colors hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

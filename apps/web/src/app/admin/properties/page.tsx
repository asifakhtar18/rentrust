'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Locality } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Badge, Button, Card, Field, Spinner } from '@/components/ui';

interface AdminProperty {
  id: string;
  displayName: string;
  propertyType: string;
  isClaimed: boolean;
  createdAt: string;
}

interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  createdCount: number;
  issues: { row: number; errors: string[] }[];
}

export default function AdminProperties() {
  const { request } = useAuth();
  const [props, setProps] = useState<AdminProperty[] | null>(null);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [csv, setCsv] = useState('');
  const [localityId, setLocalityId] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data }, loc] = await Promise.all([
        request<AdminProperty[]>('/properties?limit=20'),
        request<Locality[]>('/localities'),
      ]);
      setProps(data);
      setLocalities(loc.data);
      if (loc.data[0]) setLocalityId(loc.data[0].id);
    } catch {
      setProps([]);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runImport(dryRun: boolean) {
    if (!csv.trim() || !localityId) return;
    setBusy(true);
    setResult(null);
    try {
      const { data } = await request<ImportResult>('/admin/properties/import', {
        method: 'POST',
        body: JSON.stringify({ csv, localityId, dryRun }),
      });
      setResult(data);
      if (!dryRun) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Properties</h1>

      <Card className="mt-5 p-6">
        <h2 className="text-title3 font-semibold tracking-tight text-ink">Import from CSV</h2>
        <p className="mt-1 text-footnote text-ink-secondary">
          Header required: <code className="text-ink">display_name, property_type</code> (plus optional
          developer, year_built, latitude, longitude, aliases).
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Locality">
            <select
              value={localityId}
              onChange={(e) => setLocalityId(e.target.value)}
              className="h-11 w-full rounded-xl border border-hairline/15 bg-canvas px-3 text-body text-ink"
            >
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="CSV">
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={5}
              placeholder={'display_name,property_type\nSunrise Residency,APARTMENT'}
              className="w-full rounded-xl border border-hairline/15 bg-canvas p-3 font-mono text-footnote text-ink"
            />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={busy} onClick={() => runImport(true)}>
              Validate (dry run)
            </Button>
            <Button size="sm" variant="primary" loading={busy} onClick={() => runImport(false)}>
              Import
            </Button>
          </div>
          {result && (
            <div className="rounded-xl bg-canvas p-3 text-footnote">
              <p className="text-ink">
                {result.dryRun ? 'Dry run: ' : 'Imported: '}
                {result.validRows} valid of {result.totalRows} rows
                {!result.dryRun && ` · ${result.createdCount} created`}
              </p>
              {result.issues.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-caution">
                  {result.issues.slice(0, 8).map((iss, i) => (
                    <li key={i}>Row {iss.row}: {iss.errors.join('; ')}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Card>

      <h2 className="mb-3 mt-8 text-title3 font-semibold tracking-tight text-ink">Recent properties</h2>
      {props === null ? (
        <Spinner className="text-accent" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-hairline/10">
            {props.map((p) => (
              <a
                key={p.id}
                href={`/properties/${p.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-4 transition-colors hover:bg-ink/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-footnote font-medium text-ink">{p.displayName}</p>
                  <p className="text-caption text-ink-tertiary">{PROPERTY_TYPE_LABELS[p.propertyType]}</p>
                </div>
                {p.isClaimed && <Badge tone="positive">Claimed</Badge>}
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

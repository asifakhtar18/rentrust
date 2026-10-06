'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Locality } from '@/lib/types';
import { Badge, Field } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel } from '../admin-ui';

interface RowIssue {
  row: number;
  errors: string[];
}

interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  createdCount: number;
  createdIds: string[];
  issues: RowIssue[];
}

const CSV_HEADER = 'displayName,propertyType,aliases,latitude,longitude,developer,yearBuilt';
const CSV_EXAMPLE = `${CSV_HEADER}
Prestige Lakeside Habitat,APARTMENT,PLH;Prestige Lakeside,12.9089,77.6810,Prestige Group,2018`;

export default function PropertiesImportPage() {
  const { request } = useAuth();
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [localityId, setLocalityId] = useState('');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLocalities = useCallback(async () => {
    try {
      const { data } = await apiFetch<Locality[]>('/localities');
      setLocalities(data);
      if (data.length) setLocalityId((cur) => cur || data[0].id);
    } catch {
      /* localities are optional for rendering the form */
    }
  }, []);

  useEffect(() => {
    void loadLocalities();
  }, [loadLocalities]);

  async function run(dryRun: boolean) {
    if (!localityId || !csv.trim()) {
      setError('Pick a locality and paste CSV content first.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await request<ImportResult>('/admin/properties/import', {
        method: 'POST',
        body: JSON.stringify({ csv, localityId, dryRun }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHeader title="Import properties" description="Bulk-add properties to a locality from CSV. Validate with a dry run first." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---- Form ---- */}
        <Panel className="p-6">
          <div className="space-y-5">
            <Field label="Locality" htmlFor="locality" hint="All imported properties are added to this locality.">
              <select
                id="locality"
                value={localityId}
                onChange={(e) => setLocalityId(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground focus:border-primary"
              >
                {localities.length === 0 && <option value="">No localities available</option>}
                {localities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="CSV content" htmlFor="csv" hint="First row must be the header. See the format on the right.">
              <textarea
                id="csv"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={12}
                spellCheck={false}
                placeholder={CSV_EXAMPLE}
                className="w-full rounded-md border border-input bg-card px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary"
              />
            </Field>

            {error && (
              <p className="flex items-center gap-2 t-body text-destructive">
                <AlertCircle className="size-4" aria-hidden /> {error}
              </p>
            )}

            <div className="flex gap-2.5">
              <Button variant="secondary" loading={busy} onClick={() => void run(true)}>
                Validate (dry run)
              </Button>
              <Button variant="primary" loading={busy} onClick={() => void run(false)}>
                <UploadCloud className="size-4" aria-hidden /> Import
              </Button>
            </div>
          </div>
        </Panel>

        {/* ---- Format reference + result ---- */}
        <div className="space-y-5">
          <Panel className="p-5">
            <p className="t-label text-foreground">Expected columns</p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-muted px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
              {CSV_HEADER}
            </pre>
            <ul className="mt-3 space-y-1 t-helper">
              <li>propertyType: APARTMENT, PG, CO_LIVING, HOSTEL, INDEPENDENT_HOUSE, VILLA, BUILDER_PROPERTY</li>
              <li>aliases: semicolon-separated, optional</li>
              <li>latitude/longitude/developer/yearBuilt: optional</li>
            </ul>
          </Panel>

          {result && <ResultPanel result={result} />}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: ImportResult }) {
  const ok = result.issues.length === 0;
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-5 text-success" aria-hidden />
        ) : (
          <AlertCircle className="size-5 text-warning" aria-hidden />
        )}
        <p className="t-label text-foreground">{result.dryRun ? 'Dry run complete' : 'Import complete'}</p>
        {result.dryRun && <Badge tone="neutral">No changes saved</Badge>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Total rows" value={result.totalRows} />
        <Stat label="Valid rows" value={result.validRows} />
        {!result.dryRun && <Stat label="Created" value={result.createdCount} />}
        <Stat label="Issues" value={result.issues.length} />
      </dl>

      {result.issues.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="t-helper">Rows with problems</p>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {result.issues.map((iss) => (
              <li key={iss.row} className="rounded-md bg-destructive/5 px-3 py-2">
                <span className="t-label text-destructive">Row {iss.row}</span>
                <p className="mt-0.5 t-helper">{iss.errors.join('; ')}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="t-helper">{label}</dt>
      <dd className="tabular text-xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}

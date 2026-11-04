'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, FileText, UploadCloud } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Locality } from '@/lib/types';
import { Badge, Field } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel } from '../../admin-ui';

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

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const CSV_HEADER = 'display_name,property_type,aliases,latitude,longitude,developer,year_built';
const CSV_EXAMPLE = `${CSV_HEADER}
Prestige Lakeside Habitat,APARTMENT,PLH|Prestige Lakeside,12.9089,77.6810,Prestige Group,2018`;

export default function PropertiesImportPage() {
  const { request } = useAuth();
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [localityId, setLocalityId] = useState('');
  const [csv, setCsv] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
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

  async function readCsvFile(file?: File) {
    setError(null);
    setResult(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setSelectedFile('');
      setError('Choose a .csv file.');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setSelectedFile('');
      setError('CSV files must be 2 MB or smaller.');
      return;
    }
    try {
      setCsv(await file.text());
      setSelectedFile(file.name);
    } catch {
      setSelectedFile('');
      setError('Could not read that CSV file. Try saving it as UTF-8 and selecting it again.');
    }
  }

  async function run(dryRun: boolean) {
    if (!localityId || !csv.trim()) {
      setError('Pick a locality and choose a CSV file or enter CSV content first.');
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
      <AdminHeader
        title="Import properties"
        description="Bulk-add properties to a locality from a CSV file or pasted text. Validate with a dry run first."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---- Form ---- */}
        <Panel className="p-6">
          <div className="space-y-5">
            <Field
              label="Locality"
              htmlFor="locality"
              hint="All imported properties are added to this locality."
            >
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

            <Field
              label="Choose a CSV file"
              htmlFor="csv-file"
              hint="Select a .csv file up to 2 MB. Its contents will appear below for review before import."
            >
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                aria-describedby="csv-file-help csv-import-error"
                onChange={(event) => void readCsvFile(event.target.files?.[0])}
                className="block w-full rounded-md border border-border bg-background px-3 py-2 t-meta text-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:font-medium file:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              />
              <span id="csv-file-help" className="sr-only">
                Choose a CSV file no larger than 2 megabytes.
              </span>
              {selectedFile && (
                <p className="flex items-center gap-1.5 t-helper" role="status" aria-live="polite">
                  <FileText className="size-3.5" aria-hidden /> Loaded {selectedFile}
                </p>
              )}
            </Field>

            <Field
              label="CSV content"
              htmlFor="csv"
              hint="You can also paste CSV text here. First row must be the header."
            >
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
              <p
                id="csv-import-error"
                className="flex items-center gap-2 t-body text-destructive"
                role="alert"
              >
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
              <li>
                property_type: APARTMENT, PG, CO_LIVING, HOSTEL, INDEPENDENT_HOUSE, VILLA,
                BUILDER_PROPERTY
              </li>
              <li>aliases: separate multiple names with |</li>
              <li>latitude, longitude, developer, year_built: optional</li>
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
        <p className="t-label text-foreground">
          {result.dryRun ? 'Dry run complete' : 'Import complete'}
        </p>
        {result.dryRun && <Badge tone="neutral">No changes saved</Badge>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Total rows" value={result.totalRows} />
        <Stat label="Valid rows" value={result.validRows} />
        {!result.dryRun && <Stat label="Created" value={result.createdCount} />}
        <Stat label="Issues" value={result.issues.length} />
      </dl>

      {!result.dryRun && result.createdIds.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="t-helper">
            To add photos, open a property profile and use its Property photos section.
          </p>
          <ul className="mt-2 space-y-1">
            {result.createdIds.map((id) => (
              <li key={id}>
                <Link href={`/properties/${id}`} className="t-meta text-primary hover:underline">
                  Open property {id.slice(0, 8)} to manage photos
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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

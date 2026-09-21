'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useEhs } from '@/contexts/ehs-provider';
import { useGeneral } from '@/contexts/general-provider';
import RecordToolbar, { RecordMetrics } from '@/components/ehs/RecordToolbar';
import { caseDocuments, displayDate, safeDocumentUrl } from '@/lib/ehs-records';
import { FileText, ExternalLink, BookOpen } from 'lucide-react';
import { CAPA_STAGES } from '@/lib/ehs-observations';

export default function EhsDocumentsPage() {
  const { observations } = useEhs();
  const { projects } = useGeneral();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [site, setSite] = useState('all');
  const documents = caseDocuments(observations);
  const filtered = documents.filter(
    (doc) =>
      (stage === 'all' || doc.stage === stage) &&
      (site === 'all' || doc.projectId === site) &&
      [doc.name, doc.caseId, doc.stage]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-5 text-slate-900 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-slate-500">
            Workspace / Safety management
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Safety library
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Documents attached to your CAPA case records.
          </p>
        </div>
        <Link
          href="/downloads"
          className="rounded-lg border bg-white px-4 py-3 text-sm font-medium text-blue-600"
        >
          Company forms & documents ↗
        </Link>
      </header>
      <RecordMetrics
        items={[
          { label: 'Case documents', value: documents.length },
          {
            label: 'Cases with documents',
            value: new Set(documents.map((d) => d.caseId)).size,
          },
          {
            label: 'Sites represented',
            value: new Set(documents.map((d) => d.projectId).filter(Boolean))
              .size,
          },
          {
            label: 'Stages represented',
            value: new Set(documents.map((d) => d.stage)).size,
          },
        ]}
      />
      <RecordToolbar
        search={search}
        onSearch={setSearch}
        count={filtered.length}
        onReset={() => {
          setSearch('');
          setStage('all');
          setSite('all');
        }}
        filters={[
          {
            label: 'Lifecycle stage',
            value: stage,
            onChange: setStage,
            options: [
              { value: 'all', label: 'All stages' },
              ...CAPA_STAGES.map((value) => ({ value, label: value })),
            ],
          },
          {
            label: 'Site',
            value: site,
            onChange: setSite,
            options: [
              { value: 'all', label: 'All sites' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ],
          },
        ]}
      />
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-semibold">Case document register</h2>
          <p className="mt-1 text-xs text-slate-500">
            Attach or update documents in the relevant case stage. Company
            policies and templates remain in Forms & Documents.
          </p>
        </div>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {['Document', 'Case / stage', 'Site', 'Added', 'File'].map(
                    (title) => (
                      <th key={title} className="p-4 font-medium">
                        {title}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((doc) => {
                  const url = safeDocumentUrl(doc.url);
                  return (
                    <tr key={doc.key} className="hover:bg-slate-50">
                      <td className="max-w-[320px] break-words p-4 font-medium">
                        <FileText className="mb-2 h-5 w-5 text-blue-600" />
                        {doc.name}
                      </td>
                      <td className="p-4">
                        <p>CAPA-{doc.caseId.slice(-6).toUpperCase()}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.stage}
                        </p>
                      </td>
                      <td className="p-4">
                        {projects.find((p) => p.id === doc.projectId)?.name ||
                          'Not recorded'}
                      </td>
                      <td className="p-4">{displayDate(doc.uploadedAt)}</td>
                      <td className="p-4">
                        {url ? (
                          <a
                            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-blue-600"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={'Open ' + doc.name}
                          >
                            Open <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-20 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <h3 className="font-medium">No documents found</h3>
            <p className="mt-2 text-sm text-slate-500">
              {documents.length
                ? 'Change your search or filters to find a document.'
                : 'Documents attached to CAPA stages will appear here.'}
            </p>
            <Link
              href="/ehs/observations"
              className="mt-5 inline-block text-sm font-medium text-blue-600"
            >
              Open safety observations →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { ProjectType } from '@/lib/types';

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'aiops', label: 'AIOps' },
  { value: 'data_lakehouse', label: 'Data Lakehouse' },
  { value: 'rag_agent', label: 'RAG Agent' },
  { value: 'llm_eval', label: 'LLM Eval' },
  { value: 'job_pipeline', label: 'Job Pipeline' },
  { value: 'custom', label: 'Custom' },
];

const MIN_CHARS = 50;

interface Props {
  onSubmit: (description: string, projectType: ProjectType) => void;
  isLoading: boolean;
}

export function DescriptionInput({ onSubmit, isLoading }: Props) {
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('custom');

  const count = description.length;
  const valid = count >= MIN_CHARS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || isLoading) return;
    onSubmit(description.trim(), projectType);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="project-type">
          Project type
        </label>
        <div className="flex flex-wrap gap-2" id="project-type">
          {PROJECT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setProjectType(value)}
              className={[
                'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                projectType === value
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="description">
          Describe your project
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you building? Include the problem it solves, the data sources involved, the AI/ML components you expect to use, and any known constraints (scale, infra, solo vs team, cost ceiling)."
          className="min-h-52 w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <span
            className={[
              'text-xs',
              count === 0 ? 'text-zinc-400' : valid ? 'text-emerald-600' : 'text-amber-600',
            ].join(' ')}
          >
            {count === 0
              ? `${MIN_CHARS} characters minimum`
              : valid
              ? `${count} characters`
              : `${MIN_CHARS - count} more characters needed`}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!valid || isLoading}
        className="flex h-11 items-center justify-center gap-2 self-start rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? (
          <>
            <Spinner />
            Analysing…
          </>
        ) : (
          'Analyse project →'
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

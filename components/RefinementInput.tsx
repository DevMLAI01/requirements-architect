'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function RefinementInput({ onSubmit, onCancel, isLoading }: Props) {
  const [feedback, setFeedback] = useState('');
  const valid = feedback.trim().length >= 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || isLoading) return;
    onSubmit(feedback.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-zinc-900">Refine your REQUIREMENTS.md</h2>
        <p className="text-sm text-zinc-500">
          Describe what to change — add, remove, or adjust any section. The rest stays intact.
        </p>
      </div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="e.g. Add Redis as a caching layer in the architecture decisions. Change the deployment target from AWS ECS to Docker Compose for local-first operation. Add a phase for monitoring and alerting."
        className="min-h-36 w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        disabled={isLoading}
        autoFocus
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || isLoading}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Spinner />
              Refining…
            </>
          ) : (
            'Refine →'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="h-10 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

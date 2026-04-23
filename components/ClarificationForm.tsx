'use client';

import { useState } from 'react';

interface Props {
  questions: string[];
  onSubmit: (answers: string[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function ClarificationForm({ questions, onSubmit, onBack, isLoading }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));

  const allAnswered = answers.every((a) => a.trim().length > 0);

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered || isLoading) return;
    onSubmit(answers.map((a) => a.trim()));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-zinc-900">
          A few quick questions before we generate
        </h2>
        <p className="text-sm text-zinc-500">
          Answer in 1–3 sentences. These resolve the key architectural ambiguities.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((question, i) => (
          <div key={i} className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-zinc-700"
              htmlFor={`answer-${i}`}
            >
              {i + 1}. {question}
            </label>
            <textarea
              id={`answer-${i}`}
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              rows={3}
              placeholder="Your answer…"
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              disabled={isLoading}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!allAnswered || isLoading}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            'Generate REQUIREMENTS.md →'
          )}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="h-11 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40"
        >
          ← Back
        </button>
      </div>
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

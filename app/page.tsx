'use client';

import { useRequirementsGenerator } from '@/hooks/useRequirementsGenerator';
import { DescriptionInput } from '@/components/DescriptionInput';
import { ClarificationForm } from '@/components/ClarificationForm';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  const { state, submitDescription, submitAnswers, retryGenerate, canRetry, reset } =
    useRequirementsGenerator();
  const { step, description, projectType, questions, output, tokensEstimate, generationMs, error } =
    state;

  const isWide = step === 'generating' || step === 'done';

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className={`mx-auto px-4 py-12 ${isWide ? 'max-w-5xl' : 'max-w-2xl'}`}>
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            REQUIREMENTS Architect
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Generate production-grade REQUIREMENTS.md files for AI/ML projects.
          </p>
        </header>

        {/* Step indicator */}
        {step !== 'idle' && step !== 'error' && (
          <div className="mb-8 flex items-center gap-2 text-xs text-zinc-400">
            <Step label="Describe" active={step === 'clarifying'} done={step !== 'clarifying'} />
            <Divider />
            <Step
              label="Clarify"
              active={step === 'answering'}
              done={step === 'generating' || step === 'done'}
            />
            <Divider />
            <Step label="Generate" active={step === 'generating'} done={step === 'done'} />
          </div>
        )}

        {/* idle */}
        {step === 'idle' && (
          <DescriptionInput onSubmit={submitDescription} isLoading={false} />
        )}

        {/* clarifying — spinner while waiting for questions */}
        {step === 'clarifying' && (
          <DescriptionInput onSubmit={submitDescription} isLoading={true} />
        )}

        {/* answering — questions form */}
        {step === 'answering' && (
          <ClarificationForm
            questions={questions}
            onSubmit={(answers) => submitAnswers(description, projectType, answers)}
            onBack={reset}
            isLoading={false}
          />
        )}

        {/* generating — streaming */}
        {step === 'generating' && (
          <ErrorBoundary>
            <MarkdownRenderer
              content={output}
              isDone={false}
              tokensEstimate={tokensEstimate}
              generationMs={generationMs}
              onReset={reset}
            />
          </ErrorBoundary>
        )}

        {/* done */}
        {step === 'done' && (
          <ErrorBoundary>
            <MarkdownRenderer
              content={output}
              isDone={true}
              tokensEstimate={tokensEstimate}
              generationMs={generationMs}
              onReset={reset}
            />
          </ErrorBoundary>
        )}

        {/* error */}
        {step === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-1 text-sm font-semibold text-red-800">Something went wrong</h2>
            <p className="mb-4 font-mono text-sm text-red-700">{error}</p>
            <div className="flex items-center gap-3">
              {canRetry && (
                <button
                  onClick={retryGenerate}
                  className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Retry generation
                </button>
              )}
              <button
                onClick={reset}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-100"
              >
                ← Start over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={[
        'font-medium',
        active ? 'text-zinc-900' : done ? 'text-emerald-600' : 'text-zinc-400',
      ].join(' ')}
    >
      {done ? '✓ ' : ''}
      {label}
    </span>
  );
}

function Divider() {
  return <span className="text-zinc-300">›</span>;
}

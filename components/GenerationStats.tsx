'use client';

interface Props {
  tokensEstimate: number;
  generationMs: number;
}

export function GenerationStats({ tokensEstimate, generationMs }: Props) {
  const cost = ((tokensEstimate * 15) / 1_000_000).toFixed(4);
  const secs = (generationMs / 1000).toFixed(1);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">
      <span>
        Generated in <span className="font-medium text-zinc-600">{secs}s</span>
      </span>
      <span>·</span>
      <span>
        ~<span className="font-medium text-zinc-600">{tokensEstimate.toLocaleString()}</span> tokens
      </span>
      <span>·</span>
      <span>
        ~<span className="font-medium text-zinc-600">${cost}</span> estimated cost
      </span>
      <span>·</span>
      <span>
        <span className="font-medium text-zinc-600">claude-sonnet-4-6</span>
      </span>
    </div>
  );
}

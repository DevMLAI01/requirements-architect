'use client';

import { useReducer, useCallback, useRef } from 'react';
import type { WizardState, ProjectType } from '@/lib/types';

interface GenParams {
  description: string;
  projectType: ProjectType;
  answers: string[];
}

type Action =
  | { type: 'SET_CLARIFYING' }
  | { type: 'SET_QUESTIONS'; questions: string[] }
  | { type: 'SET_GENERATING' }
  | { type: 'APPEND_OUTPUT'; chunk: string }
  | { type: 'SET_DONE'; ms: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: WizardState = {
  step: 'idle',
  description: '',
  projectType: 'custom',
  questions: [],
  answers: {},
  output: '',
  tokensEstimate: 0,
  error: null,
  generationMs: 0,
};

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET_CLARIFYING':
      return { ...state, step: 'clarifying', error: null };
    case 'SET_QUESTIONS':
      return { ...state, step: 'answering', questions: action.questions };
    case 'SET_GENERATING':
      return { ...state, step: 'generating', output: '', error: null, generationMs: 0 };
    case 'APPEND_OUTPUT': {
      const output = state.output + action.chunk;
      return { ...state, output, tokensEstimate: Math.ceil(output.length / 4) };
    }
    case 'SET_DONE':
      return { ...state, step: 'done', generationMs: action.ms };
    case 'SET_ERROR':
      return { ...state, step: 'error', error: action.error };
    case 'RESET':
      return initialState;
  }
}

export function useRequirementsGenerator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const lastGenParams = useRef<GenParams | null>(null);
  const genStartRef = useRef<number>(0);

  const submitDescription = useCallback(
    async (description: string, projectType: ProjectType) => {
      dispatch({ type: 'SET_CLARIFYING' });
      try {
        const res = await fetch('/api/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, projectType }),
        });
        const data: { questions?: string[]; error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Clarification failed');
        dispatch({ type: 'SET_QUESTIONS', questions: data.questions! });
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    []
  );

  const runGenerate = useCallback(async (params: GenParams) => {
    lastGenParams.current = params;
    genStartRef.current = Date.now();
    dispatch({ type: 'SET_GENERATING' });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json();
        throw new Error(data.error ?? 'Generation failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        dispatch({ type: 'APPEND_OUTPUT', chunk: decoder.decode(value, { stream: true }) });
      }
      dispatch({ type: 'SET_DONE', ms: Date.now() - genStartRef.current });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  const submitAnswers = useCallback(
    (description: string, projectType: ProjectType, answers: string[]) =>
      runGenerate({ description, projectType, answers }),
    [runGenerate]
  );

  const retryGenerate = useCallback(() => {
    if (lastGenParams.current) runGenerate(lastGenParams.current);
  }, [runGenerate]);

  const canRetry = lastGenParams.current !== null;

  const reset = useCallback(() => {
    lastGenParams.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  return { state, submitDescription, submitAnswers, retryGenerate, canRetry, reset };
}

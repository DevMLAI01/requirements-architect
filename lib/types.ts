export type WizardStep =
  | 'idle'
  | 'clarifying'
  | 'answering'
  | 'generating'
  | 'done'
  | 'error';

export type ProjectType =
  | 'aiops'
  | 'data_lakehouse'
  | 'rag_agent'
  | 'llm_eval'
  | 'job_pipeline'
  | 'custom';

export interface WizardState {
  step: WizardStep;
  description: string;
  projectType: ProjectType;
  questions: string[];
  answers: Record<number, string>;
  output: string;
  tokensEstimate: number;
  generationMs: number;
  error: string | null;
}

export interface ClarifyRequest {
  description: string;
  projectType: ProjectType;
}

export interface ClarifyResponse {
  questions: string[];
}

export interface GenerateRequest {
  description: string;
  projectType: ProjectType;
  answers: string[];
}

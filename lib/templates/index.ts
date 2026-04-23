import { readFileSync } from 'fs';
import { join } from 'path';
import type { ProjectType } from '../types';

interface StackItem {
  layer: string;
  choice: string;
  rationale: string;
}

interface ArchDecision {
  decision: string;
  choice: string;
  rationale: string;
}

interface ProjectTemplate {
  name: string;
  projectType: ProjectType;
  description: string;
  defaultStack: StackItem[];
  phaseHints: string[];
  architectureDecisions: ArchDecision[];
  costModelHint: string;
}

const templateFiles: Record<Exclude<ProjectType, 'custom'>, string> = {
  aiops: 'aiops_triage.json',
  data_lakehouse: 'data_lakehouse.json',
  rag_agent: 'rag_agent.json',
  llm_eval: 'llm_eval.json',
  job_pipeline: 'job_pipeline.json',
};

function loadTemplate(projectType: ProjectType): ProjectTemplate | null {
  if (projectType === 'custom') return null;
  const file = templateFiles[projectType];
  const raw = readFileSync(join(process.cwd(), 'lib', 'templates', file), 'utf-8');
  return JSON.parse(raw) as ProjectTemplate;
}

export function formatTemplateContext(projectType: ProjectType): string | null {
  const template = loadTemplate(projectType);
  if (!template) return null;

  const stackTable = [
    '| Layer | Choice | Rationale |',
    '|---|---|---|',
    ...template.defaultStack.map(
      (s) => `| ${s.layer} | ${s.choice} | ${s.rationale} |`
    ),
  ].join('\n');

  const archTable = [
    '| Decision | Choice | Rationale |',
    '|---|---|---|',
    ...template.architectureDecisions.map(
      (a) => `| ${a.decision} | ${a.choice} | ${a.rationale} |`
    ),
  ].join('\n');

  const phaseList = template.phaseHints.map((h) => `- ${h}`).join('\n');

  return `## Project type template: ${template.name}

Use this as calibration for architecture decisions, stack defaults, and phase structure. Adapt to the user's specific constraints — do not copy verbatim.

### Overview
${template.description}

### Default stack
${stackTable}

### Phase structure guidance
${phaseList}

### Architecture decision precedents
${archTable}

### Cost model guidance
${template.costModelHint}`;
}

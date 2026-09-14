export type Verdict =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit'
  | 'runtime_error'
  | 'compilation_error'
  | 'server_error';

export type SupportedLanguage = 'javascript' | 'python' | 'java' | 'cpp' | 'c';
export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ProblemStatus = 'draft' | 'review' | 'published' | 'retired';

export interface TestcaseResultDTO {
  ordinal: number;
  status: 'passed' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compilation_error' | 'error';
  time: number;
  memory: number | null;
  error?: string | null;
  input?: string;
  expected?: string;
  got?: string;
}

export interface SubmissionRequestDTO {
  problemId: string;
  code: string;
  language: SupportedLanguage;
}

export interface SubmissionResponseDTO {
  id: string;
  submissionId: string;
  status: Verdict;
  pollAfterMs: number;
}

export interface SubmissionDetailDTO {
  id: string;
  submissionId: string;
  status: Verdict;
  isTerminal: boolean;
  problemId: {
    _id: string;
    title: string;
    slug: string;
    difficulty: ProblemDifficulty;
  };
  problemVersion: number;
  language: SupportedLanguage;
  code: string;
  results: TestcaseResultDTO[];
  output?: string;
  error?: string;
  time?: number;
  memory?: number;
  createdAt: string;
}

export interface RunRequestDTO {
  code: string;
  problemId: string;
  language?: SupportedLanguage;
  input?: any;
  testcases?: Array<{ input: any; output?: any }>;
}

export interface RunResultDTO {
  ordinal: number;
  input: string;
  expected: string | null;
  got: string;
  status: 'passed' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compilation_error' | 'server_error';
  error?: string | null;
  time: number;
  memory: number | null;
}

export interface RunResponseDTO {
  results: RunResultDTO[];
}

export interface ProblemListItemDTO {
  _id: string;
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  status: ProblemStatus;
  isSolved?: boolean;
}

export interface ProblemDetailDTO {
  _id: string;
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  timeLimit: number;
  memoryLimit: number;
  supportedLanguages: SupportedLanguage[];
  starterCode: Record<SupportedLanguage, string>;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testcases: Array<{ input: any; output: string }>;
  version: number;
  editorial?: {
    hints?: string[];
    approach?: string;
  };
}

export interface UserStatsDTO {
  problemsAvailable: number;
  currentStreak: number;
  streakText: string;
  ranking: string;
  rank: number | null;
  totalUsers: number;
  solvedCount: number;
}

export interface HealthReadyDTO {
  status: 'ready' | 'degraded';
  mongo: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  timestamp: string;
}

export interface HealthLiveDTO {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

// 类型定义文件 - 前后端共享的类型

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'guest';
}

export interface Session {
  id: string;
  session_id: string;
  name: string;
  created_at: string;
}

export interface Round {
  id: string;
  session_id: string;
  round_number: number;
  status: RoundStatus;
  created_at: string;
  performance_start_time: string | null;
  performance_end_time: string | null;
  evaluation_start_time: string | null;
  evaluation_end_time: string | null;
  round_end_time: string | null;
  score: number | null;
  submit: number;
}

export enum RoundStatus {
  NOT_STARTED = 0,
  PERFORMING = 1,
  PERFORMANCE_ENDED = 2,
  EVALUATING = 3,
  EVALUATED = 4,
  ROUND_ENDED = 5
}

export const RoundStatusLabels: Record<RoundStatus, string> = {
  [RoundStatus.NOT_STARTED]: '未开始',
  [RoundStatus.PERFORMING]: '演出中',
  [RoundStatus.PERFORMANCE_ENDED]: '演出结束',
  [RoundStatus.EVALUATING]: '评估中',
  [RoundStatus.EVALUATED]: '已评估',
  [RoundStatus.ROUND_ENDED]: '本轮结束'
};

export interface RegularEvaluation {
  id: string;
  session_id: string;
  round: number;
  score: number;
  evaluated_at: string;
}

export interface ExpertEvaluation {
  id: string;
  session_id: string;
  round: number;
  expert_score: number;
  evaluated_at: string;
}

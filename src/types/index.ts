// 类型定义文件 - 前后端共享的类型

export interface Session {
  id: string;
  session_id: string;
  name: string;
}

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

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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
  current_round: number;
  created_at: string;
}

export interface Round {
  id: string;
  session_id: string;
  round_number: number;
  status: number;
  created_at: string;
  performance_start_time: string | null;
  performance_end_time: string | null;
  evaluation_start_time: string | null;
  evaluation_end_time: string | null;
  round_end_time: string | null;
  score: number | null;
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

export interface CameraConfig {
  camera_id: string;
  rotation: number;
  updated_at: string;
}

const DB_JSON_FILE = path.join(process.cwd(), 'data', 'database.json');

// 内置用户
const DEFAULT_USERS: User[] = [
  { id: '1', username: 'Tidenews', password: 'Tidenews@video.ai', role: 'admin' },
  { id: '2', username: 'guest', password: 'guest', role: 'guest' }
];

// 内存数据存储
let users: User[] = [...DEFAULT_USERS];
let sessions: Session[] = [];
let rounds: Round[] = [];
let regularEvaluations: RegularEvaluation[] = [];
let expertEvaluations: ExpertEvaluation[] = [];
let cameraConfigs: CameraConfig[] = [];
let isInitialized = false;

// 保存数据到 JSON 文件
function saveToFile() {
  const data = {
    users,
    sessions,
    rounds,
    regularEvaluations,
    expertEvaluations,
    cameraConfigs
  };
  const dataDir = path.dirname(DB_JSON_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_JSON_FILE, JSON.stringify(data, null, 2));
}

// 从 JSON 文件加载数据
function loadFromFile() {
  if (fs.existsSync(DB_JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_JSON_FILE, 'utf-8'));
      users = data.users || [...DEFAULT_USERS];
      sessions = data.sessions || [];
      rounds = data.rounds || [];
      regularEvaluations = data.regularEvaluations || [];
      expertEvaluations = data.expertEvaluations || [];
      cameraConfigs = data.cameraConfigs || [];
    } catch (error) {
      console.error('加载数据失败:', error);
      users = [...DEFAULT_USERS];
      sessions = [];
      rounds = [];
      regularEvaluations = [];
      expertEvaluations = [];
      cameraConfigs = [];
    }
  }
}

// 初始化数据库
function initDatabase() {
  if (isInitialized) return;
  loadFromFile();
  isInitialized = true;
}

// 确保数据库已初始化
function ensureDb() {
  if (!isInitialized) {
    initDatabase();
  }
}

// 用户认证
export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  ensureDb();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  ensureDb();
  return users.find(u => u.username === username) || null;
};

// 场次管理
export const createSession = async (name: string): Promise<Session> => {
  ensureDb();
  const id = uuidv4();
  const sessionId = uuidv4();
  const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const session: Session = { 
    id, 
    session_id: sessionId, 
    name, 
    current_round: 0,
    created_at: createdAt 
  };
  sessions.push(session);
  saveToFile();
  return session;
};

export const getSession = async (sessionId: string): Promise<Session | undefined> => {
  ensureDb();
  return sessions.find(s => s.session_id === sessionId);
};

export const getAllSessions = async (): Promise<Session[]> => {
  ensureDb();
  return [...sessions].reverse();
};

export const updateSessionCurrentRound = async (sessionId: string, currentRound: number): Promise<void> => {
  ensureDb();
  const session = sessions.find(s => s.session_id === sessionId);
  if (session) {
    session.current_round = currentRound;
    saveToFile();
  }
};

// 轮次管理
export const createRound = async (sessionId: string, roundNumber: number): Promise<{ round: Round; session: Session | null }> => {
  ensureDb();
  const id = uuidv4();
  const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const round: Round = {
    id,
    session_id: sessionId,
    round_number: roundNumber,
    status: 0,
    created_at: createdAt,
    performance_start_time: null,
    performance_end_time: null,
    evaluation_start_time: null,
    evaluation_end_time: null,
    round_end_time: null,
    score: null
  };
  rounds.push(round);
  
  let updatedSession: Session | null = null;
  const session = sessions.find(s => s.session_id === sessionId);
  if (session && roundNumber > session.current_round) {
    session.current_round = roundNumber;
    updatedSession = session;
  }
  
  saveToFile();
  return { round, session: updatedSession };
};

export const getRoundsBySession = async (sessionId: string): Promise<Round[]> => {
  ensureDb();
  return rounds
    .filter(r => r.session_id === sessionId)
    .sort((a, b) => a.round_number - b.round_number);
};

export const getRound = async (roundId: string): Promise<Round | undefined> => {
  ensureDb();
  return rounds.find(r => r.id === roundId);
};

export const updateRoundStatus = async (roundId: string, status: number): Promise<void> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    round.status = status;
    saveToFile();
  }
};

export const updateRound = async (roundId: string, updates: Partial<Round>): Promise<void> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    Object.assign(round, updates);
    saveToFile();
  }
};

export const startPerformance = async (roundId: string): Promise<void> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    round.status = 1;
    round.performance_start_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveToFile();
  }
};

export const endPerformance = async (roundId: string): Promise<void> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    round.status = 2;
    round.performance_end_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveToFile();
  }
};

export const startEvaluation = async (roundId: string): Promise<void> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    round.status = 3;
    round.evaluation_start_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    round.evaluation_end_time = null;
    round.score = null;
    saveToFile();
  }
};

export const endEvaluation = async (roundId: string, score: number): Promise<void> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    round.status = 4;
    round.evaluation_end_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    round.score = score;
    saveToFile();
  }
};

export const endRound = async (roundId: string): Promise<{ round: Round; session: Session | null }> => {
  ensureDb();
  const round = rounds.find(r => r.id === roundId);
  let updatedSession: Session | null = null;
  
  if (round) {
    round.status = 5;
    round.round_end_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const session = sessions.find(s => s.session_id === round.session_id);
    if (session) {
      updatedSession = session;
    }
    
    saveToFile();
  }
  
  return { round: round!, session: updatedSession };
};

// 常规评估
export const createRegularEvaluation = async (
  sessionId: string,
  round: number,
  score: number
): Promise<RegularEvaluation> => {
  ensureDb();
  const id = uuidv4();
  const evaluatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const evaluation: RegularEvaluation = { id, session_id: sessionId, round, score, evaluated_at: evaluatedAt };
  regularEvaluations.push(evaluation);
  saveToFile();
  return evaluation;
};

export const getRegularEvaluationsBySession = async (sessionId: string): Promise<RegularEvaluation[]> => {
  ensureDb();
  return regularEvaluations
    .filter(e => e.session_id === sessionId)
    .sort((a, b) => a.round - b.round);
};

export const getAllRegularEvaluations = async (): Promise<RegularEvaluation[]> => {
  ensureDb();
  return [...regularEvaluations].sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at));
};

// 专家评估
export const createExpertEvaluation = async (
  sessionId: string,
  round: number,
  expertScore: number
): Promise<ExpertEvaluation> => {
  ensureDb();
  const id = uuidv4();
  const evaluatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const evaluation: ExpertEvaluation = { id, session_id: sessionId, round, expert_score: expertScore, evaluated_at: evaluatedAt };
  expertEvaluations.push(evaluation);
  saveToFile();
  return evaluation;
};

export const getExpertEvaluationsBySession = async (sessionId: string): Promise<ExpertEvaluation[]> => {
  ensureDb();
  return expertEvaluations
    .filter(e => e.session_id === sessionId)
    .sort((a, b) => a.round - b.round);
};

export const getAllExpertEvaluations = async (): Promise<ExpertEvaluation[]> => {
  ensureDb();
  return [...expertEvaluations].sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at));
};

// 摄像头配置
export const getCameraConfig = async (cameraId: string): Promise<CameraConfig | null> => {
  ensureDb();
  return cameraConfigs.find(c => c.camera_id === cameraId) || null;
};

export const saveCameraConfig = async (cameraId: string, rotation: number): Promise<CameraConfig> => {
  ensureDb();
  const updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const existingIndex = cameraConfigs.findIndex(c => c.camera_id === cameraId);
  
  if (existingIndex >= 0) {
    cameraConfigs[existingIndex].rotation = rotation;
    cameraConfigs[existingIndex].updated_at = updatedAt;
    saveToFile();
    return cameraConfigs[existingIndex];
  } else {
    const newConfig: CameraConfig = {
      camera_id: cameraId,
      rotation,
      updated_at: updatedAt
    };
    cameraConfigs.push(newConfig);
    saveToFile();
    return newConfig;
  }
};

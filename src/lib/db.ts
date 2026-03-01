import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

const DB_FILE = path.join(process.cwd(), 'data', 'database.sqlite');
const DB_JSON_FILE = path.join(process.cwd(), 'data', 'database.json');

// 内存数据存储
let sessions: Session[] = [];
let regularEvaluations: RegularEvaluation[] = [];
let expertEvaluations: ExpertEvaluation[] = [];
let isInitialized = false;

// 保存数据到 JSON 文件
function saveToFile() {
  const data = {
    sessions,
    regularEvaluations,
    expertEvaluations
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
      sessions = data.sessions || [];
      regularEvaluations = data.regularEvaluations || [];
      expertEvaluations = data.expertEvaluations || [];
    } catch (error) {
      console.error('加载数据失败:', error);
      sessions = [];
      regularEvaluations = [];
      expertEvaluations = [];
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

export const createSession = async (name: string): Promise<Session> => {
  ensureDb();
  const id = uuidv4();
  const sessionId = uuidv4();
  const session: Session = { id, session_id: sessionId, name };
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

export const updateSessionName = async (sessionId: string, name: string): Promise<void> => {
  ensureDb();
  const session = sessions.find(s => s.session_id === sessionId);
  if (session) {
    session.name = name;
    saveToFile();
  }
};

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

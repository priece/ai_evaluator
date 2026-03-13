'use client';

import { useState, useEffect, useRef } from 'react';
import { RoundStatus, RoundStatusLabels } from '@/types';
import { parseTime, formatTime } from '@/lib/timeUtils';

interface Session {
  id: string;
  session_id: string;
  name: string;
  created_at: string;
}

interface Round {
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
  submit: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface BusinessPanelProps {
  selectedSession: Session | null;
  currentRound: Round | null;
  highlightRound: Round | null;
  user: User;
  onSessionChange: (session: Session | null) => void;
  onRoundChange: (round: Round | null) => void;
  onRoundUpdate: (round: Round) => void;
  onPublish?: () => void;
}

export default function BusinessPanel({ 
  selectedSession, 
  currentRound,
  highlightRound,
  user,
  onSessionChange, 
  onRoundChange,
  onRoundUpdate,
  onPublish
}: BusinessPanelProps) {
  const isAdmin = user.role === 'admin';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [evaluatingRoundId, setEvaluatingRoundId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} 分 ${secs} 秒`;
  };

  const getPerformanceDuration = (round: Round): string | null => {
    if (round.status === RoundStatus.PERFORMING && round.performance_start_time) {
      const startTime = parseTime(round.performance_start_time);
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      return formatDuration(Math.max(0, elapsed));
    }
    if ((round.status === RoundStatus.PERFORMANCE_ENDED || 
         round.status === RoundStatus.EVALUATED || 
         round.status === RoundStatus.ROUND_ENDED) && 
        round.performance_start_time && round.performance_end_time) {
      const startTime = parseTime(round.performance_start_time);
      const endTime = parseTime(round.performance_end_time);
      const duration = Math.floor((endTime - startTime) / 1000);
      return formatDuration(Math.max(0, duration));
    }
    return null;
  };

  useEffect(() => {
    if (!evaluatingRoundId) return;
    
    const handleKeyDown = async (event: KeyboardEvent) => {
      const key = event.key;
      if (key >= '0' && key <= '9') {
        const k = parseInt(key);
        // 生成 0.0 到 9.9 的随机小数
        const randomDecimal = Math.round(Math.random() * 99) / 10;
        const score = k * 10 + randomDecimal;
        
        try {
          const res = await fetch('/api/rounds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submitScore', roundId: evaluatingRoundId, score }),
          });
          const data = await res.json();
          if (data.success) {
            if (selectedSession) {
              fetchRounds(selectedSession.session_id);
              fetchSessions();
              if (data.round) {
                onRoundChange(data.round);
              }
            }
          }
        } catch (error) {
          console.error('Failed to submit score:', error);
        } finally {
          setEvaluatingRoundId(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [evaluatingRoundId, selectedSession]);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchRounds(selectedSession.session_id);
    } else {
      setRounds([]);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to get session list:', error);
    }
  };

  const fetchRounds = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/rounds?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setRounds(data.rounds);
        if (highlightRound) {
          const matchedRound = data.rounds.find((r: Round) => r.id === highlightRound.id);
          if (matchedRound) {
            onRoundChange(matchedRound);
          }
        }
      }
    } catch (error) {
      console.error('Failed to get round list:', error);
    }
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      alert('请输入场次名称');
      return;
    }
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSessionName('');
        setIsModalOpen(false);
        fetchSessions();
        onSessionChange(data.session);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const createNewRound = async () => {
    if (!selectedSession) {
      alert('请先选择场次');
      return;
    }
    try {
      const maxRound = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) : 0;
      const newRoundNumber = maxRound + 1;
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create', 
          sessionId: selectedSession.session_id, 
          roundNumber: newRoundNumber 
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRounds(selectedSession.session_id);
        await fetchSessions();
        const newRound = data.round;
        onRoundUpdate(newRound);
        if (data.session) {
          onSessionChange(data.session);
        }
        onPublish?.();
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to create round:', error);
    }
  };

  const updateRoundStatus = async (roundId: string, action: string, score?: number) => {
    try {
      if (action === 'startEvaluation') {
        setEvaluatingRoundId(roundId);
        return;
      }
      
      const body: any = { action, roundId };
      if (score !== undefined) {
        body.score = score;
      }
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedSession) {
          fetchRounds(selectedSession.session_id);
          fetchSessions();
          const updatedRound = data.round;
          if (updatedRound) {
            onRoundChange(updatedRound);
          }
          if (action === 'endRound' && data.session) {
            onSessionChange(data.session);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update round status:', error);
    } finally {
      if (action === 'submitScore') {
        setEvaluatingRoundId(null);
      }
    }
  };

  const getStatusBadgeClass = (status: number) => {
    const classes: Record<number, string> = {
      [RoundStatus.NOT_STARTED]: 'bg-gray-700 text-gray-300',
      [RoundStatus.PERFORMING]: 'bg-blue-900 text-blue-300',
      [RoundStatus.PERFORMANCE_ENDED]: 'bg-yellow-900 text-yellow-300',
      [RoundStatus.EVALUATING]: 'bg-purple-900 text-purple-300',
      [RoundStatus.EVALUATED]: 'bg-green-900 text-green-300',
      [RoundStatus.ROUND_ENDED]: 'bg-red-900 text-red-300',
    };
    return classes[status] || 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 场次管理 */}
      <div className="bg-[#1a1a1a] rounded-lg shadow-md p-4 border border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-100">场次管理</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!isAdmin}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            新建场次
          </button>
        </div>

        <select
          value={selectedSession?.session_id || ''}
          onChange={(e) => {
            const session = sessions.find(s => s.session_id === e.target.value);
            onSessionChange(session || null);
          }}
          className="w-full bg-[#252525] border border-gray-600 rounded-lg px-3 py-2 text-gray-100"
        >
          <option value="">请选择场次</option>
          {sessions.map((s) => {
          return (
            <option key={s.session_id} value={s.session_id}>
              {s.name}
            </option>
          );
        })}
        </select>

        {selectedSession && (
          <div className="mt-4 p-3 bg-[#252525] rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400">
              <span className="font-medium text-gray-300">场次名称：</span>{selectedSession.name}
            </div>
            <div className="text-sm text-gray-400 mt-1 flex justify-between">
              <div>
                <span className="font-medium text-gray-300">当前演出：</span>{rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) : 0}
              </div>
              <div>
                <span className="font-medium text-gray-300">创建时间：</span>{formatTime(selectedSession.created_at)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 演出管理 */}
      <div className="bg-[#1a1a1a] rounded-lg shadow-md p-4 flex-1 flex flex-col overflow-hidden border border-gray-800">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-100">演出管理</h2>
          {selectedSession && (() => {
            const maxRoundNum = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) : 0;
            let canCreateRound = false;
            if (maxRoundNum === 0) {
              canCreateRound = true;
            } else {
              const currentRoundData = rounds.find(r => r.round_number === maxRoundNum);
              canCreateRound = currentRoundData?.status === RoundStatus.ROUND_ENDED;
            }
            return (
              <button
                onClick={createNewRound}
                disabled={!canCreateRound || !isAdmin}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                新建演出
              </button>
            );
          })()}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-auto">
          {rounds.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {selectedSession ? '暂无演出，请新建演出' : '请先选择场次'}
            </div>
          ) : (
            <div className="space-y-3">
            {rounds.map((round) => (
              <div 
                key={round.id} 
                className={`border rounded-lg p-3 cursor-pointer transition ${
                  highlightRound?.id === round.id ? 'border-blue-500 bg-blue-950' : 'border-gray-700 hover:border-gray-600 bg-[#252525]'
                }`}
                onClick={() => onRoundChange(round)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-100">第 {round.round_number} 位演员</span>
                  <div className="text-lg font-bold text-blue-400">
                    {round.status === RoundStatus.PERFORMING ? (
                      <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : round.score !== null ? (
                      `${round.score.toFixed(1)} 分`
                    ) : null}
                  </div>
                </div>

                {/* 操作按钮和状态 */}
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex flex-wrap gap-2 items-center">
                  {round.status === RoundStatus.NOT_STARTED && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'startPerformance'); }}
                      disabled={!isAdmin}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      开始演出
                    </button>
                  )}
                  {round.status === RoundStatus.PERFORMING && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'endPerformance'); }}
                      disabled={!isAdmin}
                      className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      结束演出
                    </button>
                  )}
                  {round.status === RoundStatus.PERFORMANCE_ENDED && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'startEvaluation'); }}
                      disabled={evaluatingRoundId === round.id || !isAdmin}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {evaluatingRoundId === round.id ? '评估中...' : '开始评估'}
                    </button>
                  )}
                  {round.status === RoundStatus.EVALUATING && (
                    <span className="px-3 py-1 text-xs text-purple-400 animate-pulse">
                      等待键盘输入(0-9)...
                    </span>
                  )}
                  {round.status === RoundStatus.EVALUATED && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'startEvaluation'); }}
                      disabled={evaluatingRoundId === round.id || !isAdmin}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {evaluatingRoundId === round.id ? '评估中...' : '重新评估'}
                    </button>
                  )}
                  {/* 高亮的轮次在已评估或已发布状态时显示发布按钮 */}
                  {highlightRound?.id === round.id && (round.status === RoundStatus.EVALUATED || round.status === RoundStatus.ROUND_ENDED) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'publish'); onPublish?.(); }}
                      disabled={!isAdmin}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      发布
                    </button>
                  )}
                  {/* 表演时长 */}
                  {(() => {
                    const duration = getPerformanceDuration(round);
                    if (!duration) return null;
                    const isPerforming = round.status === RoundStatus.PERFORMING;
                    const label = isPerforming ? '已表演时长' : '演出时长';
                    const color = isPerforming ? '#89c414' : '#c6771b';
                    return (
                      <span className="px-3 py-1 text-xs" style={{ color }}>
                        {label}：{duration}
                      </span>
                    );
                  })()}
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeClass(round.status)}`}>
                    {RoundStatusLabels[round.status as RoundStatus]}
                  </span>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>

      {/* 新建场次弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">新建场次</h3>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="请输入场次名称"
              className="w-full bg-[#252525] border border-gray-600 rounded-lg px-3 py-2 mb-4 text-gray-100 placeholder-gray-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={createSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { RoundStatus, RoundStatusLabels } from '@/types';

interface Session {
  id: string;
  session_id: string;
  name: string;
  current_round: number;
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
}

interface BusinessPanelProps {
  selectedSession: Session | null;
  currentRound: Round | null;
  onSessionChange: (session: Session | null) => void;
  onRoundChange: (round: Round | null) => void;
}

export default function BusinessPanel({ 
  selectedSession, 
  currentRound, 
  onSessionChange, 
  onRoundChange
}: BusinessPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [evaluatingRoundId, setEvaluatingRoundId] = useState<string | null>(null);

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
      console.error('获取场次列表失败:', error);
    }
  };

  const fetchRounds = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/rounds?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setRounds(data.rounds);
      }
    } catch (error) {
      console.error('获取轮次列表失败:', error);
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
      console.error('创建场次失败:', error);
    }
  };

  const createNewRound = async () => {
    if (!selectedSession) {
      alert('请先选择场次');
      return;
    }
    try {
      const newRoundNumber = selectedSession.current_round + 1;
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
        fetchRounds(selectedSession.session_id);
        fetchSessions();
        onRoundChange(data.round);
        if (data.session) {
          onSessionChange(data.session);
        }
      }
    } catch (error) {
      console.error('创建轮次失败:', error);
    }
  };

  const updateRoundStatus = async (roundId: string, action: string, score?: number) => {
    try {
      if (action === 'startEvaluation') {
        setEvaluatingRoundId(roundId);
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
          if (updatedRound && currentRound?.id === updatedRound.id) {
            onRoundChange(updatedRound);
          }
          if (action === 'endRound' && data.session) {
            onSessionChange(data.session);
          }
        }
      }
    } catch (error) {
      console.error('更新轮次状态失败:', error);
    } finally {
      setEvaluatingRoundId(null);
    }
  };

  const getStatusBadgeClass = (status: number) => {
    const classes: Record<number, string> = {
      [RoundStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800',
      [RoundStatus.PERFORMING]: 'bg-blue-100 text-blue-800',
      [RoundStatus.PERFORMANCE_ENDED]: 'bg-yellow-100 text-yellow-800',
      [RoundStatus.EVALUATING]: 'bg-purple-100 text-purple-800',
      [RoundStatus.EVALUATED]: 'bg-green-100 text-green-800',
      [RoundStatus.ROUND_ENDED]: 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 场次管理 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">场次管理</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            新建场次
          </button>
        </div>

        <select
          value={selectedSession?.session_id || ''}
          onChange={(e) => {
            const session = sessions.find(s => s.session_id === e.target.value);
            onSessionChange(session || null);
            onRoundChange(null);
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">请选择场次</option>
          {sessions.map((s) => (
            <option key={s.session_id} value={s.session_id}>
              {s.name} (当前轮次: {s.current_round})
            </option>
          ))}
        </select>

        {selectedSession && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <span className="font-medium">场次名称：</span>{selectedSession.name}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">当前轮次：</span>{selectedSession.current_round}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">创建时间：</span>{selectedSession.created_at}
            </div>
          </div>
        )}
      </div>

      {/* 轮次管理 */}
      <div className="bg-white rounded-lg shadow-md p-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">轮次管理</h2>
          {selectedSession && (() => {
            let canCreateRound = false;
            if (selectedSession.current_round === 0) {
              canCreateRound = true;
            } else {
              const currentRoundData = rounds.find(r => r.round_number === selectedSession.current_round);
              canCreateRound = currentRoundData?.status === RoundStatus.ROUND_ENDED;
            }
            return (
              <button
                onClick={createNewRound}
                disabled={!canCreateRound}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                新建轮次
              </button>
            );
          })()}
        </div>

        {rounds.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {selectedSession ? '暂无轮次，请创建新轮次' : '请先选择场次'}
          </div>
        ) : (
          <div className="space-y-3">
            {rounds.map((round) => (
              <div 
                key={round.id} 
                className={`border rounded-lg p-3 cursor-pointer transition ${
                  currentRound?.id === round.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onRoundChange(round)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">第 {round.round_number} 轮</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusBadgeClass(round.status)}`}>
                      {RoundStatusLabels[round.status as RoundStatus]}
                    </span>
                  </div>
                  {round.score !== null && (
                    <span className="text-lg font-bold text-blue-600">{round.score} 分</span>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {round.status === RoundStatus.NOT_STARTED && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'startPerformance'); }}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      开始演出
                    </button>
                  )}
                  {round.status === RoundStatus.PERFORMING && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'endPerformance'); }}
                      className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      结束演出
                    </button>
                  )}
                  {round.status === RoundStatus.PERFORMANCE_ENDED && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'startEvaluation'); }}
                      disabled={evaluatingRoundId === round.id}
                      className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {evaluatingRoundId === round.id ? '评估中...' : '开始评估'}
                    </button>
                  )}
                  {round.status === RoundStatus.EVALUATING && (
                    <span className="px-3 py-1 text-xs text-purple-600 animate-pulse">
                      AI 正在评估中...
                    </span>
                  )}
                  {round.status === RoundStatus.EVALUATED && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'startEvaluation'); }}
                        disabled={evaluatingRoundId === round.id}
                        className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                      >
                        {evaluatingRoundId === round.id ? '评估中...' : '重新评估'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateRoundStatus(round.id, 'endRound'); }}
                        disabled={evaluatingRoundId === round.id}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        结束本轮
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新建场次弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">新建场次</h3>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="请输入场次名称"
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={createSession}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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

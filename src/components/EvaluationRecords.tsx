'use client';

import { useState, useEffect } from 'react';
import { Session, RegularEvaluation, ExpertEvaluation } from '@/types';
import { formatTime } from '@/lib/timeUtils';

export default function EvaluationRecords() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [regularEvaluations, setRegularEvaluations] = useState<RegularEvaluation[]>([]);
  const [expertEvaluations, setExpertEvaluations] = useState<ExpertEvaluation[]>([]);

  // 获取场次列表
  useEffect(() => {
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

    fetchSessions();
  }, []);

  // 获取场次评估数据
  const fetchSessionEvaluations = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setRegularEvaluations(data.regularEvaluations || []);
        setExpertEvaluations(data.expertEvaluations || []);
      }
    } catch (error) {
      console.error('Failed to get evaluation data:', error);
    }
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = e.target.value;
    if (sessionId) {
      const session = sessions.find(s => s.session_id === sessionId);
      if (session) {
        setSelectedSession(session);
        fetchSessionEvaluations(sessionId);
      }
    } else {
      setSelectedSession(null);
      setRegularEvaluations([]);
      setExpertEvaluations([]);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">评估记录</h2>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">选择场次</label>
          <select
            onChange={handleSessionChange}
            value={selectedSession?.session_id || ''}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">请选择场次</option>
            {sessions.map((session) => (
              <option key={session.session_id} value={session.session_id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">AI 评估记录</h3>
            <div className="max-h-80 overflow-y-auto">
              {regularEvaluations.length > 0 ? (
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 border-b">轮次</th>
                      <th className="text-left py-2 border-b">评分</th>
                      <th className="text-left py-2 border-b">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularEvaluations.map((evaluation) => (
                      <tr key={evaluation.id}>
                        <td className="py-2 border-b">{evaluation.round}</td>
                        <td className="py-2 border-b">{evaluation.score}</td>
                        <td className="py-2 border-b">
                          {formatTime(evaluation.evaluated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">暂无AI 评估数据</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">专家评估记录</h3>
            <div className="max-h-80 overflow-y-auto">
              {expertEvaluations.length > 0 ? (
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 border-b">轮次</th>
                      <th className="text-left py-2 border-b">评分</th>
                      <th className="text-left py-2 border-b">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expertEvaluations.map((evaluation) => (
                      <tr key={evaluation.id}>
                        <td className="py-2 border-b">{evaluation.round}</td>
                        <td className="py-2 border-b">{evaluation.expert_score}</td>
                        <td className="py-2 border-b">
                          {formatTime(evaluation.evaluated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">暂无专家评估数据</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

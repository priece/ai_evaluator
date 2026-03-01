'use client';

import { useState } from 'react';
import RegularEvaluation from '@/components/RegularEvaluation';
import ExpertEvaluation from '@/components/ExpertEvaluation';
import EvaluationRecords from '@/components/EvaluationRecords';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('regular');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      <nav className="bg-white shadow-md w-full">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">AI 评估系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('regular')}
                className={`px-4 py-2 rounded-md ${activeTab === 'regular' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                AI评估
              </button>
              <button
                onClick={() => setActiveTab('expert')}
                className={`px-4 py-2 rounded-md ${activeTab === 'expert' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                专家评估
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-4 py-2 rounded-md ${activeTab === 'records' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                评估记录
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto py-6 px-4" style={{ width: '1600px', height: '900px' }}>
        {activeTab === 'regular' && <RegularEvaluation />}
        {activeTab === 'expert' && <ExpertEvaluation />}
        {activeTab === 'records' && <EvaluationRecords />}
      </main>
    </div>
  );
}

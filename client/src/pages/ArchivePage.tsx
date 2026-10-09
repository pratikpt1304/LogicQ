import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { DifficultyBadge } from '../components/common/Badge.js';
import { Search, CheckCircle2, ArrowRight, Code2, Filter } from 'lucide-react';
import { Difficulty } from '../types/index.js';

export const ArchivePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['problems-archive', selectedDifficulty, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedDifficulty !== 'ALL') params.append('difficulty', selectedDifficulty);
      if (search) params.append('search', search);
      return api.get(`/problems?${params.toString()}`);
    },
  });

  const problems = data?.data?.problems || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Code2 className="w-7 h-7 text-cyan-400" />
            <span>Problem Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Explore {problems.length} competitive C problems across algorithms and low-level memory.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems by title, topic, or tag..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Difficulty Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                selectedDifficulty === diff
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white bg-dark-900 border border-white/[0.05]'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Grid / Table */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs font-mono text-cyan-400">
            Loading problem catalog...
          </div>
        ) : problems.length === 0 ? (
          <div className="py-20 text-center text-xs font-mono text-slate-500">
            No problems match your current search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Title</th>
                  <th className="px-6 py-3.5">Difficulty</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Points</th>
                  <th className="px-6 py-3.5">Submissions</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {problems.map((prob: any) => (
                  <tr key={prob.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      {prob.isSolved ? (
                        <span title="Solved">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </span>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/challenge/${prob.slug}`}
                        className="font-bold text-white text-sm hover:text-cyan-400 transition-colors block"
                      >
                        {prob.title}
                      </Link>
                      {prob.tags && prob.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-1">
                          {prob.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] text-slate-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <DifficultyBadge difficulty={prob.difficulty as Difficulty} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-slate-300">{prob.category}</td>
                    <td className="px-6 py-4 font-bold text-cyan-400">+{prob.basePoints} PTS</td>
                    <td className="px-6 py-4 text-slate-400">{prob.totalSubmissions || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/challenge/${prob.slug}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold text-slate-200 bg-dark-800 hover:bg-cyan-500/10 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/30 transition-all"
                      >
                        <span>Solve</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

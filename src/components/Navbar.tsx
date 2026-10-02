import React from 'react';
import { Radio, ShieldCheck, Zap, Download, RefreshCw, Cpu, Layers } from 'lucide-react';
import { ScheduleResult, AlgorithmType } from '../types/tdma';

interface NavbarProps {
  schedule: ScheduleResult;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetToOfficial: () => void;
  radioRange: number;
  setRadioRange: (r: number) => void;
  algorithm: AlgorithmType;
  setAlgorithm: (a: AlgorithmType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  schedule,
  activeTab,
  setActiveTab,
  onResetToOfficial,
  radioRange,
  setRadioRange,
  algorithm,
  setAlgorithm,
}) => {
  const tabs = [
    { id: 'topology', label: 'Topology & Conflict Graph' },
    { id: 'simulator', label: 'Live TDMA Simulator' },
    { id: 'matrix', label: 'Schedule Matrix & Validation' },
    { id: 'coordinates', label: 'Node Coordinates & Presets' },
    { id: 'report', label: 'Diagnostics & Report' },
    { id: 'emane', label: 'EMANE Bridge (Part 2)' },
    { id: 'slides', label: 'Presentation Deck (20 Slides)' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Primary Top Bar Contract: Brand - Nav Links - Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">
                Vaan Megam Networks
              </span>
              <span className="text-xs text-slate-400 block leading-tight">
                TDMA Schedule Planner & Optimizer
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Key Telemetry & Quick Action */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick telemetry indicators */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400">Nodes:</span>
              <span className="font-semibold text-white tabular-nums">{schedule.nodes.length}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Frame:</span>
              <span className="font-semibold text-cyan-300 tabular-nums">{schedule.slotCount} slots</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Range:</span>
              <span className="font-semibold text-emerald-300 tabular-nums">{radioRange}m</span>
            </div>

            <button
              onClick={onResetToOfficial}
              title="Reset to Official 16-Node Assignment Grid"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Assignment</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Tab Scroll Bar */}
        <div className="flex xl:hidden overflow-x-auto gap-1 py-2 border-t border-slate-800/80 -mx-4 px-4 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { Copy, Download, FileText, Code2, Terminal, CheckCircle2 } from 'lucide-react';
import { ScheduleResult } from '../types/tdma';
import { generateTextReport, generateScheduleJson, generateScheduleCsv } from '../engine/reportGenerator';

interface ReportViewProps {
  schedule: ScheduleResult;
}

export const ReportView: React.FC<ReportViewProps> = ({ schedule }) => {
  const [activeFormat, setActiveFormat] = useState<'text' | 'json' | 'cli'>('text');
  const [copied, setCopied] = useState<boolean>(false);

  const textReport = React.useMemo(() => generateTextReport(schedule), [schedule]);
  const jsonReport = React.useMemo(() => generateScheduleJson(schedule), [schedule]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Diagnostics & Optimization Report Output
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Strictly formatted according to Vaan Megam Networks specifications (Section 25 human-readable & Section 40 JSON).
          </p>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveFormat('text')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeFormat === 'text'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Report.txt (Sec 25)
            </button>
            <button
              onClick={() => setActiveFormat('json')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeFormat === 'json'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Schedule.json (Sec 40)
            </button>
            <button
              onClick={() => setActiveFormat('cli')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeFormat === 'cli'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python CLI Specs
            </button>
          </div>

          <button
            onClick={() => handleCopy(activeFormat === 'text' ? textReport : jsonReport)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>

          <button
            onClick={() => {
              if (activeFormat === 'text') {
                handleDownload(`tdma_report_${schedule.nodes.length}nodes.txt`, textReport, 'text/plain;charset=utf-8');
              } else {
                handleDownload(`tdma_schedule_${schedule.nodes.length}nodes.json`, jsonReport, 'application/json;charset=utf-8');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Main Report Body Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-inner relative overflow-hidden">
        {activeFormat === 'text' && (
          <pre className="font-mono text-xs text-slate-300 whitespace-pre overflow-x-auto leading-relaxed selection:bg-cyan-500/30">
            {textReport}
          </pre>
        )}

        {activeFormat === 'json' && (
          <pre className="font-mono text-xs text-cyan-300 whitespace-pre overflow-x-auto leading-relaxed selection:bg-cyan-500/30">
            {jsonReport}
          </pre>
        )}

        {activeFormat === 'cli' && (
          <div className="space-y-6 text-xs text-slate-300 font-mono">
            <div>
              <div className="text-cyan-400 font-bold mb-2"># Python CLI Execution Equivalents:</div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <div>
                  <span className="text-slate-500"># Run standard 16-node assignment:</span>
                  <div className="text-white mt-0.5">python main.py --input examples/nodes.json --range {schedule.radioRangeMeters} --algorithm {schedule.algorithmUsed}</div>
                </div>
                <div>
                  <span className="text-slate-500"># Output structured JSON schedule:</span>
                  <div className="text-white mt-0.5">python main.py --input examples/nodes.json --output-json output/schedule.json</div>
                </div>
                <div>
                  <span className="text-slate-500"># Run with local search optimization and validation report:</span>
                  <div className="text-white mt-0.5">python main.py --input examples/nodes.json --range 500 --algorithm dsatur --output output/report.txt</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-emerald-400 font-bold mb-2"># Algorithmic Complexity Breakdown:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-white font-bold">1. Euclidean Distance & Topology:</div>
                  <div className="text-slate-400">All unique node pairs: O(N²) distance comparisons. N={schedule.nodes.length} &rarr; {(schedule.nodes.length * (schedule.nodes.length - 1)) / 2} checks.</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-white font-bold">2. Conflict Graph (Distance-2):</div>
                  <div className="text-slate-400">Common neighbor traversal: O(N · d²) where d is max node degree. Fast bounded matrix multiplication.</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-white font-bold">3. DSATUR Graph Coloring:</div>
                  <div className="text-slate-400">Priority saturation updates: O(V² + E_conflict). For N={schedule.nodes.length}, execution settles in &lt;1ms.</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-white font-bold">4. Independent Validator:</div>
                  <div className="text-slate-400">Explicit verification of every conflict edge (u, v): O(E_conflict). Guarantees zero collisions.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

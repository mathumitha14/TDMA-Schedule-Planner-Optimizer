import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, Copy, Download, Layers, ArrowRight } from 'lucide-react';
import { ScheduleResult } from '../types/tdma';
import { generateScheduleCsv } from '../engine/reportGenerator';

interface ScheduleMatrixViewProps {
  schedule: ScheduleResult;
}

export const ScheduleMatrixView: React.FC<ScheduleMatrixViewProps> = ({ schedule }) => {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  const { validation, scheduleMatrix, nodes, slotCount, nodeToSlot, slotColors } = schedule;

  const handleCopyCsv = () => {
    const csv = generateScheduleCsv(schedule);
    navigator.clipboard.writeText(csv);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csv = generateScheduleCsv(schedule);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tdma_schedule_matrix_${nodes.length}nodes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Validation Engine Status Card */}
      <div className={`p-6 rounded-xl border shadow-lg ${
        validation.isValid
          ? 'bg-slate-900 border-emerald-500/40'
          : 'bg-rose-950/30 border-rose-500/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              validation.isValid
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}>
              {validation.isValid ? (
                <ShieldCheck className="w-7 h-7" />
              ) : (
                <AlertOctagon className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Independent Collision Validation Engine
                </h3>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider ${
                  validation.isValid
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {validation.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every communication link and two-hop hidden-terminal conflict relationship was independently audited against the assigned time slots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCsv ? 'Copied CSV!' : 'Copy CSV'}</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">Total Nodes</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{validation.totalNodes}</div>
            <div className="text-[10px] text-slate-500">Wireless radios</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">1-Hop Comm Edges</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{validation.communicationEdgesCount}</div>
            <div className="text-[10px] text-slate-500">&le; {schedule.radioRangeMeters}m links</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">Distance-2 Conflicts</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{validation.conflictEdgesCount}</div>
            <div className="text-[10px] text-slate-500">1-hop + 2-hop edges</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">1-Hop Violations</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${validation.oneHopViolations === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {validation.oneHopViolations}
            </div>
            <div className="text-[10px] text-slate-500">Direct clashes</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">2-Hop Violations</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${validation.twoHopViolations === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {validation.twoHopViolations}
            </div>
            <div className="text-[10px] text-slate-500">Hidden terminals</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">Matrix Integrity</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {validation.matrixValid ? '100%' : 'FAIL'}
            </div>
            <div className="text-[10px] text-slate-500">1 active slot/node</div>
          </div>
        </div>
      </div>

      {/* Structural TDMA Schedule Matrix (Slot x Node Boolean Matrix) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Structural TDMA Schedule Matrix (Slot &times; Node Boolean Matrix)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Each row represents a TDMA time slot; each column represents a radio node. Value 1 indicates transmission permission.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Matrix Dimensions: <span className="text-white font-bold">{slotCount} &times; {nodes.length}</span>
          </div>
        </div>

        {/* Interactive Matrix Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs font-mono border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80">
                <th className="p-3 text-left text-slate-400 font-semibold sticky left-0 bg-slate-950 z-20 w-28">
                  Slot \ Node
                </th>
                {nodes.map((nodeName, nIdx) => {
                  const shortName = nodeName.replace('Node_', 'N');
                  const isHoveredCol = hoveredNodeIndex === nIdx;
                  return (
                    <th
                      key={nodeName}
                      onMouseEnter={() => setHoveredNodeIndex(nIdx)}
                      onMouseLeave={() => setHoveredNodeIndex(null)}
                      className={`p-2 text-center transition-colors cursor-pointer ${
                        isHoveredCol ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300'
                      }`}
                      title={`${nodeName} (Assigned Slot ${nodeToSlot[nodeName]})`}
                    >
                      {shortName}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: slotCount }, (_, s) => {
                const isHoveredRow = hoveredSlot === s;
                const slotColor = slotColors[s % slotColors.length];
                const activeRadiosInSlot = schedule.slotToNodes[s] || [];

                return (
                  <tr
                    key={s}
                    onMouseEnter={() => setHoveredSlot(s)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={`border-b border-slate-800/60 transition-colors ${
                      isHoveredRow ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Slot Header Cell */}
                    <td className="p-3 font-bold text-slate-200 sticky left-0 bg-slate-900 z-10 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: slotColor }}
                        />
                        <span>Slot {String(s).padStart(2, '0')}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({activeRadiosInSlot.length} TX)
                        </span>
                      </div>
                    </td>

                    {/* Node Cells: 1 or 0 */}
                    {nodes.map((nodeName, nIdx) => {
                      const val = scheduleMatrix[s]?.[nIdx] ?? 0;
                      const isCellActive = val === 1;
                      const isHoveredCol = hoveredNodeIndex === nIdx;

                      return (
                        <td
                          key={`${s}-${nodeName}`}
                          className={`p-2 text-center transition-all ${
                            isCellActive
                              ? 'font-bold'
                              : 'text-slate-600'
                          } ${isHoveredCol ? 'bg-cyan-500/10' : ''}`}
                        >
                          {isCellActive ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded font-bold shadow-sm"
                              style={{
                                backgroundColor: slotColor,
                                color: '#0f172a',
                              }}
                            >
                              1
                            </span>
                          ) : (
                            <span className="text-slate-700">0</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node to Slot Mapping Breakdown Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h4 className="text-sm font-semibold text-white flex items-center justify-between border-b border-slate-800 pb-3">
          <span>Node &rarr; Slot Assignments</span>
          <span className="text-xs text-slate-400 font-mono">
            Spatial Efficiency: {schedule.spatialReuseRatio} radios/slot
          </span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {nodes.map((nodeName) => {
            const slot = nodeToSlot[nodeName] ?? 0;
            const slotColor = slotColors[slot % slotColors.length];
            const [x, y] = schedule.nodeCoordinates[nodeName];

            return (
              <div
                key={nodeName}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
              >
                <div className="font-mono font-bold text-white text-xs">{nodeName}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">({x}, {y})</div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                    style={{
                      backgroundColor: `${slotColor}25`,
                      color: slotColor,
                      border: `1px solid ${slotColor}60`
                    }}
                  >
                    Slot {slot}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

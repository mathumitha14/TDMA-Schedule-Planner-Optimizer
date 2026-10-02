import React, { useState } from 'react';
import { Plus, Trash2, Sliders, CheckCircle2, AlertTriangle, FileCode, Sparkles, RefreshCw, Copy } from 'lucide-react';
import { NodeMap, AlgorithmType, TopologyPreset } from '../types/tdma';
import { TOPOLOGY_PRESETS, generateRandomTopology } from '../data/presets';
import { validateNodeCoordinates } from '../engine/tdmaEngine';

interface CoordinateEditorProps {
  nodes: NodeMap;
  onUpdateNodes: (newNodes: NodeMap) => void;
  radioRange: number;
  setRadioRange: (r: number) => void;
  algorithm: AlgorithmType;
  setAlgorithm: (a: AlgorithmType) => void;
  localSearch: boolean;
  setLocalSearch: (ls: boolean) => void;
}

export const CoordinateEditor: React.FC<CoordinateEditorProps> = ({
  nodes,
  onUpdateNodes,
  radioRange,
  setRadioRange,
  algorithm,
  setAlgorithm,
  localSearch,
  setLocalSearch,
}) => {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(nodes, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Sync json input whenever external nodes change
  React.useEffect(() => {
    setJsonInput(JSON.stringify(nodes, null, 2));
  }, [nodes]);

  const handleApplyPreset = (preset: TopologyPreset) => {
    onUpdateNodes(preset.nodes);
    setRadioRange(preset.recommendedRange);
  };

  const handleGenerateRandom = (count: number = 16) => {
    const seed = Math.floor(Math.random() * 10000);
    const randNodes = generateRandomTopology(count, 900, 900, seed);
    onUpdateNodes(randNodes);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const validation = validateNodeCoordinates(parsed);
      if (!validation.isValid || !validation.parsed) {
        setJsonError(validation.error || 'Invalid node format.');
        setJsonSuccess(false);
        return;
      }
      setJsonError(null);
      setJsonSuccess(true);
      onUpdateNodes(validation.parsed);
      setTimeout(() => setJsonSuccess(false), 2500);
    } catch (e) {
      setJsonError(`JSON Syntax Error: ${(e as Error).message}`);
      setJsonSuccess(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonInput);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCoordinateChange = (name: string, axis: 0 | 1, value: number) => {
    const current = nodes[name];
    if (!current) return;
    const updated: [number, number] = axis === 0 ? [value, current[1]] : [current[0], value];
    onUpdateNodes({
      ...nodes,
      [name]: updated,
    });
  };

  const handleDeleteNode = (name: string) => {
    if (Object.keys(nodes).length <= 2) {
      return;
    }
    const newNodes = { ...nodes };
    delete newNodes[name];
    onUpdateNodes(newNodes);
  };

  const handleAddNode = () => {
    const count = Object.keys(nodes).length + 1;
    const newName = `Node_${String(count).padStart(2, '0')}`;
    const x = Math.round(Math.random() * 600 + 100);
    const y = Math.round(Math.random() * 600 + 100);
    onUpdateNodes({
      ...nodes,
      [newName]: [x, y],
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration & Parameter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Protocol Parameters & Coloring Algorithm
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Radio Transmission Range Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Radio Transmission Range:</span>
              <span className="font-mono text-cyan-400 font-bold tabular-nums text-sm">
                {radioRange.toFixed(1)} m
              </span>
            </div>
            <input
              type="range"
              min="150"
              max="1200"
              step="25"
              value={radioRange}
              onChange={(e) => setRadioRange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>150m (Dense)</span>
              <span>500m (Standard Spec)</span>
              <span>1200m (Broad)</span>
            </div>
          </div>

          {/* Graph Coloring Algorithm Selector */}
          <div className="space-y-2">
            <div className="text-xs text-slate-300 font-medium">Coloring Algorithm:</div>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs font-mono focus:border-cyan-500 focus:outline-none"
            >
              <option value="dsatur">DSATUR (Degree of Saturation - Recommended)</option>
              <option value="largest_first">Largest-First (Welsh-Powell Degree Order)</option>
              <option value="greedy">Greedy Deterministic (Alphabetical Sequence)</option>
            </select>
            <p className="text-[10px] text-slate-500">
              DSATUR selects vertices with maximum colored neighbors to minimize chromatic number.
            </p>
          </div>

          {/* Local Search / Iterative Recoloring */}
          <div className="space-y-2">
            <div className="text-xs text-slate-300 font-medium">Post-Coloring Optimization:</div>
            <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={localSearch}
                onChange={(e) => setLocalSearch(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
              />
              <span>Iterative Local Search Recoloring</span>
            </label>
            <p className="text-[10px] text-slate-500">
              Scans all radios to reassign to earlier vacant time slots, compacting total frame length.
            </p>
          </div>
        </div>
      </div>

      {/* Topology Presets Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Topology Presets & Assignment Scenarios
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly load predefined benchmark architectures or generate a random distribution.
            </p>
          </div>
          <button
            onClick={() => handleGenerateRandom(16)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Random 16</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOPOLOGY_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-white font-mono">{preset.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400">
                  Range: {preset.recommendedRange}m
                </span>
                <button
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 hover:bg-cyan-600 rounded transition-colors"
                >
                  Load Topology
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Columns: Coordinate Table & JSON Raw Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Interactive Coordinate Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Radio Node Coordinates</h4>
              <p className="text-xs text-slate-400">Currently active: {Object.keys(nodes).length} radios</p>
            </div>
            <button
              onClick={handleAddNode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {Object.entries(nodes).map(([name, [x, y]]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 p-2 bg-slate-950 border border-slate-800/80 rounded-lg text-xs font-mono"
              >
                <span className="font-bold text-slate-200 w-24 shrink-0">{name}</span>

                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px]">X:</span>
                    <input
                      type="number"
                      value={x}
                      onChange={(e) => handleCoordinateChange(name, 0, parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent text-white font-mono text-xs focus:outline-none text-right"
                    />
                    <span className="text-slate-600 text-[10px]">m</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px]">Y:</span>
                    <input
                      type="number"
                      value={y}
                      onChange={(e) => handleCoordinateChange(name, 1, parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent text-white font-mono text-xs focus:outline-none text-right"
                    />
                    <span className="text-slate-600 text-[10px]">m</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteNode(name)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-950/30 transition-colors"
                  title="Remove Radio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Raw JSON Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">JSON Coordinate Spec</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleApplyJson}
                  className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors"
                >
                  Apply JSON
                </button>
              </div>
            </div>

            {jsonError && (
              <div className="p-2.5 mb-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{jsonError}</span>
              </div>
            )}

            {jsonSuccess && (
              <div className="p-2.5 mb-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>JSON coordinates parsed & validated successfully!</span>
              </div>
            )}

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-80 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none resize-none leading-relaxed"
              placeholder='{\n  "Node_01": [0.0, 0.0],\n  "Node_02": [300.0, 0.0]\n}'
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Accepts JSON mapping each unique node name to a numeric 2-element array <code className="text-cyan-400 font-mono">[x, y]</code> in meters.
          </p>
        </div>
      </div>
    </div>
  );
};

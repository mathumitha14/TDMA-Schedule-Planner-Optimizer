import React, { useState, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Radio,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  Move,
  Check,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { ScheduleResult, NodeInfo, TopologyPreset } from '../types/tdma';
import { extractNodeDetails } from '../engine/tdmaEngine';
import { TOPOLOGY_PRESETS } from '../data/presets';

interface NetworkCanvasProps {
  schedule: ScheduleResult;
  onUpdateNodeCoordinates: (nodeName: string, newCoords: [number, number]) => void;
  selectedNode: string | null;
  setSelectedNode: (node: string | null) => void;
  activePresetId?: string;
  onSelectPreset?: (preset: TopologyPreset) => void;
  onAddNode?: (coords?: [number, number], customName?: string) => void;
  onRemoveNode?: (nodeName: string) => void;
}

export type ViewMode = 'communication' | 'conflict' | 'combined';

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  schedule,
  onUpdateNodeCoordinates,
  selectedNode,
  setSelectedNode,
  activePresetId,
  onSelectPreset,
  onAddNode,
  onRemoveNode,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('communication');
  const [showRangeCircles, setShowRangeCircles] = useState<boolean>(true);
  const [showDistances, setShowDistances] = useState<boolean>(true);
  const [showSlotColors, setShowSlotColors] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Add node modal state
  const [isAddNodeOpen, setIsAddNodeOpen] = useState<boolean>(false);
  const [newNodeName, setNewNodeName] = useState<string>('');
  const [newNodeX, setNewNodeX] = useState<number>(500);
  const [newNodeY, setNewNodeY] = useState<number>(500);

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Compute bounding box of nodes
  const { minX, maxX, minY, maxY, width, height } = useMemo(() => {
    const coords = Object.values(schedule.nodeCoordinates);
    if (coords.length === 0) return { minX: 0, maxX: 900, minY: 0, maxY: 900, width: 900, height: 900 };
    let mx = coords[0][0], Mx = coords[0][0], my = coords[0][1], My = coords[0][1];
    for (const [x, y] of coords) {
      if (x < mx) mx = x;
      if (x > Mx) Mx = x;
      if (y < my) my = y;
      if (y > My) My = y;
    }
    const pad = 150;
    const w = Math.max(Mx - mx + pad * 2, 800);
    const h = Math.max(My - my + pad * 2, 700);
    return { minX: mx - pad, maxX: Mx + pad, minY: my - pad, maxY: My + pad, width: w, height: h };
  }, [schedule.nodeCoordinates]);

  // Selected node detailed info
  const selectedInfo: NodeInfo | null = useMemo(() => {
    if (!selectedNode) return null;
    return extractNodeDetails(selectedNode, schedule);
  }, [selectedNode, schedule]);

  // Mouse event coordinates mapped to SVG world coordinates
  const getSvgCoordinates = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // ViewBox mapping
    const viewBoxX = minX + (clientX / rect.width) * width;
    const viewBoxY = minY + (clientY / rect.height) * height;

    // Account for zoom and pan
    const worldX = (viewBoxX - (minX + width / 2) - pan.x) / zoom + (minX + width / 2);
    const worldY = (viewBoxY - (minY + height / 2) - pan.y) / zoom + (minY + height / 2);

    return { x: Math.round(worldX), y: Math.round(worldY) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingNode) return;
    if (e.button === 0 && (e.target as Element).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNode) {
      const { x, y } = getSvgCoordinates(e);
      onUpdateNodeCoordinates(draggingNode, [x, y]);
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
    setIsPanning(false);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.4), 2.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8.5rem)] min-h-[620px]">
      
      {/* Main Canvas Viewport */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative shadow-lg">
        
        {/* Canvas Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800 z-10">
          
          {/* View Mode Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('communication')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                viewMode === 'communication'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1-Hop Topology ({schedule.communicationEdges.length} Links)
            </button>
            <button
              onClick={() => setViewMode('conflict')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                viewMode === 'conflict'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Distance-2 Conflict ({schedule.conflictEdges.length} Constraints)
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                viewMode === 'combined'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual Overlay
            </button>
          </div>

          {/* Visualization Toggles */}
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-700/60 select-none">
              <input
                type="checkbox"
                checked={showRangeCircles}
                onChange={(e) => setShowRangeCircles(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>{schedule.radioRangeMeters}m Range Circles</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-700/60 select-none">
              <input
                type="checkbox"
                checked={showDistances}
                onChange={(e) => setShowDistances(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Distances</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-700/60 select-none">
              <input
                type="checkbox"
                checked={showSlotColors}
                onChange={(e) => setShowSlotColors(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Slot Colors</span>
            </label>
          </div>

          {/* Add Radio & Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAddNodeOpen(true);
                setNewNodeName(`Node_${String(schedule.nodes.length + 1).padStart(2, '0')}`);
                setNewNodeX(Math.round(minX + width / 2));
                setNewNodeY(Math.round(minY + height / 2));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
              title="Add a new wireless radio to the network"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Radio</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => handleZoom(0.15)}
                title="Zoom In"
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-0.15)}
                title="Zoom Out"
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                title="Reset Zoom & Pan"
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Floating Add Radio Dialog Modal */}
        {isAddNodeOpen && (
          <div className="absolute top-16 left-4 z-30 p-4 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-2xl w-80 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                Add Radio to Network
              </span>
              <button
                onClick={() => setIsAddNodeOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Radio Identifier:</label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="e.g. Node_17"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">X Position (m):</label>
                  <input
                    type="number"
                    value={newNodeX}
                    onChange={(e) => setNewNodeX(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Y Position (m):</label>
                  <input
                    type="number"
                    value={newNodeY}
                    onChange={(e) => setNewNodeY(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onAddNode?.([newNodeX, newNodeY], newNodeName);
                  setIsAddNodeOpen(false);
                }}
                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 font-bold text-white rounded transition-colors text-center shadow"
              >
                Add Radio
              </button>
              <button
                onClick={() => setIsAddNodeOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Tip: You can also double-click anywhere on the map to drop a radio instantly!
            </p>
          </div>
        )}

        {/* Interactive SVG Canvas */}
        <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden">
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox={`${minX} ${minY} ${width} ${height}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={(e) => {
              const targetTag = (e.target as Element).tagName.toLowerCase();
              if (targetTag === 'circle' || targetTag === 'text') return;
              const { x, y } = getSvgCoordinates(e);
              onAddNode?.([x, y]);
            }}
          >
            <defs>
              {/* Radio Range Pulse Marker */}
              <radialGradient id="rangeGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
                <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.25" />
              </radialGradient>
            </defs>

            {/* Transform Container with Zoom and Pan */}
            <g
              transform={`translate(${minX + width / 2 + pan.x}, ${minY + height / 2 + pan.y}) scale(${zoom}) translate(${-(minX + width / 2)}, ${-(minY + height / 2)})`}
            >
              
              {/* Layer 0: Radio Transmission Circles (500m radius) */}
              {showRangeCircles &&
                Object.entries(schedule.nodeCoordinates).map(([nodeName, [x, y]]) => {
                  const isSelected = selectedNode === nodeName;
                  return (
                    <circle
                      key={`range-${nodeName}`}
                      cx={x}
                      cy={y}
                      r={schedule.radioRangeMeters}
                      fill="url(#rangeGradient)"
                      stroke={isSelected ? '#06b6d4' : '#0891b2'}
                      strokeWidth={isSelected ? 1.5 : 0.8}
                      strokeDasharray={isSelected ? 'none' : '4 4'}
                      opacity={isSelected ? 0.8 : 0.35}
                      pointerEvents="none"
                    />
                  );
                })}

              {/* Layer 1: Edges */}
              {/* Mode A / Combined: 1-Hop Communication Edges */}
              {(viewMode === 'communication' || viewMode === 'combined') &&
                schedule.communicationEdges.map((edge) => {
                  const [x1, y1] = schedule.nodeCoordinates[edge.u];
                  const [x2, y2] = schedule.nodeCoordinates[edge.v];
                  const isHighlighted = selectedNode === edge.u || selectedNode === edge.v;

                  return (
                    <g key={`comm-${edge.u}-${edge.v}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isHighlighted ? '#22d3ee' : '#0891b2'}
                        strokeWidth={isHighlighted ? 2.5 : 1.4}
                        strokeOpacity={isHighlighted ? 0.95 : 0.6}
                      />
                      {showDistances && (
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - 4}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="10"
                          fontFamily="monospace"
                          className="select-none pointer-events-none"
                          filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
                        >
                          {edge.distance}m
                        </text>
                      )}
                    </g>
                  );
                })}

              {/* Mode B / Combined: 2-Hop Conflict Edges */}
              {(viewMode === 'conflict' || viewMode === 'combined') &&
                schedule.conflictEdges
                  .filter((e) => e.type === '2-hop')
                  .map((edge) => {
                    const [x1, y1] = schedule.nodeCoordinates[edge.u];
                    const [x2, y2] = schedule.nodeCoordinates[edge.v];
                    const isHighlighted = selectedNode === edge.u || selectedNode === edge.v;

                    return (
                      <line
                        key={`conflict-2hop-${edge.u}-${edge.v}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isHighlighted ? '#fbbf24' : '#d97706'}
                        strokeWidth={isHighlighted ? 2.2 : 1}
                        strokeDasharray="5 4"
                        strokeOpacity={isHighlighted ? 0.9 : 0.4}
                      />
                    );
                  })}

              {/* Layer 2: Nodes */}
              {Object.entries(schedule.nodeCoordinates).map(([nodeName, [x, y]]) => {
                const slot = schedule.nodeToSlot[nodeName] ?? 0;
                const slotColor = schedule.slotColors[slot % schedule.slotColors.length];
                const isSelected = selectedNode === nodeName;
                const isOneHop = selectedInfo?.oneHopNeighbors.includes(nodeName);
                const isTwoHop = selectedInfo?.twoHopNeighbors.includes(nodeName);
                const isSpatialPartner = selectedInfo?.spatialPartners.includes(nodeName);

                let ringStroke = 'transparent';
                let ringWidth = 0;
                if (isSelected) {
                  ringStroke = '#38bdf8';
                  ringWidth = 4;
                } else if (isOneHop) {
                  ringStroke = '#06b6d4'; // Cyan for 1-hop
                  ringWidth = 2.5;
                } else if (isTwoHop) {
                  ringStroke = '#f59e0b'; // Amber for 2-hop conflict
                  ringWidth = 2.5;
                } else if (isSpatialPartner) {
                  ringStroke = '#10b981'; // Green for safe co-transmitter!
                  ringWidth = 2.5;
                }

                return (
                  <g
                    key={`node-${nodeName}`}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(selectedNode === nodeName ? null : nodeName);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingNode(nodeName);
                      setSelectedNode(nodeName);
                    }}
                  >
                    {/* Highlight Ring */}
                    {ringWidth > 0 && (
                      <circle
                        r={24}
                        fill="none"
                        stroke={ringStroke}
                        strokeWidth={ringWidth}
                        strokeDasharray={isTwoHop ? '3 3' : 'none'}
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Core Body */}
                    <circle
                      r={18}
                      fill={showSlotColors ? slotColor : '#1e293b'}
                      stroke={isSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth={2}
                      className="shadow-md"
                    />

                    {/* Slot Badge inside Node */}
                    <text
                      y={-1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="select-none pointer-events-none drop-shadow"
                    >
                      S{slot}
                    </text>

                    {/* Node Label Below */}
                    <text
                      y={30}
                      textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                      fontSize="11"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      className="select-none pointer-events-none"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.9))"
                    >
                      {nodeName}
                    </text>

                    {/* Quick Canvas Delete Badge for Selected Node */}
                    {isSelected && (
                      <g
                        transform="translate(14, -14)"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveNode?.(nodeName);
                        }}
                      >
                        <circle r={10} fill="#e11d48" stroke="#0f172a" strokeWidth={1.5} />
                        <line x1="-3" y1="-3" x2="3" y2="3" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" />
                        <line x1="3" y1="-3" x2="-3" y2="3" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Canvas Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5 shadow-md pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-cyan-400"></span>
              <span>1-Hop Communication (Direct)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 border-b border-amber-400 border-dashed"></span>
              <span>2-Hop Conflict (Hidden Terminal)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Spatial Reuse Peer (Same Slot)</span>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              Double-click canvas to add radio · Drag to move · Click to inspect or remove
            </div>
          </div>
        </div>
      </div>

      {/* Side Inspector & Presets Panel */}
      <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          
          {/* PRESET TOPOLOGIES (Exact match to specification) */}
          <div className="border-b border-slate-800 pb-3">
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              PRESET TOPOLOGIES
            </div>
            <div className="space-y-1">
              {TOPOLOGY_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset?.(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-slate-700/80 shadow-sm'
                        : 'hover:bg-slate-800/40 border-transparent hover:border-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5" title={preset.description}>
                        {preset.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node Inspector Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Node Inspector</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedNode && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveNode?.(selectedNode);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 rounded transition-colors cursor-pointer"
                    title={`Delete ${selectedNode}`}
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {selectedInfo ? (
            <div className="space-y-4 text-xs">
              {/* Header Box */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-white font-mono">{selectedInfo.name}</span>
                  <span
                    className="px-2 py-0.5 rounded font-mono font-bold text-xs"
                    style={{
                      backgroundColor: `${schedule.slotColors[selectedInfo.assignedSlot % schedule.slotColors.length]}22`,
                      color: schedule.slotColors[selectedInfo.assignedSlot % schedule.slotColors.length],
                      border: `1px solid ${schedule.slotColors[selectedInfo.assignedSlot % schedule.slotColors.length]}55`
                    }}
                  >
                    Slot {selectedInfo.assignedSlot}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono pt-1 text-[11px]">
                  <div>X: <span className="text-slate-200">{selectedInfo.x.toFixed(1)}m</span></div>
                  <div>Y: <span className="text-slate-200">{selectedInfo.y.toFixed(1)}m</span></div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveNode?.(selectedInfo.name);
                  }}
                  className="w-full mt-1.5 py-1 px-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-200 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Remove {selectedInfo.name}</span>
                </button>
              </div>

              {/* Degrees Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">1-Hop Neighbors</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">{selectedInfo.degreeComm}</div>
                  <div className="text-[10px] text-slate-500">Direct radios</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Total Conflicts</div>
                  <div className="text-lg font-bold font-mono text-amber-400">{selectedInfo.degreeConflict}</div>
                  <div className="text-[10px] text-slate-500">1-hop + 2-hop</div>
                </div>
              </div>

              {/* 1-Hop Neighbor List */}
              <div>
                <span className="text-slate-400 font-medium block mb-1">
                  1-Hop Neighbors ({selectedInfo.oneHopNeighbors.length}):
                </span>
                {selectedInfo.oneHopNeighbors.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {selectedInfo.oneHopNeighbors.map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedNode(n)}
                        className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/60 hover:border-cyan-500 text-cyan-300 rounded font-mono text-[11px]"
                      >
                        {n} (S{schedule.nodeToSlot[n]})
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No direct neighbors within {schedule.radioRangeMeters}m</span>
                )}
              </div>

              {/* 2-Hop Conflict Partners */}
              <div>
                <span className="text-slate-400 font-medium block mb-1">
                  2-Hop Hidden Terminals ({selectedInfo.twoHopNeighbors.length}):
                </span>
                {selectedInfo.twoHopNeighbors.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {selectedInfo.twoHopNeighbors.map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedNode(n)}
                        className="px-2 py-0.5 bg-amber-950/60 border border-amber-800/60 hover:border-amber-500 text-amber-300 rounded font-mono text-[11px]"
                      >
                        {n} (S{schedule.nodeToSlot[n]})
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No two-hop interference conflicts</span>
                )}
              </div>

              {/* Spatial Reuse Peers */}
              <div>
                <span className="text-slate-400 font-medium block mb-1">
                  Spatial Reuse Co-Transmitters ({selectedInfo.spatialPartners.length}):
                </span>
                {selectedInfo.spatialPartners.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {selectedInfo.spatialPartners.map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedNode(n)}
                        className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/60 hover:border-emerald-500 text-emerald-300 rounded font-mono text-[11px]"
                      >
                        {n} (Safe Parallel TX)
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Sole transmitter in Slot {selectedInfo.assignedSlot}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-center space-y-2">
                <Move className="w-5 h-5 mx-auto text-cyan-400 opacity-70" />
                <p className="text-xs text-slate-300 font-medium">Click any radio to inspect or move</p>
                <p className="text-[11px] text-slate-500">
                  Double-click anywhere on the canvas to place a new radio node.
                </p>
                <button
                  onClick={() => {
                    setIsAddNodeOpen(true);
                    setNewNodeName(`Node_${String(schedule.nodes.length + 1).padStart(2, '0')}`);
                    setNewNodeX(Math.round(minX + width / 2));
                    setNewNodeY(Math.round(minY + height / 2));
                  }}
                  className="w-full py-1.5 px-3 bg-cyan-600/90 hover:bg-cyan-500 text-white font-semibold rounded text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Radio Node</span>
                </button>
              </div>

              {/* Active Network Radios with Quick Delete */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  <span>Network Radios ({schedule.nodes.length})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Click to Inspect / Delete</span>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {schedule.nodes.map((nodeName) => {
                    const slot = schedule.nodeToSlot[nodeName] ?? 0;
                    const slotColor = schedule.slotColors[slot % schedule.slotColors.length];
                    const [x, y] = schedule.nodeCoordinates[nodeName];
                    return (
                      <div
                        key={nodeName}
                        onClick={() => setSelectedNode(nodeName)}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 transition-colors text-xs font-mono cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: slotColor }}
                          />
                          <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {nodeName}
                          </span>
                          <span className="text-[10px] text-slate-500">({x}, {y})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${slotColor}22`,
                              color: slotColor
                            }}
                          >
                            S{slot}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRemoveNode?.(nodeName);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/70 rounded transition-colors cursor-pointer"
                            title={`Remove ${nodeName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Optimization Metric Box */}
        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1 bg-slate-950/60 p-2.5 rounded-lg">
          <div className="flex justify-between">
            <span>Algorithm:</span>
            <span className="font-mono text-cyan-300 uppercase">{schedule.algorithmUsed}</span>
          </div>
          <div className="flex justify-between">
            <span>Frame Slots:</span>
            <span className="font-mono text-white font-bold">{schedule.slotCount} unique slots</span>
          </div>
          <div className="flex justify-between">
            <span>Spatial Reuse:</span>
            <span className="font-mono text-emerald-400 font-bold">{schedule.spatialReuseRatio}x reuse</span>
          </div>
        </div>
      </div>
    </div>
  );
};

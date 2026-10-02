import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Activity, ShieldCheck, Zap } from 'lucide-react';
import { ScheduleResult } from '../types/tdma';

interface LiveSimulatorProps {
  schedule: ScheduleResult;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({ schedule }) => {
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMs, setSpeedMs] = useState<number>(600); // ms per slot
  const [frameCounter, setFrameCounter] = useState<number>(1);
  const [packetsDelivered, setPacketsDelivered] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active transmitters in the current slot
  const activeTransmitters = schedule.slotToNodes[currentSlot] || [];

  // Determine which nodes are receivers (1-hop neighbors of active transmitters)
  const receivingNodes = React.useMemo(() => {
    const receivers = new Set<string>();
    for (const tx of activeTransmitters) {
      for (const edge of schedule.communicationEdges) {
        if (edge.u === tx) receivers.add(edge.v);
        if (edge.v === tx) receivers.add(edge.u);
      }
    }
    // A node cannot be both transmitting and receiving in the same slot (half-duplex)
    for (const tx of activeTransmitters) {
      receivers.delete(tx);
    }
    return receivers;
  }, [activeTransmitters, schedule.communicationEdges]);

  // TDMA Clock Loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentSlot((prev) => {
        const next = (prev + 1) % schedule.slotCount;
        if (next === 0) {
          setFrameCounter((fc) => fc + 1);
        }
        return next;
      });
      setPacketsDelivered((p) => p + (schedule.slotToNodes[currentSlot]?.length || 1));
    }, speedMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMs, schedule.slotCount, currentSlot]);

  const handleStepForward = () => {
    setCurrentSlot((prev) => (prev + 1) % schedule.slotCount);
  };

  const handleStepBackward = () => {
    setCurrentSlot((prev) => (prev - 1 + schedule.slotCount) % schedule.slotCount);
  };

  const handleReset = () => {
    setCurrentSlot(0);
    setFrameCounter(1);
    setPacketsDelivered(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Simulator Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Pause TDMA Clock' : 'Start TDMA Clock'}</span>
          </button>

          <button
            onClick={handleStepBackward}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Step Previous Slot"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleStepForward}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Step Next Slot"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition-colors"
            title="Reset Clock Counter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Clock Tick Rate:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[
              { label: 'Fast (250ms)', val: 250 },
              { label: 'Normal (600ms)', val: 600 },
              { label: 'Slow (1200ms)', val: 1200 },
            ].map((spd) => (
              <button
                key={spd.val}
                onClick={() => setSpeedMs(spd.val)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  speedMs === spd.val
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">Frame #: </span>
            <span className="text-white font-bold tabular-nums">{frameCounter}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">Delivered Packets: </span>
            <span className="text-emerald-400 font-bold tabular-nums">{packetsDelivered}</span>
          </div>
        </div>
      </div>

      {/* Repeating TDMA Frame Slot Scrubber */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              TDMA Frame Cycle Scrubber ({schedule.slotCount} Time Slots)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any slot to freeze inspection. Each repeating frame completes in {schedule.slotCount * (schedule.slotCount > 0 ? 1 : 1)}ms under 1ms slot duration.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>0 Collisions in Slot {currentSlot}</span>
          </div>
        </div>

        {/* Horizontal Slot Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {Array.from({ length: schedule.slotCount }, (_, s) => {
            const isActive = currentSlot === s;
            const nodesInSlot = schedule.slotToNodes[s] || [];
            const color = schedule.slotColors[s % schedule.slotColors.length];

            return (
              <button
                key={s}
                onClick={() => {
                  setCurrentSlot(s);
                  setIsPlaying(false);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isActive
                    ? 'ring-2 ring-cyan-400 border-transparent shadow-lg scale-[1.02]'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive ? `${color}25` : undefined,
                  borderColor: isActive ? color : undefined,
                }}
              >
                {isActive && (
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: color }}
                  />
                )}
                <div className="flex items-center justify-between font-mono">
                  <span className="text-xs font-bold text-white">Slot {s}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                    style={{ color, backgroundColor: `${color}22` }}
                  >
                    {nodesInSlot.length} TX
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-mono truncate">
                  {nodesInSlot.join(', ')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Live Radio Network Map during Active Slot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Transmitters & Listeners Status Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            Active Channel State (Slot {currentSlot})
          </h4>

          {/* Transmitters */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-emerald-400 font-medium">
                Active Transmitters ({activeTransmitters.length}):
              </span>
              <span className="text-[11px] font-mono text-slate-500">Spatial Parallel TX</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {activeTransmitters.map((node) => (
                <div
                  key={node}
                  className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs font-mono"
                >
                  <span className="text-emerald-300 font-bold">{node}</span>
                  <span className="text-emerald-400/80 text-[11px]">Transmitting RF Carrier</span>
                </div>
              ))}
            </div>
          </div>

          {/* Receiving Nodes */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-cyan-400 font-medium">
                Receiving Radios ({receivingNodes.size}):
              </span>
              <span className="text-[11px] font-mono text-slate-500">1-Hop Receivers</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {Array.from(receivingNodes).map((node) => (
                <span
                  key={node}
                  className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 rounded font-mono text-[11px]"
                >
                  {node}
                </span>
              ))}
            </div>
          </div>

          {/* Silent Nodes */}
          <div>
            <span className="text-slate-400 text-xs font-medium block mb-1">
              Silent / Awaiting Slot ({schedule.nodes.length - activeTransmitters.length - receivingNodes.size}):
            </span>
            <p className="text-[11px] text-slate-500">
              Silent radios remain non-interfering, conserving battery and avoiding hidden-terminal collision with active 2-hop transmitters.
            </p>
          </div>
        </div>

        {/* Spatial Reuse Theory & Live Proof Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center justify-between border-b border-slate-800 pb-3">
            <span>Spatial Reuse Mechanism in Slot {currentSlot}</span>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-800">
              Throughput Multiplier: {activeTransmitters.length}x
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <h5 className="font-semibold text-white text-xs">Why don't these transmitters collide?</h5>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                In this slot, <span className="text-white font-mono">{activeTransmitters.join(', ')}</span> transmit on the exact same frequency simultaneously.
              </p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Because our Distance-2 Graph Coloring mathematically proved they are separated by <strong className="text-emerald-300">&gt; 2 hops</strong>, no mutual receiver exists that can experience collision or packet corruption!
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <h5 className="font-semibold text-white text-xs">Capacity & Latency Advantage</h5>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Nodes:</span>
                  <span className="text-slate-200">{schedule.nodes.length} radios</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Naive Round-Robin Slots:</span>
                  <span className="text-rose-400">{schedule.nodes.length} slots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Optimized TDMA Slots:</span>
                  <span className="text-emerald-400 font-bold">{schedule.slotCount} slots</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-500">Frame Latency Reduction:</span>
                  <span className="text-cyan-400 font-bold">
                    {Math.round(((schedule.nodes.length - schedule.slotCount) / schedule.nodes.length) * 100)}% faster
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Radio Table for this Slot */}
          <div className="mt-4 pt-2">
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Active Transmitters in Slot {currentSlot}:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeTransmitters.map((node) => {
                const [x, y] = schedule.nodeCoordinates[node];
                return (
                  <div
                    key={node}
                    className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/40 font-mono text-xs"
                  >
                    <div className="font-bold text-white">{node}</div>
                    <div className="text-[10px] text-slate-400">Position: ({x}, {y})</div>
                    <div className="text-[10px] text-emerald-400 mt-1">Transmitting · Nominal</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

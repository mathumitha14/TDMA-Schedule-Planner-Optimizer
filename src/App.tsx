import React, { useState, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { LiveSimulator } from './components/LiveSimulator';
import { ScheduleMatrixView } from './components/ScheduleMatrixView';
import { CoordinateEditor } from './components/CoordinateEditor';
import { ReportView } from './components/ReportView';
import { EmaneBridgeView } from './components/EmaneBridgeView';
import { PresentationDeck } from './components/PresentationDeck';
import { NodeMap, AlgorithmType, ScheduleResult, TopologyPreset } from './types/tdma';
import { OFFICIAL_16_NODE_GRID, TACTICAL_FIELD_16, TOPOLOGY_PRESETS } from './data/presets';
import { computeTDMASchedule } from './engine/tdmaEngine';

export default function App() {
  const [nodes, setNodes] = useState<NodeMap>(TACTICAL_FIELD_16);
  const [activePresetId, setActivePresetId] = useState<string>('tactical-field-16');
  const [radioRange, setRadioRange] = useState<number>(500.0);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('dsatur');
  const [localSearch, setLocalSearch] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('topology');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Dynamically compute the complete TDMA schedule whenever topology or parameters change
  const schedule: ScheduleResult = useMemo(() => {
    return computeTDMASchedule(nodes, radioRange, algorithm, localSearch);
  }, [nodes, radioRange, algorithm, localSearch]);

  const handleSelectPreset = useCallback((preset: TopologyPreset) => {
    setNodes(preset.nodes);
    setRadioRange(preset.recommendedRange);
    setActivePresetId(preset.id);
    setSelectedNode(null);
  }, []);

  const handleResetToOfficial = useCallback(() => {
    setNodes(OFFICIAL_16_NODE_GRID);
    setRadioRange(500.0);
    setActivePresetId('assignment-16-grid');
    setAlgorithm('dsatur');
    setLocalSearch(true);
    setSelectedNode(null);
  }, []);

  const handleUpdateNodeCoordinates = useCallback((nodeName: string, newCoords: [number, number]) => {
    setNodes((prev) => ({
      ...prev,
      [nodeName]: newCoords,
    }));
  }, []);

  const handleAddNode = useCallback((coords?: [number, number], customName?: string) => {
    setNodes((prev) => {
      const existingNames = new Set(Object.keys(prev));
      let nextIdx = 1;
      let newName = customName?.trim() || '';
      if (!newName) {
        while (existingNames.has(`Node_${String(nextIdx).padStart(2, '0')}`)) {
          nextIdx++;
        }
        newName = `Node_${String(nextIdx).padStart(2, '0')}`;
      } else if (existingNames.has(newName)) {
        newName = `${newName}_new`;
      }

      let position: [number, number] = coords || [500, 500];
      if (!coords) {
        const existingCoords = Object.values(prev);
        if (existingCoords.length > 0) {
          const avgX = existingCoords.reduce((sum, c) => sum + c[0], 0) / existingCoords.length;
          const avgY = existingCoords.reduce((sum, c) => sum + c[1], 0) / existingCoords.length;
          position = [
            Math.round(avgX + (Math.random() * 240 - 120)),
            Math.round(avgY + (Math.random() * 240 - 120))
          ];
        }
      }

      setActivePresetId(''); // Custom network
      setSelectedNode(newName);
      return {
        ...prev,
        [newName]: position,
      };
    });
  }, []);

  const handleRemoveNode = useCallback((nodeName: string) => {
    setNodes((prev) => {
      if (Object.keys(prev).length <= 2) {
        return prev;
      }
      const updated = { ...prev };
      delete updated[nodeName];
      setActivePresetId(''); // Custom network
      return updated;
    });
    setSelectedNode((prevSelected) => (prevSelected === nodeName ? null : prevSelected));
  }, []);

  const handleUpdateNodes = useCallback((newNodes: NodeMap) => {
    setNodes(newNodes);
    setActivePresetId(''); // custom
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar Navigation */}
      <Navbar
        schedule={schedule}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetToOfficial={handleResetToOfficial}
        radioRange={radioRange}
        setRadioRange={setRadioRange}
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'topology' && (
          <NetworkCanvas
            schedule={schedule}
            onUpdateNodeCoordinates={handleUpdateNodeCoordinates}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onAddNode={handleAddNode}
            onRemoveNode={handleRemoveNode}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveSimulator schedule={schedule} />
        )}

        {activeTab === 'matrix' && (
          <ScheduleMatrixView schedule={schedule} />
        )}

        {activeTab === 'coordinates' && (
          <CoordinateEditor
            nodes={nodes}
            onUpdateNodes={handleUpdateNodes}
            radioRange={radioRange}
            setRadioRange={setRadioRange}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            localSearch={localSearch}
            setLocalSearch={setLocalSearch}
          />
        )}

        {activeTab === 'report' && (
          <ReportView schedule={schedule} />
        )}

        {activeTab === 'emane' && (
          <EmaneBridgeView schedule={schedule} />
        )}

        {activeTab === 'slides' && (
          <PresentationDeck schedule={schedule} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">Vaan Megam Networks</span>
          <span>·</span>
          <span>TDMA Schedule Planner &amp; Optimizer</span>
          <span>·</span>
          <span className="text-emerald-400">Zero Collision Guarantee</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Static Radios: {schedule.nodes.length}</span>
          <span>·</span>
          <span>Frame: {schedule.slotCount} slots</span>
          <span>·</span>
          <span>Range: {radioRange}m</span>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { Radio, Download, Copy, Terminal, CheckCircle2, ShieldCheck, Cpu, ArrowRight, ExternalLink } from 'lucide-react';
import { ScheduleResult, EmaneConfig } from '../types/tdma';
import {
  generateEmaneTdmaXml,
  generateEmaneMacXml,
  generatePythonBridgeScript,
  DEFAULT_EMANE_CONFIG
} from '../engine/emaneBridge';

interface EmaneBridgeViewProps {
  schedule: ScheduleResult;
}

export const EmaneBridgeView: React.FC<EmaneBridgeViewProps> = ({ schedule }) => {
  const [activeFile, setActiveFile] = useState<'scheduleXml' | 'macXml' | 'bridgePy'>('scheduleXml');
  const [config, setConfig] = useState<EmaneConfig>(DEFAULT_EMANE_CONFIG);
  const [copied, setCopied] = useState<boolean>(false);

  const scheduleXml = React.useMemo(() => generateEmaneTdmaXml(schedule, config), [schedule, config]);
  const macXml = React.useMemo(() => generateEmaneMacXml(schedule, config), [schedule, config]);
  const bridgePy = React.useMemo(() => generatePythonBridgeScript(schedule), [schedule]);

  const currentContent = activeFile === 'scheduleXml' ? scheduleXml : activeFile === 'macXml' ? macXml : bridgePy;
  const currentFilename = activeFile === 'scheduleXml' ? 'tdmaschedule.xml' : activeFile === 'macXml' ? 'tdmamac.xml' : 'emane_bridge.py';
  const currentMime = activeFile === 'bridgePy' ? 'text/x-python' : 'application/xml';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: currentMime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', currentFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              EMANE TDMA Radio Model Integration Bridge (Part 2 Bonus)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              BONUS SPECIFICATION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Translates the optimized {schedule.slotCount}-slot TDMA schedule into native EMANE XML events and multicast control packets for emulated radio nodes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {currentFilename}</span>
          </button>
        </div>
      </div>

      {/* Architectural Flow Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Integration Architecture & Data Pipeline
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 relative">
            <div className="text-[10px] font-mono text-cyan-400 font-bold">STAGE 1</div>
            <div className="font-bold text-white">Network Brain</div>
            <div className="text-[11px] text-slate-400">Calculates D2 conflict graph & {schedule.slotCount}-slot schedule.</div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 relative">
            <div className="text-[10px] font-mono text-cyan-400 font-bold">STAGE 2</div>
            <div className="font-bold text-white">JSON / XML Adapter</div>
            <div className="text-[11px] text-slate-400">Maps Node_01...Node_16 to EMANE NEM IDs 1...16.</div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 relative">
            <div className="text-[10px] font-mono text-cyan-400 font-bold">STAGE 3</div>
            <div className="font-bold text-white">EMANE Event Daemon</div>
            <div className="text-[11px] text-slate-400">Publishes TDMA event via 224.1.2.1:45703 multicast channel.</div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 relative">
            <div className="text-[10px] font-mono text-cyan-400 font-bold">STAGE 4</div>
            <div className="font-bold text-white">TDMA Radio Model</div>
            <div className="text-[11px] text-slate-400">Enforces 1ms slot boundaries and RF channel propagation.</div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 relative">
            <div className="text-[10px] font-mono text-cyan-400 font-bold">STAGE 5</div>
            <div className="font-bold text-white">Virtual Radio Nodes</div>
            <div className="text-[11px] text-slate-400">Linux network namespaces send/receive real IP traffic.</div>
          </div>
        </div>
      </div>

      {/* File Selector & Code Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveFile('scheduleXml')}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                activeFile === 'scheduleXml'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              tdmaschedule.xml (TDMA Event)
            </button>
            <button
              onClick={() => setActiveFile('macXml')}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                activeFile === 'macXml'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              tdmamac.xml (MAC Profile)
            </button>
            <button
              onClick={() => setActiveFile('bridgePy')}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                activeFile === 'bridgePy'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              emane_bridge.py (Python Bridge)
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {activeFile === 'scheduleXml' && `${schedule.slotCount} Slots Allocated across ${schedule.nodes.length} NEMs`}
            {activeFile === 'macXml' && `Slot Duration: ${config.slotDurationMicroseconds} µs`}
            {activeFile === 'bridgePy' && `Standalone Python 3 Bridge`}
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 max-h-[460px] overflow-y-auto">
          <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre overflow-x-auto selection:bg-cyan-500/30">
            {currentContent}
          </pre>
        </div>
      </div>

      {/* Step-by-Step EMANE Execution Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Step-by-Step EMANE Linux / Docker Execution Guide
        </h4>

        <div className="space-y-3 text-xs text-slate-300 font-mono">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="text-cyan-400 font-bold">Step 1: Install EMANE or Run in Official Container</div>
            <p className="text-slate-400 text-[11px] font-sans">
              EMANE can be executed on Ubuntu 22.04 LTS or via a standard consolidated container:
            </p>
            <div className="text-slate-200 bg-slate-900 p-2 rounded text-[11px]">
              sudo apt-get install -y emane emane-model-tdma emane-transport-virtual
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="text-cyan-400 font-bold">Step 2: Generate EMANE Profiles via Python Optimizer</div>
            <p className="text-slate-400 text-[11px] font-sans">
              Run the Network Brain to generate <code className="text-white">schedule.json</code> and <code className="text-white">tdmaschedule.xml</code>:
            </p>
            <div className="text-slate-200 bg-slate-900 p-2 rounded text-[11px]">
              python3 main.py --input examples/nodes.json --output-json schedule.json
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="text-cyan-400 font-bold">Step 3: Publish TDMA Event to EMANE Multicast Channel</div>
            <p className="text-slate-400 text-[11px] font-sans">
              Execute the bridge script to broadcast the schedule over the event service socket:
            </p>
            <div className="text-slate-200 bg-slate-900 p-2 rounded text-[11px]">
              python3 emane_bridge.py --schedule schedule.json --publish
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="text-cyan-400 font-bold">Step 4: Verify Collision-Free Packet Delivery</div>
            <p className="text-slate-400 text-[11px] font-sans">
              Inspect radio packet metrics using <code className="text-white">emanesh</code> to confirm 0 packet drops caused by MAC collisions:
            </p>
            <div className="text-slate-200 bg-slate-900 p-2 rounded text-[11px]">
              emanesh 127.0.0.1 get table nem 1 mac CountersTable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

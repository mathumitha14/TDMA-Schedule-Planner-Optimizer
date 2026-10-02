/**
 * Types for Vaan Megam Networks TDMA Schedule Planner & Optimizer
 */

export type Coordinate = [number, number];

export interface NodeMap {
  [nodeName: string]: Coordinate;
}

export interface NodeInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  assignedSlot: number;
  degreeComm: number;
  degreeConflict: number;
  saturation: number;
  oneHopNeighbors: string[];
  twoHopNeighbors: string[];
  spatialPartners: string[]; // Other nodes transmitting in the same slot
}

export type EdgeType = '1-hop' | '2-hop';

export interface GraphEdge {
  u: string;
  v: string;
  distance: number;
  type: EdgeType;
  commonNeighbors?: string[];
}

export interface ValidationReport {
  isValid: boolean;
  totalNodes: number;
  communicationEdgesCount: number;
  conflictEdgesCount: number;
  oneHopViolations: number;
  twoHopViolations: number;
  totalViolations: number;
  matrixValid: boolean;
  violationsList: {
    u: string;
    v: string;
    slotU: number;
    slotV: number;
    type: '1-hop' | '2-hop';
    commonNeighbors?: string[];
  }[];
  status: 'CONFLICT-FREE' | 'VIOLATIONS_DETECTED';
}

export type AlgorithmType = 'dsatur' | 'largest_first' | 'greedy';

export interface ScheduleResult {
  nodes: string[];
  nodeCoordinates: NodeMap;
  radioRangeMeters: number;
  communicationEdges: GraphEdge[];
  conflictEdges: GraphEdge[];
  nodeToSlot: Record<string, number>;
  slotCount: number;
  initialSlotCount: number;
  scheduleMatrix: number[][]; // [slotIndex][nodeIndex] = 1 | 0
  slotToNodes: Record<number, string[]>;
  validation: ValidationReport;
  algorithmUsed: AlgorithmType;
  localSearchApplied: boolean;
  iterationsUsed: number;
  spatialReuseRatio: number; // nodes / slots
  slotColors: string[];
  executionTimeMs: number;
}

export interface EmaneConfig {
  slotDurationMicroseconds: number;
  frameSlots: number;
  frequencyHz: number;
  bandwidthHz: number;
  txPowerDbm: number;
  channelActivityPromiscuous: boolean;
}

export interface TopologyPreset {
  id: string;
  name: string;
  description: string;
  nodes: NodeMap;
  recommendedRange: number;
}

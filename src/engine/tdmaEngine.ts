import {
  Coordinate,
  NodeMap,
  GraphEdge,
  AlgorithmType,
  ValidationReport,
  ScheduleResult,
  NodeInfo
} from '../types/tdma';

/**
 * Palette of visually distinct, high-contrast colors for TDMA time slots
 */
export const SLOT_PALETTE = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#a855f7', // Purple
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#e11d48', // Rose
  '#0ea5e9', // Sky
  '#d946ef', // Fuchsia
  '#22c55e', // Green
  '#eab308', // Yellow
];

/**
 * Calculate Euclidean Distance between two 2D points in meters
 */
export function euclideanDistance(a: Coordinate, b: Coordinate): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validate input coordinates JSON/map
 */
export function validateNodeCoordinates(nodes: unknown): { isValid: boolean; error?: string; parsed?: NodeMap } {
  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) {
    return { isValid: false, error: 'Input must be a valid JSON object mapping node names to [x, y] coordinates.' };
  }

  const entries = Object.entries(nodes as Record<string, unknown>);
  if (entries.length === 0) {
    return { isValid: false, error: 'Coordinate list cannot be empty.' };
  }

  const parsed: NodeMap = {};
  for (const [name, coords] of entries) {
    if (typeof name !== 'string' || name.trim() === '') {
      return { isValid: false, error: `Invalid node identifier: "${name}". Node names must be non-empty strings.` };
    }
    if (!Array.isArray(coords) || coords.length !== 2) {
      return { isValid: false, error: `Node "${name}" has invalid coordinates. Must be exactly two numbers [x, y].` };
    }
    const [x, y] = coords;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      return { isValid: false, error: `Node "${name}" has non-numeric or non-finite coordinate values (${x}, ${y}).` };
    }
    parsed[name.trim()] = [x, y];
  }

  return { isValid: true, parsed };
}

/**
 * Build 1-hop Communication Graph based on radio transmission range
 */
export function buildCommunicationGraph(nodes: NodeMap, radioRangeMeters: number): {
  edges: GraphEdge[];
  adjacency: Map<string, Set<string>>;
  distances: Map<string, number>;
} {
  const nodeNames = Object.keys(nodes).sort();
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, Set<string>>();
  const distances = new Map<string, number>();

  for (const name of nodeNames) {
    adjacency.set(name, new Set());
  }

  for (let i = 0; i < nodeNames.length; i++) {
    const u = nodeNames[i];
    const posU = nodes[u];
    for (let j = i + 1; j < nodeNames.length; j++) {
      const v = nodeNames[j];
      const posV = nodes[v];
      const dist = euclideanDistance(posU, posV);

      if (dist <= radioRangeMeters) {
        edges.push({
          u,
          v,
          distance: Math.round(dist * 100) / 100,
          type: '1-hop'
        });
        adjacency.get(u)!.add(v);
        adjacency.get(v)!.add(u);
        const pairKey = [u, v].sort().join(':::');
        distances.set(pairKey, dist);
      }
    }
  }

  return { edges, adjacency, distances };
}

/**
 * Build Distance-2 Conflict Graph:
 * Direct 1-hop communication neighbors OR nodes sharing a common neighbor (2-hop)
 */
export function buildConflictGraph(
  nodes: NodeMap,
  commAdj: Map<string, Set<string>>
): {
  conflictEdges: GraphEdge[];
  conflictAdj: Map<string, Set<string>>;
  oneHopEdges: GraphEdge[];
  twoHopEdges: GraphEdge[];
} {
  const nodeNames = Object.keys(nodes).sort();
  const conflictAdj = new Map<string, Set<string>>();
  const conflictEdges: GraphEdge[] = [];
  const oneHopEdges: GraphEdge[] = [];
  const twoHopEdges: GraphEdge[] = [];

  for (const name of nodeNames) {
    conflictAdj.set(name, new Set());
  }

  for (let i = 0; i < nodeNames.length; i++) {
    const u = nodeNames[i];
    const uNeighbors = commAdj.get(u) || new Set();

    for (let j = i + 1; j < nodeNames.length; j++) {
      const v = nodeNames[j];
      const vNeighbors = commAdj.get(v) || new Set();
      const dist = Math.round(euclideanDistance(nodes[u], nodes[v]) * 100) / 100;

      // Check 1-hop direct link
      const is1Hop = uNeighbors.has(v);

      // Check 2-hop common neighbors
      const common: string[] = [];
      for (const neighbor of uNeighbors) {
        if (vNeighbors.has(neighbor)) {
          common.push(neighbor);
        }
      }

      if (is1Hop) {
        const edge: GraphEdge = {
          u,
          v,
          distance: dist,
          type: '1-hop',
          commonNeighbors: common.length > 0 ? common.sort() : undefined
        };
        conflictEdges.push(edge);
        oneHopEdges.push(edge);
        conflictAdj.get(u)!.add(v);
        conflictAdj.get(v)!.add(u);
      } else if (common.length > 0) {
        const edge: GraphEdge = {
          u,
          v,
          distance: dist,
          type: '2-hop',
          commonNeighbors: common.sort()
        };
        conflictEdges.push(edge);
        twoHopEdges.push(edge);
        conflictAdj.get(u)!.add(v);
        conflictAdj.get(v)!.add(u);
      }
    }
  }

  return { conflictEdges, conflictAdj, oneHopEdges, twoHopEdges };
}

/**
 * DSATUR (Degree of Saturation) Graph Coloring Algorithm:
 * Selects node with highest saturation (unique colored neighbors), tie-breaking by conflict degree, then name.
 */
export function colorDSATUR(
  nodeNames: string[],
  conflictAdj: Map<string, Set<string>>
): Record<string, number> {
  const coloring: Record<string, number> = {};
  const uncolored = new Set(nodeNames);

  // Compute saturation: set of unique colors of adjacent colored nodes
  const neighborColors = new Map<string, Set<number>>();
  for (const n of nodeNames) {
    neighborColors.set(n, new Set());
  }

  while (uncolored.size > 0) {
    let bestNode: string | null = null;
    let maxSaturation = -1;
    let maxDegree = -1;

    // Stable deterministic tie-breaker
    const candidates = Array.from(uncolored).sort();

    for (const node of candidates) {
      const sat = neighborColors.get(node)!.size;
      const deg = conflictAdj.get(node)?.size || 0;

      if (
        sat > maxSaturation ||
        (sat === maxSaturation && deg > maxDegree) ||
        (sat === maxSaturation && deg === maxDegree && (bestNode === null || node < bestNode))
      ) {
        bestNode = node;
        maxSaturation = sat;
        maxDegree = deg;
      }
    }

    if (!bestNode) break;

    // Find lowest available non-conflicting color
    const usedColors = neighborColors.get(bestNode)!;
    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }

    coloring[bestNode] = color;
    uncolored.delete(bestNode);

    // Update saturation of uncolored conflict neighbors
    const neighbors = conflictAdj.get(bestNode) || new Set();
    for (const neighbor of neighbors) {
      if (uncolored.has(neighbor)) {
        neighborColors.get(neighbor)!.add(color);
      }
    }
  }

  return coloring;
}

/**
 * Largest-Degree-First (Welsh-Powell) Graph Coloring
 */
export function colorLargestFirst(
  nodeNames: string[],
  conflictAdj: Map<string, Set<string>>
): Record<string, number> {
  // Sort descending by conflict degree, tie-breaking by node name
  const sortedNodes = [...nodeNames].sort((a, b) => {
    const degA = conflictAdj.get(a)?.size || 0;
    const degB = conflictAdj.get(b)?.size || 0;
    if (degB !== degA) return degB - degA;
    return a.localeCompare(b);
  });

  const coloring: Record<string, number> = {};

  for (const node of sortedNodes) {
    const neighbors = conflictAdj.get(node) || new Set();
    const usedColors = new Set<number>();
    for (const neighbor of neighbors) {
      if (coloring[neighbor] !== undefined) {
        usedColors.add(coloring[neighbor]);
      }
    }

    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }
    coloring[node] = color;
  }

  return coloring;
}

/**
 * Deterministic Greedy Graph Coloring (natural alphabetical name order)
 */
export function colorGreedy(
  nodeNames: string[],
  conflictAdj: Map<string, Set<string>>
): Record<string, number> {
  const sortedNodes = [...nodeNames].sort();
  const coloring: Record<string, number> = {};

  for (const node of sortedNodes) {
    const neighbors = conflictAdj.get(node) || new Set();
    const usedColors = new Set<number>();
    for (const neighbor of neighbors) {
      if (coloring[neighbor] !== undefined) {
        usedColors.add(coloring[neighbor]);
      }
    }

    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }
    coloring[node] = color;
  }

  return coloring;
}

/**
 * Post-coloring Iterative Local Search Optimizer:
 * Re-examines each node to check if it can safely drop to an earlier slot,
 * compacting the total frame length without causing any conflict violations.
 */
export function optimizeColoring(
  initialColoring: Record<string, number>,
  nodeNames: string[],
  conflictAdj: Map<string, Set<string>>,
  maxIterations: number = 100
): { optimizedColoring: Record<string, number>; iterations: number } {
  const coloring: Record<string, number> = { ...initialColoring };
  let improved = true;
  let iteration = 0;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    // Try to move each node to the lowest valid color
    for (const node of [...nodeNames].sort()) {
      const currentColor = coloring[node];
      if (currentColor === 0) continue; // Already at lowest slot

      const neighbors = conflictAdj.get(node) || new Set();
      const usedByNeighbors = new Set<number>();
      for (const neighbor of neighbors) {
        if (neighbor !== node && coloring[neighbor] !== undefined) {
          usedByNeighbors.add(coloring[neighbor]);
        }
      }

      // Find lowest non-conflicting color
      let lowestAvailable = 0;
      while (usedByNeighbors.has(lowestAvailable)) {
        lowestAvailable++;
      }

      if (lowestAvailable < currentColor) {
        coloring[node] = lowestAvailable;
        improved = true;
      }
    }
  }

  // Renumber colors compactly if gaps formed
  const presentColors = Array.from(new Set(Object.values(coloring))).sort((a, b) => a - b);
  const colorMap = new Map<number, number>();
  presentColors.forEach((c, idx) => colorMap.set(c, idx));

  const compactColoring: Record<string, number> = {};
  for (const node of nodeNames) {
    compactColoring[node] = colorMap.get(coloring[node]) ?? coloring[node];
  }

  return { optimizedColoring: compactColoring, iterations: iteration };
}

/**
 * Independent Schedule Collision Validator
 * Inspects all communication and conflict edges independently
 */
export function validateSchedule(
  nodeToSlot: Record<string, number>,
  commEdges: GraphEdge[],
  conflictEdges: GraphEdge[],
  nodeNames: string[],
  slotCount: number
): ValidationReport {
  const violationsList: ValidationReport['violationsList'] = [];
  let oneHopViolations = 0;
  let twoHopViolations = 0;

  for (const edge of conflictEdges) {
    const slotU = nodeToSlot[edge.u];
    const slotV = nodeToSlot[edge.v];

    if (slotU !== undefined && slotV !== undefined && slotU === slotV) {
      if (edge.type === '1-hop') {
        oneHopViolations++;
      } else {
        twoHopViolations++;
      }
      violationsList.push({
        u: edge.u,
        v: edge.v,
        slotU,
        slotV,
        type: edge.type,
        commonNeighbors: edge.commonNeighbors
      });
    }
  }

  // Validate matrix rules: every node must have exactly one assigned slot
  let matrixValid = true;
  for (const node of nodeNames) {
    const s = nodeToSlot[node];
    if (s === undefined || s < 0 || s >= slotCount || !Number.isInteger(s)) {
      matrixValid = false;
      break;
    }
  }

  const totalViolations = oneHopViolations + twoHopViolations;
  const isValid = totalViolations === 0 && matrixValid;

  return {
    isValid,
    totalNodes: nodeNames.length,
    communicationEdgesCount: commEdges.length,
    conflictEdgesCount: conflictEdges.length,
    oneHopViolations,
    twoHopViolations,
    totalViolations,
    matrixValid,
    violationsList,
    status: isValid ? 'CONFLICT-FREE' : 'VIOLATIONS_DETECTED'
  };
}

/**
 * Generate Slot × Node Boolean Matrix:
 * rows = Slots, columns = Nodes.
 * Value = 1 if node transmits in slot, 0 otherwise.
 */
export function generateScheduleMatrix(
  nodeNames: string[],
  nodeToSlot: Record<string, number>,
  slotCount: number
): number[][] {
  const matrix: number[][] = [];
  for (let s = 0; s < slotCount; s++) {
    const row = new Array<number>(nodeNames.length).fill(0);
    for (let nIdx = 0; nIdx < nodeNames.length; nIdx++) {
      const node = nodeNames[nIdx];
      if (nodeToSlot[node] === s) {
        row[nIdx] = 1;
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Execute Complete TDMA Schedule Optimization Pipeline
 */
export function computeTDMASchedule(
  nodes: NodeMap,
  radioRangeMeters: number = 500.0,
  algorithm: AlgorithmType = 'dsatur',
  applyLocalSearch: boolean = true
): ScheduleResult {
  const startTime = performance.now();
  const nodeNames = Object.keys(nodes).sort();

  // Step 1: Communication Graph
  const { edges: commEdges, adjacency: commAdj } = buildCommunicationGraph(nodes, radioRangeMeters);

  // Step 2: Distance-2 Conflict Graph
  const { conflictEdges, conflictAdj } = buildConflictGraph(nodes, commAdj);

  // Step 3: Graph Coloring
  let rawColoring: Record<string, number>;
  switch (algorithm) {
    case 'dsatur':
      rawColoring = colorDSATUR(nodeNames, conflictAdj);
      break;
    case 'largest_first':
      rawColoring = colorLargestFirst(nodeNames, conflictAdj);
      break;
    case 'greedy':
    default:
      rawColoring = colorGreedy(nodeNames, conflictAdj);
      break;
  }

  const initialMaxColor = Math.max(...Object.values(rawColoring), -1);
  const initialSlotCount = initialMaxColor + 1;

  // Step 4: Optional Local Search Optimization
  let finalColoring = rawColoring;
  let iterationsUsed = 0;
  if (applyLocalSearch) {
    const opt = optimizeColoring(rawColoring, nodeNames, conflictAdj);
    finalColoring = opt.optimizedColoring;
    iterationsUsed = opt.iterations;
  }

  const slotCount = Math.max(...Object.values(finalColoring), -1) + 1;

  // Step 5: Slot to Nodes mapping
  const slotToNodes: Record<number, string[]> = {};
  for (let s = 0; s < slotCount; s++) {
    slotToNodes[s] = [];
  }
  for (const [node, slot] of Object.entries(finalColoring)) {
    if (!slotToNodes[slot]) slotToNodes[slot] = [];
    slotToNodes[slot].push(node);
  }

  // Step 6: Generate Boolean Matrix
  const scheduleMatrix = generateScheduleMatrix(nodeNames, finalColoring, slotCount);

  // Step 7: Independent Validation
  const validation = validateSchedule(finalColoring, commEdges, conflictEdges, nodeNames, slotCount);

  const endTime = performance.now();
  const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;
  const spatialReuseRatio = slotCount > 0 ? Math.round((nodeNames.length / slotCount) * 100) / 100 : 0;

  return {
    nodes: nodeNames,
    nodeCoordinates: nodes,
    radioRangeMeters,
    communicationEdges: commEdges,
    conflictEdges,
    nodeToSlot: finalColoring,
    slotCount,
    initialSlotCount,
    scheduleMatrix,
    slotToNodes,
    validation,
    algorithmUsed: algorithm,
    localSearchApplied: applyLocalSearch,
    iterationsUsed,
    spatialReuseRatio,
    slotColors: Array.from({ length: slotCount }, (_, i) => SLOT_PALETTE[i % SLOT_PALETTE.length]),
    executionTimeMs
  };
}

/**
 * Generate complete NodeInfo structure for detailed inspection
 */
export function extractNodeDetails(nodeName: string, schedule: ScheduleResult): NodeInfo | null {
  if (!schedule.nodeCoordinates[nodeName]) return null;

  const [x, y] = schedule.nodeCoordinates[nodeName];
  const assignedSlot = schedule.nodeToSlot[nodeName] ?? -1;

  const oneHopNeighbors: string[] = [];
  for (const edge of schedule.communicationEdges) {
    if (edge.u === nodeName) oneHopNeighbors.push(edge.v);
    else if (edge.v === nodeName) oneHopNeighbors.push(edge.u);
  }

  const twoHopNeighbors: string[] = [];
  for (const edge of schedule.conflictEdges) {
    if (edge.type === '2-hop') {
      if (edge.u === nodeName) twoHopNeighbors.push(edge.v);
      else if (edge.v === nodeName) twoHopNeighbors.push(edge.u);
    }
  }

  const spatialPartners = (schedule.slotToNodes[assignedSlot] || []).filter(n => n !== nodeName);

  return {
    id: nodeName,
    name: nodeName,
    x,
    y,
    assignedSlot,
    degreeComm: oneHopNeighbors.length,
    degreeConflict: oneHopNeighbors.length + twoHopNeighbors.length,
    saturation: 0,
    oneHopNeighbors: oneHopNeighbors.sort(),
    twoHopNeighbors: twoHopNeighbors.sort(),
    spatialPartners: spatialPartners.sort()
  };
}

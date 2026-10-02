import { ScheduleResult } from '../types/tdma';

/**
 * Generate human-readable report strictly conforming to CONTEXT.md Section 25
 */
export function generateTextReport(result: ScheduleResult): string {
  const {
    nodes,
    radioRangeMeters,
    slotCount,
    nodeToSlot,
    scheduleMatrix,
    validation,
    algorithmUsed,
    spatialReuseRatio,
    initialSlotCount,
    localSearchApplied
  } = result;

  const lines: string[] = [];

  lines.push('================================================================');
  lines.push(' TDMA TOPOLOGY OPTIMIZATION REPORT');
  lines.push(' Vaan Megam Networks — Centralized Network Brain');
  lines.push('================================================================');
  lines.push('');
  lines.push(`Total Nodes Processed   : ${nodes.length}`);
  lines.push(`Configured Radio Range  : ${radioRangeMeters.toFixed(1)} meters`);
  lines.push(`Coloring Algorithm      : ${algorithmUsed.toUpperCase()}`);
  lines.push(`Local Search Optimizer  : ${localSearchApplied ? 'ENABLED' : 'DISABLED'}`);
  lines.push(`Initial Frame Length    : ${initialSlotCount} slots`);
  lines.push(`Optimized Frame Length  : ${slotCount} unique timeslots`);
  lines.push(`Spatial Reuse Ratio     : ${spatialReuseRatio}x (nodes/slot)`);
  lines.push('');
  lines.push('----------------------------------------------------------------');
  lines.push('NODE -> SLOT ASSIGNMENTS:');
  lines.push('');

  for (const node of nodes) {
    const slot = nodeToSlot[node] ?? -1;
    lines.push(`${node}: Slot ${slot}`);
  }

  lines.push('');
  lines.push('----------------------------------------------------------------');
  lines.push('STRUCTURAL TDMA SCHEDULE MATRIX (Slot x Node Boolean Matrix):');
  lines.push('');

  // Header line
  // Format short node IDs (e.g. "01", "02", ...)
  const colHeaders = nodes.map(n => {
    const match = n.match(/\d+$/);
    return match ? match[0].padStart(2, '0') : n.slice(0, 3);
  });

  const headerRow = `Slot \\ Node | ` + colHeaders.join(' | ');
  lines.push(headerRow);
  lines.push('-'.repeat(Math.max(headerRow.length, 64)));

  for (let s = 0; s < slotCount; s++) {
    const slotLabel = `Slot ${String(s).padStart(2, '0')}    | `;
    const rowValues = scheduleMatrix[s].map(v => String(v).padStart(2, ' ')).join(' | ');
    lines.push(slotLabel + rowValues);
  }

  lines.push('');
  lines.push('----------------------------------------------------------------');
  lines.push('VALIDATION:');
  lines.push('');
  lines.push(`Communication Edges : ${validation.communicationEdgesCount}`);
  lines.push(`Conflict Edges      : ${validation.conflictEdgesCount}`);
  lines.push(`1-Hop Violations    : ${validation.oneHopViolations}`);
  lines.push(`2-Hop Violations    : ${validation.twoHopViolations}`);
  lines.push(`Total Violations    : ${validation.totalViolations}`);
  lines.push(`Matrix Integrity    : ${validation.matrixValid ? 'PASS (1 active slot/node)' : 'FAIL'}`);
  lines.push('');
  lines.push(`Status: ${validation.status}`);
  lines.push('================================================================');

  return lines.join('\n');
}

/**
 * Generate standard JSON format conforming to CONTEXT.md Section 40
 */
export function generateScheduleJson(result: ScheduleResult): string {
  const jsonObject = {
    metadata: {
      generated_by: 'Vaan Megam Networks TDMA Planner',
      timestamp: new Date().toISOString(),
      algorithm: result.algorithmUsed,
      local_search: result.localSearchApplied
    },
    node_count: result.nodes.length,
    radio_range_meters: result.radioRangeMeters,
    slot_count: result.slotCount,
    initial_slot_count: result.initialSlotCount,
    spatial_reuse_ratio: result.spatialReuseRatio,
    nodes: result.nodeCoordinates,
    communication_edges_count: result.communicationEdges.length,
    conflict_edges_count: result.conflictEdges.length,
    node_to_slot: result.nodeToSlot,
    slot_to_nodes: result.slotToNodes,
    schedule_matrix: result.scheduleMatrix,
    validation: {
      valid: result.validation.isValid,
      status: result.validation.status,
      violations: result.validation.totalViolations,
      one_hop_violations: result.validation.oneHopViolations,
      two_hop_violations: result.validation.twoHopViolations,
      matrix_valid: result.validation.matrixValid
    }
  };

  return JSON.stringify(jsonObject, null, 2);
}

/**
 * Generate CSV export of the Slot x Node Matrix
 */
export function generateScheduleCsv(result: ScheduleResult): string {
  const lines: string[] = [];
  lines.push(['Slot', ...result.nodes].join(','));
  for (let s = 0; s < result.slotCount; s++) {
    lines.push([`Slot ${s}`, ...result.scheduleMatrix[s]].join(','));
  }
  return lines.join('\n');
}

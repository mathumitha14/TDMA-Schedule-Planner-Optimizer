/**
 * Automated Verification Test Suite for TDMA Planner
 * Implements test scenarios from CONTEXT.md Section 33
 */

import {
  euclideanDistance,
  computeTDMASchedule,
  buildCommunicationGraph,
  buildConflictGraph
} from '../engine/tdmaEngine';
import { NodeMap } from '../types/tdma';
import { OFFICIAL_16_NODE_GRID } from '../data/presets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

console.log('====================================================');
console.log(' Running TDMA Planner Verification Test Suite');
console.log('====================================================\n');

// Test 1: Two connected nodes
console.log('Test 1: Two adjacent nodes (A ----- B, 300m <= 500m)...');
const t1Nodes: NodeMap = {
  Node_A: [0, 0],
  Node_B: [300, 0]
};
const t1Result = computeTDMASchedule(t1Nodes, 500.0);
assert(t1Result.communicationEdges.length === 1, 'Test 1 must have 1 comm edge');
assert(t1Result.slotCount >= 2, 'Test 1 must require at least 2 slots');
assert(t1Result.nodeToSlot['Node_A'] !== t1Result.nodeToSlot['Node_B'], 'Adjacent nodes must have different slots');
assert(t1Result.validation.isValid, 'Test 1 schedule must be valid');
console.log('  PASS: A and B assigned different slots (0 violations)\n');

// Test 2: Three-node chain (A ----- B ----- C)
console.log('Test 2: Three-node chain (A --- B --- C, 300m each, A to C is 600m)...');
const t2Nodes: NodeMap = {
  Node_A: [0, 0],
  Node_B: [300, 0],
  Node_C: [600, 0]
};
const t2Result = computeTDMASchedule(t2Nodes, 500.0);
assert(t2Result.communicationEdges.length === 2, 'Test 2 must have 2 comm edges (A-B and B-C)');
assert(t2Result.conflictEdges.length === 3, 'Test 2 must have 3 conflict edges (A-B 1-hop, B-C 1-hop, A-C 2-hop)');
const sA = t2Result.nodeToSlot['Node_A'];
const sB = t2Result.nodeToSlot['Node_B'];
const sC = t2Result.nodeToSlot['Node_C'];
assert(sA !== sB && sB !== sC && sA !== sC, 'All 3 nodes in chain must have distinct slots due to Distance-2 coloring');
assert(t2Result.slotCount >= 3, 'Chain must require at least 3 slots');
assert(t2Result.validation.isValid, 'Test 2 schedule must be valid');
console.log('  PASS: A, B, and C assigned 3 distinct slots (hidden terminal eliminated)\n');

// Test 3: Triangle (A, B, C mutual neighbors)
console.log('Test 3: Triangle (3 mutually adjacent nodes)...');
const t3Nodes: NodeMap = {
  Node_A: [0, 0],
  Node_B: [300, 0],
  Node_C: [150, 200]
};
const t3Result = computeTDMASchedule(t3Nodes, 500.0);
assert(t3Result.communicationEdges.length === 3, 'Triangle must have 3 comm edges');
assert(t3Result.slotCount === 3, 'Triangle must require exactly 3 slots');
assert(t3Result.validation.isValid, 'Test 3 schedule must be valid');
console.log('  PASS: 3 distinct slots assigned, 0 violations\n');

// Test 4: Disconnected nodes (A and B separated by 800m > 500m)
console.log('Test 4: Disconnected nodes (Spatial reuse test)...');
const t4Nodes: NodeMap = {
  Node_A: [0, 0],
  Node_B: [800, 0]
};
const t4Result = computeTDMASchedule(t4Nodes, 500.0);
assert(t4Result.communicationEdges.length === 0, 'No communication edge');
assert(t4Result.conflictEdges.length === 0, 'No conflict edge');
assert(t4Result.slotCount === 1, 'Disconnected nodes can share 1 slot');
assert(t4Result.nodeToSlot['Node_A'] === t4Result.nodeToSlot['Node_B'], 'Nodes should reuse slot 0');
assert(t4Result.validation.isValid, 'Test 4 schedule must be valid');
console.log('  PASS: Disconnected nodes safely share Slot 0 (Spatial reuse confirmed)\n');

// Test 5: Official 16-Node Assignment 4x4 Grid
console.log('Test 5: Official 16-Node Assignment Benchmark...');
const t5Result = computeTDMASchedule(OFFICIAL_16_NODE_GRID, 500.0, 'dsatur', true);
assert(t5Result.nodes.length === 16, 'Must have exactly 16 nodes');
assert(t5Result.validation.isValid, 'Official schedule must be 100% valid');
assert(t5Result.validation.oneHopViolations === 0, 'Must have 0 1-hop violations');
assert(t5Result.validation.twoHopViolations === 0, 'Must have 0 2-hop violations');
assert(t5Result.validation.matrixValid, 'Matrix must have exactly one 1 per node column');
console.log(`  PASS: Processed 16 nodes -> ${t5Result.slotCount} unique slots, spatial reuse: ${t5Result.spatialReuseRatio}x`);
console.log(`  Validation Status: ${t5Result.validation.status}\n`);

console.log('====================================================');
console.log(' ALL 5 TESTS PASSED SUCCESSFULLY! (100% Conflict-Free)');
console.log('====================================================');

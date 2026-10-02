import { TopologyPreset, NodeMap } from '../types/tdma';

// 1. Tactical Field Deployment (16 Nodes) - 23 links benchmark
export const TACTICAL_FIELD_16: NodeMap = {
  "Node_01": [700.0, 700.0],
  "Node_02": [700.0, 327.0],
  "Node_03": [700.0, 1073.0],
  "Node_04": [327.0, 700.0],
  "Node_05": [1073.0, 700.0],
  "Node_06": [389.0, 389.0],
  "Node_07": [1011.0, 389.0],
  "Node_08": [389.0, 1011.0],
  "Node_09": [1011.0, 1011.0],
  "Node_10": [78.0, 264.0],
  "Node_11": [1322.0, 264.0],
  "Node_12": [78.0, 1136.0],
  "Node_13": [1322.0, 1136.0],
  "Node_14": [700.0, 23.0],
  "Node_15": [700.0, 1577.0],
  "Node_16": [1601.0, 700.0]
};

// 2. Assignment 4x4 Grid (16 Nodes, 300m Spacing)
export const OFFICIAL_16_NODE_GRID: NodeMap = {
  "Node_01": [0.0, 0.0],
  "Node_02": [300.0, 0.0],
  "Node_03": [600.0, 0.0],
  "Node_04": [900.0, 0.0],
  "Node_05": [0.0, 300.0],
  "Node_06": [300.0, 300.0],
  "Node_07": [600.0, 300.0],
  "Node_08": [900.0, 300.0],
  "Node_09": [0.0, 600.0],
  "Node_10": [300.0, 600.0],
  "Node_11": [600.0, 600.0],
  "Node_12": [900.0, 600.0],
  "Node_13": [0.0, 900.0],
  "Node_14": [300.0, 900.0],
  "Node_15": [600.0, 900.0],
  "Node_16": [900.0, 900.0]
};

// 3. Linear Multi-Hop Chain (8 Nodes)
export const LINEAR_CHAIN_8: NodeMap = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [
    `Node_${String(i + 1).padStart(2, '0')}`,
    [100.0 + i * 280.0, 450.0] as [number, number]
  ])
);

// 4. Hexagonal Cellular Cluster (12 Nodes)
export const HEXAGONAL_CLUSTER_12: NodeMap = {
  "Node_01": [500.0, 500.0], // Core Base
  // Tier 1 - Inner Hexagon (6 nodes at radius 280m)
  "Node_02": [500.0, 220.0],
  "Node_03": [742.0, 360.0],
  "Node_04": [742.0, 640.0],
  "Node_05": [500.0, 780.0],
  "Node_06": [258.0, 640.0],
  "Node_07": [258.0, 360.0],
  // Tier 2 - Outer Outposts (5 nodes at radius 550m)
  "Node_08": [500.0, -50.0],
  "Node_09": [976.0, 225.0],
  "Node_10": [976.0, 775.0],
  "Node_11": [24.0, 775.0],
  "Node_12": [24.0, 225.0]
};

// Full list of presets matching the client requirements
export const TOPOLOGY_PRESETS: TopologyPreset[] = [
  {
    id: 'tactical-field-16',
    name: 'Tactical Field Deployment (16 Nodes)',
    description: 'Vaan Megam UI UX benchmark network with 23 communication links across 4 operational echelons',
    nodes: TACTICAL_FIELD_16,
    recommendedRange: 500.0
  },
  {
    id: 'assignment-16-grid',
    name: 'Assignment 4x4 Grid (16 Nodes, 300m Spacing)',
    description: 'Official assignment specification benchmark grid with 300m inter-node spacing and 500m transmission range',
    nodes: OFFICIAL_16_NODE_GRID,
    recommendedRange: 500.0
  },
  {
    id: 'linear-chain-8',
    name: 'Linear Multi-Hop Chain (8 Nodes)',
    description: 'Distance-2 pipeline testing 1-hop and 2-hop spacing constraints and periodic spatial reuse',
    nodes: LINEAR_CHAIN_8,
    recommendedRange: 350.0
  },
  {
    id: 'hexagonal-cluster-12',
    name: 'Hexagonal Cellular Cluster (12 Nodes)',
    description: 'High-density cellular cluster testing frequency and spatial reuse across radial sectors',
    nodes: HEXAGONAL_CLUSTER_12,
    recommendedRange: 400.0
  }
];

export function generateRandomTopology(count: number = 16, width: number = 900, height: number = 900, seed: number = 42): NodeMap {
  let s = seed;
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const result: NodeMap = {};
  for (let i = 1; i <= count; i++) {
    const pad = 60;
    const x = Math.round(pad + nextRand() * (width - 2 * pad));
    const y = Math.round(pad + nextRand() * (height - 2 * pad));
    result[`Node_${String(i).padStart(2, '0')}`] = [x, y];
  }
  return result;
}

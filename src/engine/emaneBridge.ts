import { ScheduleResult, EmaneConfig } from '../types/tdma';

export const DEFAULT_EMANE_CONFIG: EmaneConfig = {
  slotDurationMicroseconds: 1000, // 1 millisecond
  frameSlots: 5,
  frequencyHz: 2412000000, // 2.412 GHz (Channel 1)
  bandwidthHz: 5000000,    // 5 MHz
  txPowerDbm: 20.0,        // 20 dBm (100 mW)
  channelActivityPromiscuous: true
};

/**
 * Generate native EMANE TDMA Event XML configuration (tdmaschedule.xml)
 */
export function generateEmaneTdmaXml(result: ScheduleResult, config: EmaneConfig = DEFAULT_EMANE_CONFIG): string {
  const frameSlots = result.slotCount;
  const slotDuration = config.slotDurationMicroseconds;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<!DOCTYPE tdmaschedule SYSTEM "tdmaschedule.dtd">\n`;
  xml += `<!--\n`;
  xml += `  EMANE TDMA Schedule Event Profile\n`;
  xml += `  Generated dynamically by Vaan Megam Networks TDMA Brain\n`;
  xml += `  Total Radios: ${result.nodes.length} | Frame Length: ${frameSlots} slots | Slot Duration: ${slotDuration} us\n`;
  xml += `  Spatial Reuse: ${result.spatialReuseRatio}x | Algorithm: ${result.algorithmUsed.toUpperCase()}\n`;
  xml += `-->\n`;
  xml += `<tdmaschedule>\n`;
  xml += `  <structure>\n`;
  xml += `    <slot duration="${slotDuration}"/>\n`;
  xml += `    <frame slots="${frameSlots}"/>\n`;
  xml += `    <multiframe frames="1"/>\n`;
  xml += `  </structure>\n\n`;

  xml += `  <!-- Frequency & Power Allocation Profiles -->\n`;
  xml += `  <frequency index="0">${config.frequencyHz}</frequency>\n`;
  xml += `  <power index="0">${config.txPowerDbm.toFixed(1)}</power>\n\n`;

  xml += `  <!-- Timeslot Assignments per NEM Radio -->\n`;
  for (let s = 0; s < result.slotCount; s++) {
    const nodesInSlot = result.slotToNodes[s] || [];
    xml += `  <!-- Slot ${s} (Transmitters: ${nodesInSlot.join(', ')}) -->\n`;

    for (const node of nodesInSlot) {
      // Map node name to integer NEM ID (e.g. Node_01 -> NEM 1)
      const numMatch = node.match(/\d+$/);
      const nemId = numMatch ? parseInt(numMatch[0], 10) : 1;

      xml += `  <slot index="${s}" nem="${nemId}" rx="0" tx="1">\n`;
      xml += `    <frequency index="0"/>\n`;
      xml += `    <power index="0"/>\n`;
      xml += `  </slot>\n`;
    }
  }

  xml += `</tdmaschedule>\n`;
  return xml;
}

/**
 * Generate EMANE TDMA MAC XML configuration profile (tdmamac.xml)
 */
export function generateEmaneMacXml(result: ScheduleResult, config: EmaneConfig = DEFAULT_EMANE_CONFIG): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mac SYSTEM "mac.dtd">
<mac name="TDMA MAC Implementation">
  <!-- EMANE TDMA Radio Model Configuration (Vaan Megam Networks) -->
  <param name="pcrcurveuri" value="tdmapcr.xml"/>
  <param name="schedulefile" value="tdmaschedule.xml"/>
  <param name="slotduration" value="${config.slotDurationMicroseconds}"/>
  <param name="slotsperframe" value="${result.slotCount}"/>
  <param name="bandwidth" value="${config.bandwidthHz}"/>
  <param name="promiscuousmode" value="${config.channelActivityPromiscuous ? 'on' : 'off'}"/>
  <param name="enablepromiscuousmode" value="true"/>
  <param name="queue.depth" value="256"/>
  <param name="flowcontrolenable" value="true"/>
  <param name="jitter" value="0.0"/>
</mac>
`;
}

/**
 * Generate standalone Python bridge script (emane_bridge.py)
 */
export function generatePythonBridgeScript(result: ScheduleResult): string {
  return `#!/usr/bin/env python3
"""
Vaan Megam Networks — EMANE TDMA Schedule Event Bridge (Part 2)
Bridges the Python TDMA Network Brain schedule with the EMANE TDMA Radio Model.

Usage:
    python3 emane_bridge.py --schedule schedule.json --multicast 224.1.2.1:45703
"""

import sys
import json
import argparse
import socket
import xml.etree.ElementTree as ET

def load_schedule(json_path: str) -> dict:
    with open(json_path, 'r') as f:
        return json.load(f)

def build_emane_tdma_xml(schedule_data: dict, slot_duration_us: int = 1000) -> str:
    slot_count = schedule_data.get('slot_count', ${result.slotCount})
    slot_to_nodes = schedule_data.get('slot_to_nodes', {})
    
    root = ET.Element('tdmaschedule')
    structure = ET.SubElement(root, 'structure')
    ET.SubElement(structure, 'slot', duration=str(slot_duration_us))
    ET.SubElement(structure, 'frame', slots=str(slot_count))
    ET.SubElement(structure, 'multiframe', frames='1')
    
    freq = ET.SubElement(root, 'frequency', index='0')
    freq.text = '2412000000'
    pwr = ET.SubElement(root, 'power', index='0')
    pwr.text = '20.0'
    
    for slot_idx_str, nodes in slot_to_nodes.items():
        slot_idx = int(slot_idx_str)
        for node in nodes:
            # Extract NEM ID from node name (e.g. Node_01 -> 1)
            digits = ''.join(c for c in node if c.isdigit())
            nem_id = int(digits) if digits else 1
            
            slot_elem = ET.SubElement(root, 'slot', index=str(slot_idx), nem=str(nem_id), rx='0', tx='1')
            ET.SubElement(slot_elem, 'frequency', index='0')
            ET.SubElement(slot_elem, 'power', index='0')
            
    return ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')

def publish_emane_event(xml_payload: str, mcast_group: str = '224.1.2.1', port: int = 45703):
    """
    Publish TDMA Schedule Event over EMANE Event Multicast Channel
    """
    print(f"[EMANE Bridge] Transmitting TDMA schedule event to {mcast_group}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    
    try:
        sock.sendto(xml_payload.encode('utf-8'), (mcast_group, port))
        print("[EMANE Bridge] Successfully published TDMA schedule event to EMANE event daemon!")
    except Exception as e:
        print(f"[EMANE Bridge] Note: Multicast send failed ({e}). Check EMANE daemon status.")
    finally:
        sock.close()

def main():
    parser = argparse.ArgumentParser(description="EMANE TDMA Event Bridge")
    parser.add_argument('--schedule', default='schedule.json', help='Path to generated schedule.json')
    parser.add_argument('--out-xml', default='tdmaschedule.xml', help='Output EMANE XML schedule')
    parser.add_argument('--publish', action='store_true', help='Publish event to running EMANE daemon via multicast')
    args = parser.parse_args()

    try:
        data = load_schedule(args.schedule)
    except FileNotFoundError:
        print(f"[WARN] {args.schedule} not found, generating sample from memory...")
        data = {'slot_count': ${result.slotCount}, 'slot_to_nodes': ${JSON.stringify(result.slotToNodes)}}

    xml_content = build_emane_tdma_xml(data)
    with open(args.out_xml, 'w') as f:
        f.write(xml_content)
    print(f"[EMANE Bridge] Exported EMANE schedule XML to {args.out_xml}")

    if args.publish:
        publish_emane_event(xml_content)

if __name__ == '__main__':
    main()
`;
}

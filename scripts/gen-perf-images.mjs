// Generate deterministic placeholder JPEGs for the frozen perf fixture.
// Produces valid, decodable JPEGs of a target byte size by padding a real 1x1
// JPEG with a COM (comment) segment. Same-origin + fixed bytes = deterministic;
// the byte size models realistic image transfer under Lighthouse simulated throttling.
//
// Usage: node scripts/gen-perf-images.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'apps', 'web', 'public', 'perf-fixtures');

// A minimal valid 1x1 baseline JPEG.
const BASE_1x1 = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
    'AAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==',
  'base64',
);

/** Insert a COM segment (FF FE len payload) right after the SOI marker (first 2 bytes)
 *  to inflate the file to ~targetBytes while keeping it a valid JPEG. */
function makeJpegOfSize(targetBytes) {
  const soi = BASE_1x1.subarray(0, 2); // FFD8
  const rest = BASE_1x1.subarray(2);
  const overhead = soi.length + rest.length + 4; // 4 = marker(2) + length(2)
  let payloadLen = targetBytes - overhead;
  if (payloadLen < 0) payloadLen = 0;
  if (payloadLen > 65533) payloadLen = 65533; // single COM segment max
  const segLen = payloadLen + 2; // length field counts itself

  const header = Buffer.from([0xff, 0xfe, (segLen >> 8) & 0xff, segLen & 0xff]);
  const payload = Buffer.alloc(payloadLen, 0x20); // deterministic fill (spaces)
  return Buffer.concat([soi, header, payload, rest]);
}

mkdirSync(outDir, { recursive: true });

const thumbnail = makeJpegOfSize(60_000); // ~60KB realistic content thumbnail
const avatar = makeJpegOfSize(8_000); // ~8KB avatar

writeFileSync(join(outDir, 'thumbnail.jpg'), thumbnail);
writeFileSync(join(outDir, 'avatar.jpg'), avatar);

console.log(`Wrote ${outDir}/thumbnail.jpg (${thumbnail.length} bytes)`);
console.log(`Wrote ${outDir}/avatar.jpg (${avatar.length} bytes)`);

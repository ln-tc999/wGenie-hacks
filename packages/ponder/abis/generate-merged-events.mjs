import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUSES_DIR = path.join(__dirname, 'fuses');
const OUTPUT_FILE = path.join(__dirname, 'all-fuses-events.ts');

// Get all ABI files
const abiFiles = fs.readdirSync(FUSES_DIR).filter(f => f.endsWith('.abi.ts'));

const allEvents = new Map(); // Use Map to deduplicate by event signature

for (const file of abiFiles) {
  const filePath = path.join(FUSES_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract the ABI array from the TypeScript file
  const abiMatch = content.match(/export const \w+ = (\[[\s\S]*\]) as const/);
  if (!abiMatch) {
    console.log(`Could not parse ABI from ${file}`);
    continue;
  }

  try {
    const abi = JSON.parse(abiMatch[1]);

    // Filter only events
    const events = abi.filter(item => item.type === 'event');

    for (const event of events) {
      // Create a unique key based on event name and input types
      const inputTypes = event.inputs ? event.inputs.map(i => `${i.type}${i.indexed ? '-indexed' : ''}`).join(',') : '';
      const key = `${event.name}(${inputTypes})`;

      if (!allEvents.has(key)) {
        allEvents.set(key, event);
      }
    }
  } catch (err) {
    console.log(`Error parsing ${file}: ${err.message}`);
  }
}

// Sort events by name for consistent output
const sortedEvents = Array.from(allEvents.values()).sort((a, b) => a.name.localeCompare(b.name));

console.log(`Found ${sortedEvents.length} unique events from ${abiFiles.length} ABI files`);

// Generate TypeScript file
const tsContent = `import { Abi } from 'viem';

export const allFusesEventsAbi = ${JSON.stringify(sortedEvents, null, 2)} as const satisfies Abi;
`;

fs.writeFileSync(OUTPUT_FILE, tsContent);
console.log(`Saved merged events ABI to ${OUTPUT_FILE}`);

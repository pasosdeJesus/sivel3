#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// --- Configuration ---
// Source directory for Hardhat compilation artifacts
const HARDHAT_ARTIFACTS_PATH = './artifacts/contracts';

// Destination directory for the ABIs in the Next.js application
const NEXTJS_ABI_PATH = '../nextjs/abis';

// --- Main Script ---

console.log("🔄 Syncing contract ABIs to the Next.js app...");

// Ensure the destination ABI directory exists
if (!fs.existsSync(NEXTJS_ABI_PATH)) {
  console.log(`Creating directory: ${NEXTJS_ABI_PATH}`)
  fs.mkdirSync(NEXTJS_ABI_PATH, { recursive: true });
}

/**
 * Recursively walks a directory to find all files within it.
 * @param {string} dir - The directory to walk.
 * @returns {string[]} A flat array of full file paths.
 */
function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // If it's a directory, recurse into it
      results = results.concat(walkDir(filePath));
    } else {
      // It's a file; add it to the list
      if (file.endsWith('.json') && !file.includes('.dbg.')) {
        results.push(filePath);
      }
    }
  });

  return results;
}

try {
  // Find all contract artifact JSON files (excluding debug files)
  const artifactFiles = walkDir(HARDHAT_ARTIFACTS_PATH);

  if (artifactFiles.length === 0) {
    console.warn("No contract artifacts found. Did you compile your contracts?");
  }

  artifactFiles.forEach(filepath => {
    // Read the full artifact file
    const artifact = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    // Extract the contract name from the filename
    const filename = path.basename(filepath);
    const contractName = filename.replace('.json', '');

    // Define the destination path for the ABI
    const abiPath = path.join(NEXTJS_ABI_PATH, `${contractName}.json`);

    // Write just the ABI portion to the destination file
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✅ Copied ABI for ${contractName} to ${abiPath}`);
  });

  console.log("\n✨ ABI sync complete!\n");

} catch (error) {
  if (error.code === 'ENOENT' && error.path === HARDHAT_ARTIFACTS_PATH) {
    console.error("❌ Error: Hardhat artifacts directory not found.");
    console.error("   Please run `npx hardhat compile` in the 'apps/hardhat' directory first.");
  } else {
    console.error("\n❌ An unexpected error occurred during ABI sync:", error);
  }
  process.exit(1);
}

#!/usr/bin/env node
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const ABI_PATH = path.join(__dirname, "../../nextjs/abis/PasosDeJesusCredentials.json");

function usage() {
  console.log("Usage: node adminPdJCredentials.js <command> [args]");
  console.log("");
  console.log("Commands:");
  console.log("  grant-minter --network <celo|base> --address <wallet>");
  console.log("  revoke-minter --network <celo|base> --address <wallet>");
  console.log("  register-type --network <celo|base> --site <name> --type <name> --display <name> --soulbound <true|false> [--course-id <id>] [--premium <true|false>]");
  console.log("  set-max-supply --network <celo|base> --token-id <id> --max <n>");
  console.log("  set-site-base-uri --network <celo|base> --site <name> --uri <url>");
  console.log("  list-types --network <celo|base>");
  console.log("");
  console.log("Environment: CREDENTIALS_PRIVATE_KEY must be set in apps/.env");
}

function getProvider(network) {
  const rpcs = {
    celo: process.env.NEXT_PUBLIC_RPC_URL || "https://forno.celo.org",
    celoSepolia: process.env.NEXT_PUBLIC_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
    base: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    baseSepolia: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://sepolia.base.org",
  };
  return new ethers.JsonRpcProvider(rpcs[network] || rpcs.celoSepolia);
}

function getContractAddress(network) {
  const deploymentsDir = path.join(__dirname, "../deployments");
  const file = path.join(deploymentsDir, `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployment not found for ${network}. Run deployPdJCredentials.ts first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")).address;
}

async function getContract(network) {
  const abi = JSON.parse(fs.readFileSync(ABI_PATH, "utf-8"));
  const provider = getProvider(network);
  const adminKey = process.env.CREDENTIALS_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const signer = new ethers.Wallet(adminKey, provider);
  const address = getContractAddress(network);
  return new ethers.Contract(address, abi, signer);
}

async function grantMinter(network, address) {
  const c = await getContract(network);
  const MINTER_ROLE = await c.MINTER_ROLE();
  const tx = await c.grantRole(MINTER_ROLE, address);
  await tx.wait();
  console.log(`✅ MINTER_ROLE granted to ${address} on ${network}`);
  console.log(`   TX: ${tx.hash}`);
}

async function revokeMinter(network, address) {
  const c = await getContract(network);
  const MINTER_ROLE = await c.MINTER_ROLE();
  const tx = await c.revokeRole(MINTER_ROLE, address);
  await tx.wait();
  console.log(`✅ MINTER_ROLE revoked from ${address} on ${network}`);
  console.log(`   TX: ${tx.hash}`);
}

async function registerType(network, site, type, display, soulbound, courseId, premium) {
  const c = await getContract(network);
  const tx = await c.registerCredentialType(site, type, display, soulbound, courseId || 0, premium || false);
  const receipt = await tx.wait();

  // Parse event to get tokenId
  const iface = new ethers.Interface(JSON.parse(fs.readFileSync(ABI_PATH, "utf-8")));
  const log = receipt.logs.find(l => {
    try { return iface.parseLog(l)?.name === "CredentialTypeRegistered"; } catch { return false; }
  });
  const parsed = iface.parseLog(log);
  const tokenId = parsed.args.tokenId;

  console.log(`✅ Credential type registered on ${network}:`);
  console.log(`   tokenId: ${tokenId}`);
  console.log(`   site: ${site}`);
  console.log(`   type: ${type}`);
  console.log(`   name: ${display}`);
  console.log(`   soulbound: ${soulbound}`);
  if (courseId) console.log(`   courseId: ${courseId}`);
  if (premium) console.log(`   premium: ${premium}`);
  console.log(`   TX: ${tx.hash}`);
}

async function setMaxSupply(network, tokenId, max) {
  const c = await getContract(network);
  const tx = await c.setMaxSupply(tokenId, max);
  await tx.wait();
  console.log(`✅ maxSupply for token ${tokenId} set to ${max} on ${network}`);
  console.log(`   TX: ${tx.hash}`);
}

async function setSiteBaseURI(network, site, uri) {
  const c = await getContract(network);
  const tx = await c.setSiteBaseURI(site, uri);
  await tx.wait();
  console.log(`✅ siteBaseURI for "${site}" updated on ${network}: ${uri}`);
  console.log(`   TX: ${tx.hash}`);
}

async function listTypes(network) {
  const c = await getContract(network);
  const nextId = await c.nextTokenId();
  console.log(`Credential types on ${network}:`);
  console.log(`nextTokenId: ${nextId}`);
  console.log("");
  console.log("tokenId | site    | type               | name         | soulbound | maxSupply");
  console.log("--------|---------|--------------------|--------------|-----------|----------");
  for (let i = 1; i < Number(nextId); i++) {
    try {
      const [siteHash, typeHash, name, maxS, supply, sb] = await Promise.all([
        c.tokenSiteHash(i),
        c.tokenTypeHash(i),
        c.tokenNames(i),
        c.maxSupply(i),
        c.totalSupply(i),
        c.isSoulbound(i),
      ]);
      if (siteHash === "0x0000000000000000000000000000000000000000000000000000000000000000") continue;
      const siteNames = {
        [ethers.id("learn.tg")]: "learn.tg",
        [ethers.id("sivel.xyz")]: "sivel.xyz",
        [ethers.id("stable-sl.pdJ.app")]: "stable-sl",
      };
      const typeNames = {
        [ethers.id("course_completion")]: "course_completion",
        [ethers.id("role")]: "role",
        [ethers.id("achievement")]: "achievement",
        [ethers.id("nft")]: "nft",
      };
      const site = siteNames[siteHash] || siteHash.slice(0, 10);
      const type = typeNames[typeHash] || typeHash.slice(0, 10);
      console.log(`${String(i).padEnd(7)} | ${site.padEnd(7)} | ${type.padEnd(18)} | ${name.padEnd(12)} | ${String(sb).padEnd(9)} | ${maxS}`);
    } catch (e) {
      // Token not fully configured
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) { usage(); process.exit(1); }

  const command = args[0];
  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : null;
  };

  try {
    switch (command) {
      case "grant-minter": {
        const net = getArg("--network");
        const addr = getArg("--address");
        if (!net || !addr) throw new Error("--network and --address required");
        await grantMinter(net, addr);
        break;
      }
      case "revoke-minter": {
        const net = getArg("--network");
        const addr = getArg("--address");
        if (!net || !addr) throw new Error("--network and --address required");
        await revokeMinter(net, addr);
        break;
      }
      case "register-type": {
        const net = getArg("--network");
        const site = getArg("--site");
        const type = getArg("--type");
        const display = getArg("--display");
        const soulbound = getArg("--soulbound") === "true";
        const courseId = getArg("--course-id");
        const premium = getArg("--premium") === "true";
        if (!net || !site || !type || !display) throw new Error("--network, --site, --type, --display required");
        await registerType(net, site, type, display, soulbound, courseId, premium);
        break;
      }
      case "set-max-supply": {
        const net = getArg("--network");
        const tokenId = getArg("--token-id");
        const max = getArg("--max");
        if (!net || !tokenId || !max) throw new Error("--network, --token-id, --max required");
        await setMaxSupply(net, parseInt(tokenId), parseInt(max));
        break;
      }
      case "set-site-base-uri": {
        const net = getArg("--network");
        const site = getArg("--site");
        const uri = getArg("--uri");
        if (!net || !site || !uri) throw new Error("--network, --site, --uri required");
        await setSiteBaseURI(net, site, uri);
        break;
      }
      case "list-types": {
        const net = getArg("--network") || "celoSepolia";
        await listTypes(net);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        usage();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message || error);
    process.exit(1);
  }
}

main();

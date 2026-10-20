import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  // Get the deployed contract from the deployments directory
  const network = process.env.HARDHAT_NETWORK || "celoSepolia";
  const deploymentPath = `../deployments/PasosDeJesusCredentials/${network}.json`;

  let deployment;
  try {
    deployment = require(deploymentPath);
  } catch {
    console.error(`Deployment not found at ${deploymentPath}`);
    console.log("Run deployPdJCredentials.ts first.");
    process.exit(1);
  }

  const address = deployment.address;
  console.log(`Verifying PasosDeJesusCredentials on ${network}`);
  console.log(`Address: ${address}`);
  console.log("");

  const contract = await ethers.getContractAt(
    "PasosDeJesusCredentials",
    address
  );

  // 1. Basic sanity
  const nextId = await contract.nextTokenId();
  console.log(`✅ nextTokenId: ${nextId}`);

  // 2. Roles
  const deployer = (await ethers.getSigners())[0];
  const adminRole = await contract.DEFAULT_ADMIN_ROLE();
  const minterRole = await contract.MINTER_ROLE();

  const deployerIsAdmin = await contract.hasRole(adminRole, deployer.address);
  console.log(
    `Deployer is admin: ${deployerIsAdmin} (${deployer.address})`
  );

  // 3. Enumerate registered types
  console.log("");
  console.log("Registered credential types:");
  console.log("");

  for (let i = 1; i < Number(nextId); i++) {
    try {
      const [siteHash, typeHash, name, maxS, supply, sb] = await Promise.all([
        contract.tokenSiteHash(i),
        contract.tokenTypeHash(i),
        contract.tokenNames(i),
        contract.maxSupply(i),
        contract.totalSupply(i),
        contract.isSoulbound(i),
      ]);

      if (
        siteHash ===
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      )
        continue;

      console.log(`tokenId ${i}: ${name}`);
      console.log(`  soulbound: ${sb}, maxSupply: ${maxS}, totalSupply: ${supply}`);
      console.log(`  siteHash: ${siteHash}`);
      console.log(`  typeHash: ${typeHash}`);
      console.log("");
    } catch {
      // Not fully configured
    }
  }

  // 4. URI check for first token
  if (nextId > 1) {
    try {
      const uri = await contract.uri(1);
      console.log(`URI for tokenId 1: ${uri}`);
    } catch {
      console.log("URI for tokenId 1: (not configured yet)");
    }
  }

  console.log("✅ Verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const network = process.env.HARDHAT_NETWORK || "celoSepolia";
  const netFile = network === "celo" ? "celo" : "celoSepolia";
  const deploymentPath = `../deployments/SIVeL3PreAlertMarket/V1/${netFile}.json`;

  let deployment;
  try {
    deployment = require(deploymentPath);
  } catch {
    console.error(`Deployment not found at ${deploymentPath}`);
    console.log("Run deployPreAlertMarket.ts first.");
    process.exit(1);
  }

  const address = deployment.address;
  console.log(`Verifying SIVeL3PreAlertMarket on ${network}`);
  console.log(`Address: ${address}`);
  console.log("");

  const contract = await ethers.getContractAt(
    "SIVeL3PreAlertMarket",
    address,
  );

  // 1. Basic sanity
  const counter = await contract.preAlertCounter();
  console.log(`✅ preAlertCounter: ${counter}`);

  const price = await contract.PRICE_USDT();
  console.log(`✅ PRICE_USDT: ${price} (${ethers.formatUnits(price, 6)} USDT)`);

  const usdtToken = await contract.usdtToken();
  console.log(`✅ USDT token: ${usdtToken}`);

  // 2. Roles
  const deployer = (await ethers.getSigners())[0];
  const adminRole = await contract.DEFAULT_ADMIN_ROLE();
  const agentRole = await contract.AGENT_ROLE();

  const deployerIsAdmin = await contract.hasRole(adminRole, deployer.address);
  console.log(`✅ Deployer is admin: ${deployerIsAdmin} (${deployer.address})`);

  const agentCount = await contract.getRoleMemberCount(agentRole);
  for (let i = 0n; i < agentCount; i++) {
    const member = await contract.getRoleMember(agentRole, i);
    console.log(`✅ AGENT_ROLE member: ${member}`);
  }

  // 3. Publish a test pre-alert (only if SMOKE_TEST_WRITE=true, skip on mainnet)
  console.log("");
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const smokeWrite = process.env.SMOKE_TEST_WRITE === "true";

  if (smokeWrite && chainId !== 42220n) {
    console.log("Testing publishPreAlert (SMOKE_TEST_WRITE=true)...");
    const agentKey = process.env.CREDENTIALS_PRIVATE_KEY;
    if (!agentKey) {
      console.log("⚠️  CREDENTIALS_PRIVATE_KEY not set — skipping publish test");
    } else {
      const provider = ethers.provider;
      const agent = new ethers.Wallet(agentKey, provider);
      const agentAddress = await agent.getAddress();
      const isAgent = await contract.hasRole(agentRole, agentAddress);
      if (!isAgent) {
        console.log(`⚠️  ${agentAddress} lacks AGENT_ROLE — cannot test publish`);
      } else {
        const eventHash = ethers.id(`smoke-test-${Date.now()}`);
        const locationHash = ethers.id("smoke-loc");
        const ts = Math.floor(Date.now() / 1000) - 60;
        const tx = await contract.connect(agent).publishPreAlert(eventHash, locationHash, ts);
        const receipt = await tx.wait();
        console.log(`✅ Published pre-alert #${await contract.preAlertCounter()} (tx: ${receipt.hash})`);
        const newId = await contract.preAlertCounter();
        const pa = await contract.preAlerts(newId);
        console.log(`   eventHash: ${pa.eventHash === eventHash ? "✅ match" : "❌ mismatch"}`);
        console.log(`   publisher: ${pa.publisher}`);
        console.log(`   active: ${pa.active}`);
      }
    }
  } else if (chainId === 42220n) {
    console.log("⏭️  Skipping publish test (mainnet — never writes)");
  } else {
    console.log("⏭️  Skipping publish test (set SMOKE_TEST_WRITE=true to enable)");
  }

  // 4. Test pause/unpause (admin only)
  console.log("");
  console.log("Testing pause/unpause...");
  try {
    const txPause = await contract.pause();
    await txPause.wait();
    console.log("✅ Contract paused");

    const isPaused = await contract.paused();
    console.log(`   paused: ${isPaused}`);

    const txUnpause = await contract.unpause();
    await txUnpause.wait();
    console.log("✅ Contract unpaused");
  } catch (e) {
    console.log(`❌ pause/unpause failed: ${e}`);
  }

  // 5. Enumerate pre-alerts
  console.log("");
  console.log(`Pre-alerts stored: ${counter}`);
  for (let i = 1n; i <= counter; i++) {
    if (i > 5n) {
      console.log(`   ... and ${counter - 5n} more`);
      break;
    }
    const pa = await contract.preAlerts(i);
    console.log(`   #${i}: active=${pa.active} converted=${pa.converted} buyer=${pa.buyer}`);
  }

  console.log("");
  console.log("✅ Smoke test complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

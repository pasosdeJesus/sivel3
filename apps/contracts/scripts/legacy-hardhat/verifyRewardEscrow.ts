import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const network = process.env.HARDHAT_NETWORK || "celoSepolia";
  const netFile = network === "celo" ? "celo" : "celoSepolia";
  const deploymentPath = `../deployments/SIVeL3RewardEscrow/V1/${netFile}.json`;

  let deployment;
  try {
    deployment = require(deploymentPath);
  } catch {
    console.error(`Deployment not found at ${deploymentPath}`);
    console.log("Run deployRewardEscrow.ts first.");
    process.exit(1);
  }

  const address = deployment.address;
  console.log(`Verifying SIVeL3RewardEscrow on ${network}`);
  console.log(`Address: ${address}`);
  console.log("");

  const contract = await ethers.getContractAt("SIVeL3RewardEscrow", address);

  // 1. Basic sanity
  const contractBalance = await contract.balance();
  console.log(`✅ Balance: ${ethers.formatUnits(contractBalance, 6)} USDT`);

  const usdtToken = await contract.usdtToken();
  console.log(`✅ USDT token: ${usdtToken}`);

  // 2. Roles
  const deployer = (await ethers.getSigners())[0];
  const adminRole = await contract.DEFAULT_ADMIN_ROLE();
  const backendRole = await contract.BACKEND_ROLE();

  const deployerIsAdmin = await contract.hasRole(adminRole, deployer.address);
  console.log(`✅ Deployer is admin: ${deployerIsAdmin} (${deployer.address})`);

  const backendWallet = deployment.backendWallet;
  if (backendWallet) {
    const backendHasRole = await contract.hasRole(backendRole, backendWallet);
    console.log(`✅ Backend has BACKEND_ROLE: ${backendHasRole} (${backendWallet})`);
  } else {
    console.log('⚠️  No backendWallet in deployment file');
  }

  // 3. Test deposit + release (only with SMOKE_TEST_WRITE=true on testnet)
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const smokeWrite = process.env.SMOKE_TEST_WRITE === "true";

  if (smokeWrite && chainId !== 42220n) {
    // Check USDT balance of deployer
    const usdt = await ethers.getContractAt("IERC20", usdtToken);
    const deployerBalance = await usdt.balanceOf(deployer.address);
    console.log(`   Deployer USDT: ${ethers.formatUnits(deployerBalance, 6)}`);

    if (deployerBalance > 0n) {
      // Approve and deposit
      const depositAmount = ethers.parseUnits("1", 6);
      await usdt.approve(address, depositAmount);
      const txDep = await contract.deposit(depositAmount);
      await txDep.wait();
      console.log(`✅ Deposited 1 USDT`);

      // Release to a test address
      const testRecipient = deployer.address;
      const releaseAmount = ethers.parseUnits("0.5", 6);
      const txRel = await contract.releasePayment(testRecipient, releaseAmount);
      await txRel.wait();
      console.log(`✅ Released 0.5 USDT to ${testRecipient}`);
    } else {
      console.log("⚠️  No USDT — skipping deposit/release test");
    }
  } else if (chainId === 42220n) {
    console.log("⏭️  Skipping write tests (mainnet — never writes)");
  } else {
    console.log("⏭️  Skipping write tests (set SMOKE_TEST_WRITE=true to enable)");
  }

  console.log("");
  console.log("✅ Smoke test complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

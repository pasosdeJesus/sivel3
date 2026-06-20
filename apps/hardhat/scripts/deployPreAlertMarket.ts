import { ethers } from "hardhat";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    `Deploying SIVeL3PreAlertMarket with the account: ${deployer.address}`
  );

  const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS;
  const agentWallet = process.env.AGENT_WALLET_ADDRESS;

  if (!usdtAddress) {
    throw new Error("NEXT_PUBLIC_USDT_ADDRESS not set");
  }
  if (!agentWallet) {
    throw new Error("AGENT_WALLET_ADDRESS not set");
  }

  console.log("  USDT address:", usdtAddress);
  console.log("  Agent wallet:", agentWallet);

  const factory = await ethers.getContractFactory("SIVeL3PreAlertMarket");
  const contract = await factory.deploy(usdtAddress, agentWallet);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`✅ SIVeL3PreAlertMarket deployed to: ${address}`);
  console.log(`   Chain ID: ${chainId}`);
  console.log(`   Transaction: ${contract.deploymentTransaction()?.hash}`);

  // Save deployment address (modern pattern: hierarchical)
  const deploymentsDir = path.join(
    __dirname,
    "../deployments/SIVeL3PreAlertMarket/V1",
  );
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName =
    chainId === 42220
      ? "celo"
      : chainId === 11142220
        ? "celoSepolia"
        : `chain-${chainId}`;

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  const deployment = {
    contract: "SIVeL3PreAlertMarket",
    address,
    chainId,
    network: networkName,
    transactionHash: contract.deploymentTransaction()?.hash,
    deployedAt: new Date().toISOString(),
    usdtAddress,
    agentWallet,
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log(`   Deployment saved to ${deploymentFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

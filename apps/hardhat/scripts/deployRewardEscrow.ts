import { ethers } from "hardhat";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    `Deploying SIVeL3RewardEscrow with the account: ${deployer.address}`
  );

  const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS;
  const backendWallet =
    process.env.AGENT_WALLET_ADDRESS || deployer.address;
  // BACKEND_ROLE: sivel.xyz backend wallet. Use sivel3agent wallet for Sepolia.

  if (!usdtAddress) {
    throw new Error("NEXT_PUBLIC_USDT_ADDRESS not set");
  }

  console.log("  USDT address:", usdtAddress);
  console.log("  Backend wallet:", backendWallet);

  const factory = await ethers.getContractFactory("SIVeL3RewardEscrow");
  const contract = await factory.deploy(usdtAddress, backendWallet);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`✅ SIVeL3RewardEscrow deployed to: ${address}`);
  console.log(`   Chain ID: ${chainId}`);
  console.log(`   Transaction: ${contract.deploymentTransaction()?.hash}`);

  // Save deployment address (hierarchical V1)
  const deploymentsDir = path.join(
    __dirname,
    "../deployments/SIVeL3RewardEscrow/V1",
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
    contract: "SIVeL3RewardEscrow",
    address,
    chainId,
    network: networkName,
    transactionHash: contract.deploymentTransaction()?.hash,
    deployedAt: new Date().toISOString(),
    usdtAddress,
    backendWallet,
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

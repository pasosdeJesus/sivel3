import { ethers } from "hardhat";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

async function main() {
  const adminKey = process.env.CREDENTIALS_PRIVATE_KEY;
  if (!adminKey) {
    throw new Error("CREDENTIALS_PRIVATE_KEY not set in apps/.env");
  }

  const provider = ethers.provider;
  const admin = new ethers.Wallet(adminKey, provider);
  console.log(`Deploying PasosDeJesusCredentials with admin: ${admin.address}`);

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // Base URI - each site overrides with siteBaseURI
  const baseURI = "https://sivel.xyz/api/credential/";

  const factory = await ethers.getContractFactory(
    "PasosDeJesusCredentials",
    admin
  );
  const contract = await factory.deploy(baseURI);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`PasosDeJesusCredentials deployed to: ${address}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Transaction: ${contract.deploymentTransaction()?.hash}`);

  // Save deployment address
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName =
    chainId === 42220
      ? "celo"
      : chainId === 11142220
        ? "celoSepolia"
        : chainId === 8453
          ? "base"
          : chainId === 84532
            ? "baseSepolia"
            : `chain-${chainId}`;

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  const deployment = {
    contract: "PasosDeJesusCredentials",
    address,
    chainId,
    network: networkName,
    transactionHash: contract.deploymentTransaction()?.hash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log(`Deployment saved to ${deploymentFile}`);

  // Configure siteBaseURIs per environment
  const isTestnet = chainId === 11142220 || chainId === 84532;
  const port = isTestnet ? ':9001' : '';
  const sites = ['sivel.xyz', 'learn.tg', 'stable-sl.pdJ.app'];
  for (const site of sites) {
    const uri = `https://${site}${port}/api/credential/`;
    const tx = await contract.setSiteBaseURI(site, uri);
    await tx.wait();
    console.log(`  siteBaseURI ${site}: ${uri}`);
  }

  console.log(`Deployment saved to ${deploymentFile}`);
  console.log("Next.js reads this file via: ../hardhat/deployments/${networkName}.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

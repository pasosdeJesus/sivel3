
const { ethers } = require("hardhat");

async function main() {
  const [regionId, regionName] = process.argv.slice(2);

  if (!regionId || !regionName) {
    console.error("Por favor, proporciona un ID y un nombre para la región.");
    console.error("Uso: npx hardhat run scripts/setRegions.js -- <ID> <NOMBRE>");
    process.exit(1);
  }

  const regionalDonation = await ethers.getContract("RegionalDonation");
  console.log(`Contrato RegionalDonation obtenido en: ${regionalDonation.address}`);

  console.log(`Añadiendo/actualizando región ${regionId}: ${regionName}...`);
  const tx = await regionalDonation.setRegion(regionId, regionName);
  await tx.wait();
  
  const storedName = await regionalDonation.regionNames(regionId);
  console.log(`Región ${regionId} guardada con el nombre: '${storedName}'. Transacción: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

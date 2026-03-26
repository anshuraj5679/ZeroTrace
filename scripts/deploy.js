const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const ZeroTrace = await hre.ethers.getContractFactory("ZeroTrace");

  const zusdc = await MockERC20.deploy("ZeroTrace USD Coin", "ZUSDC", 6);
  await zusdc.waitForDeployment();

  const zeth = await MockERC20.deploy("ZeroTrace Ether", "ZETH", 18);
  await zeth.waitForDeployment();

  const zeroTrace = await ZeroTrace.deploy(deployer.address);
  await zeroTrace.waitForDeployment();

  const deploymentRecord = {
    operator: deployer.address,
    ZeroTrace: await zeroTrace.getAddress(),
    ZUSDC: await zusdc.getAddress(),
    ZETH: await zeth.getAddress()
  };

  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
    : {};

  existing[network] = deploymentRecord;
  fs.writeFileSync(deploymentsPath, JSON.stringify(existing, null, 2));

  console.log("Network:", network);
  console.log("Operator:", deployer.address);
  console.log("ZeroTrace:", deploymentRecord.ZeroTrace);
  console.log("ZUSDC:", deploymentRecord.ZUSDC);
  console.log("ZETH:", deploymentRecord.ZETH);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


const { getNamedAccounts, ethers } = require("hardhat");


async function main() {
const { deployer } = await getNamedAccounts();
const fundMe = await ethers.getContract("FundMe", deployer);

console.log(`Withdrawing from contract: + ${fundMe.address}`);

const txResponse = await fundMe.withdraw();
await txResponse.wait();
console.log("Withdrewn!")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  
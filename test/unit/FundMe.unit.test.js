const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");

describe("FundMe", async function() {
  let fundMe;
  let deployer;
  let mockV3Aggregator;
  let sendValue = ethers.utils.parseEther("1"); // 1 ETH
  beforeEach(async function() {
    // deploy our fundMe contract using Hardhat-deploy
    // const accounts = await ethers.getSigners();
    //const accountZero = accounts[0];

    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("FundMe", deployer);
    mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });
  describe("constructor", async function() {
    it("sets the aggregator addresses corrrectly", async function() {
      const response = await fundMe.priceFeed();
      assert.equal(response, mockV3Aggregator.address);
    });
  });

  describe("fund", async function() {
    it("Fails if you don't send enough ETH", async function() {
      await expect(fundMe.fund()).to.be.revertedWith(
        "You need to spend more ETH!"
      );
    });

    it("updated the amount funded data structure", async function() {
      await fundMe.fund({ value: sendValue });
      const response = await fundMe.addressToAmountFunded(deployer);
      assert.equal(response.toString(), sendValue.toString());
    });

    it("Adds funder to array of funders", async function() {
      await fundMe.fund({ value: sendValue });
      const funder = await fundMe.funders(0);
      assert.equal(funder.toString(), deployer);
    });
  });

  describe("withdraw", async function() {
    beforeEach(async function() {
      await fundMe.fund({ value: sendValue });
    });

    it("Withdraw ETH from a single funder", async function() {
      // Arrange
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );

      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      // Act
      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );

      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        endingDeployerBalance.add(gasCost).toString(),
        startingDeployerBalance.add(startingFundMeBalance).toString()
      );
    });

    it("Withdraw from multiple funders", async function() {
      const accounts = await ethers.getSigners();

      // Arrange
      for (let i = 0; i < 6; i++) {
        const fundMeConnectedContract = await fundMe.connect(accounts[i]);
        await fundMeConnectedContract.fund({ value: sendValue });
      }

      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );

      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      // Act
      const tranactionResponse = await fundMe.withdraw();
      const transactionReceipt = await tranactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        endingDeployerBalance.add(gasCost).toString(),
        startingDeployerBalance.add(startingFundMeBalance).toString()
      );

      // Did funders reseted?
      await expect(fundMe.funders({ value: 0 })).to.be.reverted;

      for (let i; i < 6; i++) {
        assert.equal(
          await fundMe.addressToAmountFunded(accounts[i].address),
          0
        );
      }
    });

    it("Only allows the owner can withdraw", async function() {
      // Arrange
      const accounts = await ethers.getSigners();
      const attacker = accounts[1];
      const attackerConnectedContract = await fundMe.connect(attacker);
      await expect(attackerConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner");
    });
  });
});

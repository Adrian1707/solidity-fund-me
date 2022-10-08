const { deployments, ethers, getNamedAccounts } = require('hardhat')
const { assert, expect } = require('chai')

describe("FundMe", async function() {
  let fundMe
  let deployer
  let mockV3Aggregator
  const sendValue = ethers.utils.parseEther('1')
  beforeEach(async function() {
    await deployments.fixture(["all"])
    deployer = (await getNamedAccounts()).deployer

    // gets the most recently deployed FundMe contract
    fundMe = await ethers.getContract("FundMe", deployer)
    mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
  })

  describe("constructor", async function() {
    it("sets the aggregator addresses correctly", async function(){
      const response = await fundMe.s_priceFeed()

      assert.equal(response, mockV3Aggregator.address)
    })
  })

  describe("fund", async function() {
    it("does not progress when user needs to spend more eth", async function() {
      await expect(fundMe.fund({value: 1})).to.be.revertedWith("You need to spend more ETH!");
    })

    it("updates the amount funded data structure", async function() {
      const response = await fundMe.fund({value: sendValue})
      const addressToAmountFunded = await fundMe.s_addressToAmountFunded(deployer)
      assert.equal(addressToAmountFunded.toString(), sendValue)
    })

    it("adds funder to the funders array", async function() {
      await fundMe.fund({value: sendValue})
      const funder = await fundMe.s_funders(0)
      assert.equal(funder, deployer)
    })
  })

  describe("withdraw", async function() {
    beforeEach(async function() {
      await fundMe.fund({value: sendValue})
    })

    it('can withdraw eth from a single founder', async function() {
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      )
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      )

      const transactionResponse = await fundMe.withdraw()

      const transactionReceipt = await transactionResponse.wait(1)
      const gasUsed = transactionReceipt.cumulativeGasUsed
      const gasPrice = transactionReceipt.effectiveGasPrice
      const gasCost = gasPrice.mul(gasUsed)

      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      )

      const endingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      )

      assert.equal(endingFundMeBalance.toString(), 0)
      assert.equal(
        (startingDeployerBalance.add(startingFundMeBalance)).toString(),
        endingDeployerBalance.add(gasCost).toString()
      )
    })

    it("allows us to withdraw from multiple funders", async function() {
      const accounts = await ethers.getSigners()
      for(i = 1; i < 6; i++) {
        const fundMeConnectedAccount = await fundMe.connect(
          accounts[i]
        )
        await fundMeConnectedAccount.fund({value: sendValue})
      }

      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      )
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      )

      const transactionResponse = await fundMe.withdraw()
      const transactionReceipt = await transactionResponse.wait(1)
      const gasUsed = transactionReceipt.cumulativeGasUsed
      const gasPrice = transactionReceipt.effectiveGasPrice
      const gasCost = gasPrice.mul(gasUsed)

      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      )

      const endingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      )

      assert.equal(endingFundMeBalance.toString(), 0)
      assert.equal(
        (startingDeployerBalance.add(startingFundMeBalance)).toString(),
        endingDeployerBalance.add(gasCost).toString()
      )

      await expect(fundMe.s_funders(0)).to.be.reverted

      for(i = 1; i < 6; i++) {
        assert.equal(
          await fundMe.s_addressToAmountFunded(accounts[i].address), 0
        )
        const fundMeConnectedAccount = await fundMe.connect(
          accounts[i]
        )
        await fundMeConnectedAccount.fund({value: sendValue})
      }

    })

    it("only allows the owner to wthdraw", async function() {
      const accounts = await ethers.getSigners()
      const attacker = accounts[1]
      const attackerConnectedContract = await fundMe.connect(attacker)
      await expect(attackerConnectedContract.withdraw()).to.be.revertedWithCustomError(
        fundMe, "FundMe__NotOwner"
      )
    })
  })
})

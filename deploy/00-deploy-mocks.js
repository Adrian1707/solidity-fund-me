const { network } = require("hardhat")
const { developmentChains, DECIMALS, INITIAL_ANSWER } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    console.log(developmentChains)
    console.log(deployer)
    if(developmentChains.includes(network.name)){
      console.log("Local network detected! Deploying mocks...")
      await deploy("MockV3Aggregator", {
        contract: "MockV3Aggregator",
        from: deployer,
        log: true,
        args: [DECIMALS, INITIAL_ANSWER],
        waitConfirmations: network.config.blockConfirmations || 1
      })
      log("Mocks deployed")
      log("---------------------------------------------------")
    }
}

module.exports.tags = ['all', 'mocks']

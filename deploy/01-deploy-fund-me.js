const { network } = require("hardhat")
const { developmentChains, DECIMALS, INITIAL_ANSWER } = require("../helper-hardhat-config")
module.exports = async ({ getNamedAccounts, deployments }) => {
  const {deploy, log} = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId
  const { networkConfig } = require("../helper-hardhat-config")

  let ethUsdPriceFeedAddress
  if(developmentChains.includes(network.name)) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator")
    ethUsdPriceFeedAddress = ethUsdAggregator.address
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
  }

  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: [ethUsdPriceFeedAddress],
    log: true
  })
}

module.exports.tags = ['all', 'fundme']

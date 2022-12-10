// For Contract Addresses visit https://docs.matic.network/docs/develop/network-details/mapped-tokens
require("dotenv").config();

const account = process.env.ACCOUNT_ADDRESS; // replace with your account with privateKey in .env
const parentAddressGoerli = "0x655F2166b0709cd575202630952D71E2bB0d61Af"; // DERC20 Goerli
const childAddressMumbai = "0xfe4F5145f6e09952a5ba9e956ED0C25e3Fa4c7F1"; // DERC20 Mumbai
const rootChainProxyAddress = "0x2890ba17efe978480615e330ecb65333b880928e"; // // rootChainAddress - root chain proxy address on Goerli
const childChainManagerProxyAddress =
  "0xb5505a6d998549090530911180f38aC5130101c6"; // Child Chain Manager Proxy Address  for testnet

module.exports = {
  account,
  parentAddressGoerli,
  childAddressMumbai,
  rootChainProxyAddress,
  childChainManagerProxyAddress,
};

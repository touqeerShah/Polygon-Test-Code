const { expect, assert } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { PTMinter } = require("../../lib")

const { developmentChains } = require("../../helper.config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("PT-NFT ", function () {
          let ptNFT, minter, redeemer, PTNFTMarketPlaceContract, PTNFTMarketPlace, ptNFTContract
          beforeEach(async function () {
              // deploy the contract on hard hardhat-deploy we will used
              // deployments -> it will run all the deployment script with tag
              ;[minter, redeemer, _] = await ethers.getSigners()
              await deployments.fixture("all") // it will run all the deployment file tag == > all
              ptNFTContract = await ethers.getContract("PTNFT") // Returns a new connection to the Raffle contract
              ptNFT = ptNFTContract.connect(minter)
              PTNFTMarketPlaceContract = await ethers.getContract("PTNFTMarketPlace")
              PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(minter)

              console.log("ptNFT")
          })
          describe("ptNFT redmeem ", function () {
              it("Sould fails when someone call directl redmeem", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC"
                  )
                  console.log("voucher", voucher)
                  await expect(ptNFT.redeem(redeemer.address, voucher)).to.be.revertedWith(
                      "PTNFT__ONLYMARKETPLACE"
                  )
              })
          })
          describe("PTNFTMarketPlace createOfferFoRLazzNFT ", function () {
              it("check createOfferFoRLazzNFT fail if insufficent fund transfer", async function () {
                  console.log("minter", minter)

                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.01")

                  let minPrice = ethers.utils.parseEther("0.1")
                  console.log("minPrice", minPrice.toString())
                  let voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",
                      minter.address,
                      minPrice,
                      true
                  )
                  console.log("voucher", voucher)
                  var res = await ptNFT.redeem(minter.address, voucher)
                  console.log("res", res)
                  //   var res = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1)
                  //   console.log(res)
                  //   await expect(
                  //       PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                  //           value: sendEther,
                  //       })
                  //   ).to.be.revertedWith("PTNFTMarketPlace__InsufficientFund")
              })
              it("check createOfferFoRLazzNFT with minPrice", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.1")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",
                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())

                  await expect(
                      PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                          value: sendEther,
                          gasLimit: 4100000,
                      })
                  ).to.emit(PTNFTMarketPlace, "CreateOffer")
              })

              it("check createOfferFoRLazzNFT Offer Created", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.4")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  const startingFundMeBalance = await PTNFTMarketPlace.provider.getBalance(
                      minter.address
                  )
                  console.log("startingFundMeBalance", startingFundMeBalance.toString())
                  const txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  }) // emit WithDrawAmount
                  const txReceipt = await txResponse.wait(1) // waits 1 block
                  var res = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  console.log(
                      "res",
                      res.tokenId.toString(),
                      res.offerAmount.toString(),
                      res.offerBy
                  )
                  assert.equal(res.tokenId.toString(), voucher.tokenId.toString())
                  assert.equal(res.offerAmount.toString(), sendEther.toString())
                  assert.equal(res.offerBy, minter.address)
              })
              it("check createOfferFoRLazzNFT Offer the amount which is less then current offer", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.4")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  const startingFundMeBalance = await PTNFTMarketPlace.provider.getBalance(
                      minter.address
                  )
                  console.log("startingFundMeBalance", startingFundMeBalance.toString())
                  let txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  }) // emit WithDrawAmount
                  const txReceipt = await txResponse.wait(1) // waits 1 block
                  var res = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  //   var blocktime = await PTNFTMarketPlace.getBlockTime()

                  console.log("res", res.startAt.toString(), res.expiresAt.toString())
                  sendEther = ethers.utils.parseEther("0.3")

                  await expect(
                      PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                          value: sendEther,
                      })
                  ).to.be.revertedWith("PTNFTMarketPlace__InsufficientFund")
              })
              it("check createOfferFoRLazzNFT Offer the amount which is more then current offer", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.3")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  const startingFundMeBalance = await PTNFTMarketPlace.provider.getBalance(
                      minter.address
                  )
                  console.log("startingFundMeBalance", startingFundMeBalance.toString())
                  let txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  }) // emit WithDrawAmount
                  await txResponse.wait(1) // waits 1 block
                  //   var blocktime = await PTNFTMarketPlace.getBlockTime()
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  var res = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  console.log("res", res.offerBy.toString(), res.offerAmount.toString())
                  sendEther = ethers.utils.parseEther("0.45")
                  txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  res = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  //   console.log("txResponse", txResponse)
                  console.log("res", res.offerBy.toString(), res.offerAmount.toString())
                  assert.equal(res.offerBy, redeemer.address)
              })
              it("check createOfferFoRLazzNFT on new offer does old amount is move to Refund Offer Amount", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.3")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  const startingFundMeBalance = await PTNFTMarketPlace.provider.getBalance(
                      minter.address
                  )
                  console.log("startingFundMeBalance", startingFundMeBalance.toString())
                  let txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  }) // emit WithDrawAmount
                  await txResponse.wait(1) // waits 1 block
                  //   var blocktime = await PTNFTMarketPlace.getBlockTime()
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  sendEther = ethers.utils.parseEther("0.45")
                  txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  //   console.log("txResponse", txResponse)
                  var withDrawAmount = await PTNFTMarketPlace.getWithDrawAmounts(minter.address)
                  sendEther = ethers.utils.parseEther("0.3")
                  console.log("withDrawAmount", withDrawAmount.toString())
                  assert.equal(withDrawAmount.toString(), sendEther.toString())
              })
              it("check createOfferFoRLazzNFT redeem NFT voucher Offer will Close", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  var txResponse = await PTNFTMarketPlace.buyLazzNFT(voucher, {
                      value: sendEther,
                  })
                  var txReceipt = await txResponse.wait(1) // waits 1 block

                  await expect(
                      PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                          value: sendEther,
                      })
                  ).to.be.revertedWith("PTNFTMarketPlace__NotAvailableForOffer")
              })
          })

          describe("PTNFTMarketPlace buyLazzNFT ", function () {
              it("check buyLazzNFT redeem NFT voucher", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())

                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  var res = await ptNFT.balanceOf(redeemer.address)
                  console.log("res", res.toString())

                  //   var txResponse = await PTNFTMarketPlace.buyLazzNFT(voucher, {
                  //       value: sendEther,
                  //   })
                  //   var txReceipt = await txResponse.wait(1) // waits 1 block
                  //   let requestId = txReceipt.events
                  //   console.log("requestId", requestId)

                  await expect(
                      PTNFTMarketPlace.buyLazzNFT(voucher, {
                          value: sendEther,
                      })
                  ).to.emit(PTNFTMarketPlace, "BuyNFT") // transfer from null address to minter

                  //   var res = await ptNFT.balanceOf(redeemer.address)
                  //   var resURI = await ptNFT.tokenURI(1)
                  //   console.log("res", res.toString(), resURI.toString())
              })
              it("check buyLazzNFT redeem NFT voucher is transfer and verify URI", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())

                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  var res = await ptNFT.balanceOf(redeemer.address)
                  console.log("res", res.toString())

                  var txResponse = await PTNFTMarketPlace.buyLazzNFT(voucher, {
                      value: sendEther,
                  })
                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  var res = await ptNFT.balanceOf(redeemer.address)
                  var resURI = await ptNFT.tokenURI(1)
                  console.log("res", res.toString(), resURI.toString())
                  assert.equal(res.toString(), "1")
                  assert.equal(resURI.toString(), voucher.uri.toString())
              })

              it("check buyLazzNFT redeem NFT voucher and ether transfer to the owner and lister", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  let startingBalance = await PTNFTMarketPlace.provider.getBalance(minter.address)
                  startingBalance = startingBalance.add(sendEther)

                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)

                  var txResponse = await PTNFTMarketPlace.buyLazzNFT(voucher, {
                      value: sendEther,
                  })
                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  var refundOfferAmount = await PTNFTMarketPlace.getWithDrawAmounts(minter.address)
                  console.log("refundOfferAmount", refundOfferAmount.toString())

                  let endingBalance = await PTNFTMarketPlace.provider.getBalance(minter.address)
                  endingBalance = endingBalance.add(refundOfferAmount)
                  console.log("startingBalance", startingBalance.toString())
                  console.log("endingBalance  ", endingBalance.toString())

                  assert.equal(startingBalance.toString(), endingBalance.toString())
              })

              it("check buyLazzNFT redeem NFT voucher Offer will Close", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  var txResponse = await PTNFTMarketPlace.buyLazzNFT(voucher, {
                      value: sendEther,
                  })
                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  var offer = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  console.log("offer", offer.status)
                  assert.equal(offer.status.toString(), "1")
              })

              it("check buyLazzNFT on new offer old offer is less and move to refund", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.3")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  //   var blocktime = await PTNFTMarketPlace.getBlockTime()
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  sendEther = ethers.utils.parseEther("0.5")
                  txResponse = await PTNFTMarketPlace.buyLazzNFT(voucher, {
                      value: sendEther,
                  })
                  var txReceipt = await txResponse.wait(1) // waits 1 block

                  //   console.log("txResponse", txResponse)
                  var refundOfferAmount = await PTNFTMarketPlace.getWithDrawAmounts(minter.address)
                  sendEther = ethers.utils.parseEther("0.8")
                  console.log("refundOfferAmount", refundOfferAmount.toString())

                  assert.equal(refundOfferAmount.toString(), sendEther.toString())
              })
          })
          describe("PTNFTMarketPlace acceptLazzNFTOffer ", function () {
              it("check acceptLazzNFTOffer try to accept offer with not owner", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  //   var res = await PTNFTMarketPlace.getSign(voucher)
                  //   console.log(res)
                  await expect(
                      PTNFTMarketPlace.acceptLazzNFTOffer(voucher, {
                          value: sendEther,
                      })
                  ).to.be.revertedWith("PTNFTMarketPlace__NotOwner")
              })
              it("check acceptLazzNFTOffer fail when try to accept offer after expire", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  //   var res = await PTNFTMarketPlace.getSign(voucher)
                  //   console.log(res)
                  network.provider.send("evm_increaseTime", [86400 * 1])
                  network.provider.send("evm_mine", [])
                  await expect(
                      PTNFTMarketPlace.acceptLazzNFTOffer(voucher, {
                          value: sendEther,
                      })
                  ).to.be.revertedWith("PTNFTMarketPlace__OfferTimeExpired")
              })
              it("check acceptLazzNFTOffer redeem NFT voucher", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })

                  await expect(PTNFTMarketPlace.acceptLazzNFTOffer(voucher)).to.emit(
                      PTNFTMarketPlace,
                      "AcceptOffer"
                  ) // transfer from null address to minter
              })
              it("check acceptLazzNFTOffer redeem NFT voucher is transfer and verify URI", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )

                  var res = await ptNFT.balanceOf(redeemer.address)
                  console.log("res", res.toString())
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)

                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(minter)

                  var txResponse = await PTNFTMarketPlace.acceptLazzNFTOffer(voucher)

                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  var res = await ptNFT.balanceOf(redeemer.address)
                  var resURI = await ptNFT.tokenURI(1)
                  console.log("res", res.toString(), resURI.toString())
                  assert.equal(res.toString(), "1")
                  assert.equal(resURI.toString(), voucher.uri.toString())
              })
              it("check acceptLazzNFTOffer redeem NFT voucher Offer will Close", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.5")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )

                  var res = await ptNFT.balanceOf(redeemer.address)
                  console.log("res", res.toString())
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)

                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(minter)

                  var txResponse = await PTNFTMarketPlace.acceptLazzNFTOffer(voucher)

                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  res = await ptNFT.balanceOf(redeemer.address)
                  console.log("res", res.toString())
                  var offer = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  console.log("offer", offer.status)
                  assert.equal(offer.status.toString(), "1")
              })
          })

          describe("PTNFTMarketPlace rejectionProcess ", function () {
              it("check rejectionProcess try to accept offer with not owner", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  //   var res = await PTNFTMarketPlace.getSign(voucher)
                  //   console.log(res)
                  await expect(PTNFTMarketPlace.rejectLazzNFTOffer(voucher)).to.be.revertedWith(
                      "PTNFTMarketPlace__NotOwner"
                  )
              })
              it("check rejectionProcess fail when try to accept offer after expire", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  //   var res = await PTNFTMarketPlace.getSign(voucher)
                  //   console.log(res)
                  network.provider.send("evm_increaseTime", [86400 * 1])
                  network.provider.send("evm_mine", [])
                  await expect(PTNFTMarketPlace.rejectLazzNFTOffer(voucher)).to.be.revertedWith(
                      "PTNFTMarketPlace__OfferTimeExpired"
                  )
              })
              it("check rejectLazzNFTOffer redeem NFT voucher", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",
                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })

                  await expect(PTNFTMarketPlace.rejectLazzNFTOffer(voucher)).to.emit(
                      PTNFTMarketPlace,
                      "RejectOffer"
                  ) // transfer from null address to minter
              })
          })

          describe("PTNFTMarketPlace withDrawOfferFromLazzMint ", function () {
              it("check withDrawOfferFromLazzMint fail when try to get amount without place any offer", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  //   var res = await PTNFTMarketPlace.getSign(voucher)
                  //   console.log(res)
                  await expect(
                      PTNFTMarketPlace.withDrawOfferFromLazzMint(ptNFT.address, 1)
                  ).to.be.revertedWith("PTNFTMarketPlace__PermissionRequired")
              })
              it("check withDrawOfferFromLazzMint amount is return in account", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",
                      minPrice
                  )
                  const startingBalance = await PTNFTMarketPlace.provider.getBalance(minter.address)
                  var txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  var { gasUsed, effectiveGasPrice } = txReceipt
                  let withdrawGasCostCreateOfferFoRLazzNFT = gasUsed.mul(effectiveGasPrice)

                  var txResponse1 = await PTNFTMarketPlace.withDrawOfferFromLazzMint(
                      ptNFT.address,
                      1
                  )
                  var txReceipt1 = await txResponse1.wait(1) // waits 1 block
                  var gasUsed1 = txReceipt1.gasUsed
                  var effectiveGasPrice1 = txReceipt1.effectiveGasPrice
                  let withdrawGasCostwithDrawFromOffer = gasUsed1.mul(effectiveGasPrice1)

                  var endingBalance = await PTNFTMarketPlace.provider.getBalance(minter.address)
                  endingBalance = endingBalance
                      .add(withdrawGasCostwithDrawFromOffer)
                      .add(withdrawGasCostCreateOfferFoRLazzNFT)
                  console.log("endingBalance", endingBalance.toString())
                  console.log("startingBalance", startingBalance.toString())
                  assert.equal(endingBalance.toString(), startingBalance.toString())
              })
              it("check WithDrawFund event ", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.2")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", redeemer.address)
                  await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })

                  await expect(
                      PTNFTMarketPlace.withDrawOfferFromLazzMint(ptNFT.address, 1)
                  ).to.emit(PTNFTMarketPlace, "WithDrawFromOffer") // transfer from null address to minter
              })
          })

          describe("PTNFTMarketPlace withDrawAmount  ", function () {
              it("check withDrawAmount fail when try to get amount without place any offer", async function () {
                  await expect(PTNFTMarketPlace.withDrawAmount()).to.be.revertedWith(
                      "PTNFTMarketPlace__NoAmountForWithDraw"
                  )
              })
              it("check withDrawAmount amount when someone offer more then your amount", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.3")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",

                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())
                  const startingBalance = await PTNFTMarketPlace.provider.getBalance(minter.address)

                  let txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  }) // emit WithDrawAmount
                  var txReceipt = await txResponse.wait(1) // waits 1 block
                  var { gasUsed, effectiveGasPrice } = txReceipt
                  let withdrawGasCostCreateOfferFoRLazzNFT = gasUsed.mul(effectiveGasPrice)

                  //   var blocktime = await PTNFTMarketPlace.getBlockTime()
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  var res = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  console.log("res", res.offerBy.toString(), res.offerAmount.toString())
                  sendEther = ethers.utils.parseEther("0.45")
                  txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  await txResponse.wait(1) // waits 1 block

                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(minter)
                  var txResponse1 = await PTNFTMarketPlace.withDrawAmount()
                  var txReceipt1 = await txResponse1.wait(1) // waits 1 block
                  var gasUsed1 = txReceipt1.gasUsed
                  var effectiveGasPrice1 = txReceipt1.effectiveGasPrice
                  let withdrawGasCostwithDrawFromOffer = gasUsed1.mul(effectiveGasPrice1)

                  var endingBalance = await PTNFTMarketPlace.provider.getBalance(minter.address)
                  endingBalance = endingBalance
                      .add(withdrawGasCostwithDrawFromOffer)
                      .add(withdrawGasCostCreateOfferFoRLazzNFT)
                  console.log("endingBalance", endingBalance.toString())
                  console.log("startingBalance", startingBalance.toString())
                  assert.equal(endingBalance.toString(), startingBalance.toString())
              })

              it("check withDrawAmount event ", async function () {
                  const ptMinter = new PTMinter({ ptNFT, signer: minter })
                  console.log("minter", minter.address)
                  let sendEther = ethers.utils.parseEther("0.3")
                  let minPrice = ethers.utils.parseEther("0.1")

                  const voucher = await ptMinter.createVoucher(
                      1,
                      "ipfs://QmQFcbsk1Vjt1n361MceM5iNeMTuFzuVUZ1hKFWD7ZCpuC",
                      minPrice
                  )
                  console.log("voucher", voucher.minPrice.toString(), sendEther.toString())

                  let txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  }) // emit WithDrawAmount
                  await txResponse.wait(1) // waits 1 block

                  //   var blocktime = await PTNFTMarketPlace.getBlockTime()
                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(redeemer)
                  var res = await PTNFTMarketPlace.getOffer(ptNFT.address, 1)
                  console.log("res", res.offerBy.toString(), res.offerAmount.toString())
                  sendEther = ethers.utils.parseEther("0.45")
                  txResponse = await PTNFTMarketPlace.createOfferFoRLazzNFT(voucher, 1, {
                      value: sendEther,
                  })
                  await txResponse.wait(1) // waits 1 block

                  PTNFTMarketPlace = PTNFTMarketPlaceContract.connect(minter)

                  await expect(PTNFTMarketPlace.withDrawAmount()).to.emit(
                      PTNFTMarketPlace,
                      "WithDrawAmount"
                  ) // transfer from null address to minter
              })
          })
      })

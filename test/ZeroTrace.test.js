const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { cofhejs_initializeWithHardhatSigner, mock_getPlaintext } = require("cofhe-hardhat-plugin");
const { cofhejs, Encryptable } = require("cofhejs/node");

async function encryptUint128(signer, value) {
  await cofhejs_initializeWithHardhatSigner(hre, signer);
  const encrypted = await cofhejs.encrypt([Encryptable.uint128(BigInt(value))]);

  if (!encrypted.success) {
    throw encrypted.error;
  }

  return encrypted.data[0];
}

async function getPlaintext(provider, ctHash) {
  return mock_getPlaintext(provider, BigInt(ctHash));
}

describe("ZeroTrace", function () {
  async function deployFixture() {
    const [owner, buyer, seller, outsider] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const ZeroTrace = await ethers.getContractFactory("ZeroTrace");

    const zusdc = await MockERC20.deploy("ZeroTrace USD Coin", "ZUSDC", 6);
    const zeth = await MockERC20.deploy("ZeroTrace Ether", "ZETH", 18);
    const zeroTrace = await ZeroTrace.deploy(owner.address);

    await Promise.all([
      zusdc.waitForDeployment(),
      zeth.waitForDeployment(),
      zeroTrace.waitForDeployment()
    ]);

    return {
      owner,
      buyer,
      seller,
      outsider,
      zeroTrace,
      zusdc,
      zeth
    };
  }

  it("submits encrypted orders and executes a private match", async function () {
    const { owner, buyer, seller, zeroTrace, zusdc, zeth } = await deployFixture();
    const baseAmount = ethers.parseEther("0.5");
    const price = 2_400_000_000n;
    const quoteAmount = 1_200_000_000n;
    const buyOrderId = ethers.keccak256(ethers.toUtf8Bytes("buy-order-1"));
    const sellOrderId = ethers.keccak256(ethers.toUtf8Bytes("sell-order-1"));

    await zusdc
      .connect(buyer)
      .mintEncrypted(
        buyer.address,
        await encryptUint128(buyer, quoteAmount)
      );
    await zeth
      .connect(seller)
      .mintEncrypted(
        seller.address,
        await encryptUint128(seller, baseAmount)
      );

    await zusdc
      .connect(buyer)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(buyer, quoteAmount)
      );
    await zeth
      .connect(seller)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(seller, baseAmount)
      );

    await expect(
      zeroTrace
        .connect(buyer)
        .submitOrder(
          buyOrderId,
          await zeth.getAddress(),
          await zusdc.getAddress(),
          await encryptUint128(buyer, baseAmount),
          await encryptUint128(buyer, price),
          true
        )
    ).to.emit(zeroTrace, "OrderSubmitted");

    await expect(
      zeroTrace
        .connect(seller)
        .submitOrder(
          sellOrderId,
          await zeth.getAddress(),
          await zusdc.getAddress(),
          await encryptUint128(seller, baseAmount),
          await encryptUint128(seller, price),
          false
        )
    ).to.emit(zeroTrace, "OrderSubmitted");

    await expect(
      zeroTrace
        .connect(owner)
        .executeMatch(buyOrderId, sellOrderId, true, true)
    ).to.emit(zeroTrace, "TradeExecuted");

    const buyerZethCt = await zeth.balanceOfEncrypted(buyer.address);
    const sellerZusdcCt = await zusdc.balanceOfEncrypted(seller.address);
    const [remainingBaseCt, limitPriceCt, reservedQuoteCt] =
      await zeroTrace.getOrderCiphertexts(buyOrderId);
    const [, , , , , , tradeTimestamp] = await zeroTrace.getTrade(1);
    const [tradeBaseCt, tradePriceCt] = await zeroTrace.getTradeCiphertexts(1);

    expect(await getPlaintext(ethers.provider, buyerZethCt)).to.equal(baseAmount);
    expect(await getPlaintext(ethers.provider, sellerZusdcCt)).to.equal(quoteAmount);
    expect(await getPlaintext(ethers.provider, remainingBaseCt)).to.equal(0n);
    expect(await getPlaintext(ethers.provider, reservedQuoteCt)).to.equal(0n);
    expect(await getPlaintext(ethers.provider, limitPriceCt)).to.equal(price);
    expect(await getPlaintext(ethers.provider, tradeBaseCt)).to.equal(baseAmount);
    expect(await getPlaintext(ethers.provider, tradePriceCt)).to.equal(price);
    expect(tradeTimestamp).to.be.gt(0n);
  });

  it("refunds encrypted escrow on cancel", async function () {
    const { buyer, zeroTrace, zusdc, zeth } = await deployFixture();
    const baseAmount = ethers.parseEther("0.25");
    const price = 2_000_000_000n;
    const quoteAmount = 500_000_000n;
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("cancel-order"));

    await zusdc
      .connect(buyer)
      .mintEncrypted(
        buyer.address,
        await encryptUint128(buyer, quoteAmount)
      );
    await zusdc
      .connect(buyer)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(buyer, quoteAmount)
      );

    await zeroTrace
      .connect(buyer)
      .submitOrder(
        orderId,
        await zeth.getAddress(),
        await zusdc.getAddress(),
        await encryptUint128(buyer, baseAmount),
        await encryptUint128(buyer, price),
        true
      );

    await expect(zeroTrace.connect(buyer).cancelOrder(orderId)).to.emit(
      zeroTrace,
      "OrderCancelled"
    );

    const buyerZusdcCt = await zusdc.balanceOfEncrypted(buyer.address);
    const [, , , , cancelled, closed] = await zeroTrace.getOrder(orderId);

    expect(await getPlaintext(ethers.provider, buyerZusdcCt)).to.equal(quoteAmount);
    expect(cancelled).to.equal(true);
    expect(closed).to.equal(true);
  });

  it("restricts executeMatch to the operator", async function () {
    const { buyer, seller, outsider, zeroTrace, zusdc, zeth } = await deployFixture();
    const baseAmount = ethers.parseEther("0.1");
    const price = 2_300_000_000n;
    const quoteAmount = 230_000_000n;
    const buyOrderId = ethers.keccak256(ethers.toUtf8Bytes("buy-order-2"));
    const sellOrderId = ethers.keccak256(ethers.toUtf8Bytes("sell-order-2"));

    await zusdc
      .connect(buyer)
      .mintEncrypted(
        buyer.address,
        await encryptUint128(buyer, quoteAmount)
      );
    await zeth
      .connect(seller)
      .mintEncrypted(
        seller.address,
        await encryptUint128(seller, baseAmount)
      );
    await zusdc
      .connect(buyer)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(buyer, quoteAmount)
      );
    await zeth
      .connect(seller)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(seller, baseAmount)
      );

    await zeroTrace
      .connect(buyer)
      .submitOrder(
        buyOrderId,
        await zeth.getAddress(),
        await zusdc.getAddress(),
        await encryptUint128(buyer, baseAmount),
        await encryptUint128(buyer, price),
        true
      );
    await zeroTrace
      .connect(seller)
      .submitOrder(
        sellOrderId,
        await zeth.getAddress(),
        await zusdc.getAddress(),
        await encryptUint128(seller, baseAmount),
        await encryptUint128(seller, price),
        false
      );

    await expect(
      zeroTrace.connect(outsider).executeMatch(buyOrderId, sellOrderId, true, true)
    ).to.be.revertedWithCustomError(zeroTrace, "Unauthorized");
  });

  it("cannot execute an already consumed trade pair", async function () {
    const { owner, buyer, seller, zeroTrace, zusdc, zeth } = await deployFixture();
    const baseAmount = ethers.parseEther("0.2");
    const price = 2_100_000_000n;
    const quoteAmount = 420_000_000n;
    const buyOrderId = ethers.keccak256(ethers.toUtf8Bytes("buy-order-3"));
    const sellOrderId = ethers.keccak256(ethers.toUtf8Bytes("sell-order-3"));

    await zusdc
      .connect(buyer)
      .mintEncrypted(
        buyer.address,
        await encryptUint128(buyer, quoteAmount)
      );
    await zeth
      .connect(seller)
      .mintEncrypted(
        seller.address,
        await encryptUint128(seller, baseAmount)
      );
    await zusdc
      .connect(buyer)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(buyer, quoteAmount)
      );
    await zeth
      .connect(seller)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(seller, baseAmount)
      );

    await zeroTrace
      .connect(buyer)
      .submitOrder(
        buyOrderId,
        await zeth.getAddress(),
        await zusdc.getAddress(),
        await encryptUint128(buyer, baseAmount),
        await encryptUint128(buyer, price),
        true
      );
    await zeroTrace
      .connect(seller)
      .submitOrder(
        sellOrderId,
        await zeth.getAddress(),
        await zusdc.getAddress(),
        await encryptUint128(seller, baseAmount),
        await encryptUint128(seller, price),
        false
      );

    await zeroTrace
      .connect(owner)
      .executeMatch(buyOrderId, sellOrderId, true, true);

    await expect(
      zeroTrace.connect(owner).executeMatch(buyOrderId, sellOrderId, true, true)
    ).to.be.revertedWithCustomError(zeroTrace, "InvalidMatch");
  });
});

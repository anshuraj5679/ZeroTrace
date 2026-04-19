const { expect } = require("chai");
const { Encryptable } = require("@cofhe/sdk");
const hre = require("hardhat");
const { ethers } = hre;

const cofheClients = new Map();

async function getCofheClientForSigner(signer) {
  const address = await signer.getAddress();

  if (!cofheClients.has(address)) {
    const client = await hre.cofhe.createClientWithBatteries(signer);
    cofheClients.set(address, client);
  }

  return cofheClients.get(address);
}

async function encryptUint128(signer, value) {
  const client = await getCofheClientForSigner(signer);
  const [encrypted] = await client.encryptInputs([Encryptable.uint128(BigInt(value))]).execute();

  return encrypted;
}

async function getPlaintext(ctHash) {
  return hre.cofhe.mocks.getPlaintext(BigInt(ctHash));
}

async function decryptUint128ForTx(signer, ctHash) {
  const client = await getCofheClientForSigner(signer);
  const permit = await client.permits.getOrCreateSelfPermit(undefined, undefined, {
    issuer: await signer.getAddress(),
    name: "ZeroTrace Test Permit"
  });

  return client.decryptForTx(ctHash).withPermit(permit).execute();
}

async function buildMatchProof(operator, zeroTrace, buyOrderId, sellOrderId) {
  const [buyRemainingCt, buyLimitCt] = await zeroTrace.getOrderCiphertexts(buyOrderId);
  const [sellRemainingCt, sellLimitCt] = await zeroTrace.getOrderCiphertexts(sellOrderId);
  const [buyRemaining, sellRemaining, buyLimit, sellLimit] = await Promise.all([
    decryptUint128ForTx(operator, buyRemainingCt),
    decryptUint128ForTx(operator, sellRemainingCt),
    decryptUint128ForTx(operator, buyLimitCt),
    decryptUint128ForTx(operator, sellLimitCt)
  ]);

  return {
    buyRemainingBase: buyRemaining.decryptedValue,
    buyRemainingBaseSig: buyRemaining.signature,
    sellRemainingBase: sellRemaining.decryptedValue,
    sellRemainingBaseSig: sellRemaining.signature,
    buyLimitPrice: buyLimit.decryptedValue,
    buyLimitPriceSig: buyLimit.signature,
    sellLimitPrice: sellLimit.decryptedValue,
    sellLimitPriceSig: sellLimit.signature
  };
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
        .executeMatch(
          buyOrderId,
          sellOrderId,
          await buildMatchProof(owner, zeroTrace, buyOrderId, sellOrderId)
        )
    ).to.emit(zeroTrace, "TradeExecuted");

    const buyerZethCt = await zeth.balanceOfEncrypted(buyer.address);
    const sellerZusdcCt = await zusdc.balanceOfEncrypted(seller.address);
    const [remainingBaseCt, limitPriceCt, reservedQuoteCt] =
      await zeroTrace.getOrderCiphertexts(buyOrderId);
    const [, , , , , , tradeTimestamp] = await zeroTrace.getTrade(1);
    const [tradeBaseCt, tradePriceCt] = await zeroTrace.getTradeCiphertexts(1);

    expect(await getPlaintext(buyerZethCt)).to.equal(baseAmount);
    expect(await getPlaintext(sellerZusdcCt)).to.equal(quoteAmount);
    expect(await getPlaintext(remainingBaseCt)).to.equal(0n);
    expect(await getPlaintext(reservedQuoteCt)).to.equal(0n);
    expect(await getPlaintext(limitPriceCt)).to.equal(price);
    expect(await getPlaintext(tradeBaseCt)).to.equal(baseAmount);
    expect(await getPlaintext(tradePriceCt)).to.equal(price);
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

    expect(await getPlaintext(buyerZusdcCt)).to.equal(quoteAmount);
    expect(cancelled).to.equal(true);
    expect(closed).to.equal(true);
  });

  it("records only actually escrowed quote capacity for underfunded buy orders", async function () {
    const { buyer, zeroTrace, zusdc, zeth } = await deployFixture();
    const requestedBaseAmount = ethers.parseEther("0.5");
    const escrowedQuoteAmount = 600_000_000n;
    const price = 2_400_000_000n;
    const expectedBaseCapacity = ethers.parseEther("0.25");
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("underfunded-buy-order"));

    await zusdc
      .connect(buyer)
      .mintEncrypted(
        buyer.address,
        await encryptUint128(buyer, escrowedQuoteAmount)
      );
    await zusdc
      .connect(buyer)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(buyer, escrowedQuoteAmount)
      );

    await expect(
      zeroTrace
        .connect(buyer)
        .submitOrder(
          orderId,
          await zeth.getAddress(),
          await zusdc.getAddress(),
          await encryptUint128(buyer, requestedBaseAmount),
          await encryptUint128(buyer, price),
          true
        )
    ).to.emit(zeroTrace, "OrderSubmitted");

    const [remainingBaseCt, , reservedQuoteCt] =
      await zeroTrace.getOrderCiphertexts(orderId);

    expect(await getPlaintext(remainingBaseCt)).to.equal(expectedBaseCapacity);
    expect(await getPlaintext(reservedQuoteCt)).to.equal(escrowedQuoteAmount);
  });

  it("records only actually escrowed base for underfunded sell orders", async function () {
    const { seller, zeroTrace, zusdc, zeth } = await deployFixture();
    const requestedBaseAmount = ethers.parseEther("1");
    const escrowedBaseAmount = ethers.parseEther("0.4");
    const price = 2_400_000_000n;
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("underfunded-sell-order"));

    await zeth
      .connect(seller)
      .mintEncrypted(
        seller.address,
        await encryptUint128(seller, escrowedBaseAmount)
      );
    await zeth
      .connect(seller)
      .approveEncrypted(
        await zeroTrace.getAddress(),
        await encryptUint128(seller, escrowedBaseAmount)
      );

    await expect(
      zeroTrace
        .connect(seller)
        .submitOrder(
          orderId,
          await zeth.getAddress(),
          await zusdc.getAddress(),
          await encryptUint128(seller, requestedBaseAmount),
          await encryptUint128(seller, price),
          false
        )
    ).to.emit(zeroTrace, "OrderSubmitted");

    const [remainingBaseCt, , reservedQuoteCt] =
      await zeroTrace.getOrderCiphertexts(orderId);

    expect(await getPlaintext(remainingBaseCt)).to.equal(escrowedBaseAmount);
    expect(await getPlaintext(reservedQuoteCt)).to.equal(0n);
  });

  it("restricts executeMatch to the operator", async function () {
    const { owner, buyer, seller, outsider, zeroTrace, zusdc, zeth } = await deployFixture();
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
      zeroTrace.connect(outsider).executeMatch(
        buyOrderId,
        sellOrderId,
        await buildMatchProof(owner, zeroTrace, buyOrderId, sellOrderId)
      )
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
      .executeMatch(
        buyOrderId,
        sellOrderId,
        await buildMatchProof(owner, zeroTrace, buyOrderId, sellOrderId)
      );

    await expect(
      zeroTrace.connect(owner).executeMatch(
        buyOrderId,
        sellOrderId,
        await buildMatchProof(owner, zeroTrace, buyOrderId, sellOrderId)
      )
    ).to.be.revertedWithCustomError(zeroTrace, "InvalidMatch");
  });

  it("rejects non-crossing matches before settlement", async function () {
    const { owner, buyer, seller, zeroTrace, zusdc, zeth } = await deployFixture();
    const baseAmount = ethers.parseEther("0.1");
    const buyPrice = 2_000_000_000n;
    const sellPrice = 2_100_000_000n;
    const quoteAmount = 200_000_000n;
    const buyOrderId = ethers.keccak256(ethers.toUtf8Bytes("buy-order-4"));
    const sellOrderId = ethers.keccak256(ethers.toUtf8Bytes("sell-order-4"));

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
        await encryptUint128(buyer, buyPrice),
        true
      );
    await zeroTrace
      .connect(seller)
      .submitOrder(
        sellOrderId,
        await zeth.getAddress(),
        await zusdc.getAddress(),
        await encryptUint128(seller, baseAmount),
        await encryptUint128(seller, sellPrice),
        false
      );

    await expect(
      zeroTrace.connect(owner).executeMatch(
        buyOrderId,
        sellOrderId,
        await buildMatchProof(owner, zeroTrace, buyOrderId, sellOrderId)
      )
    ).to.be.revertedWithCustomError(zeroTrace, "MatchNotCrossed");
  });

  it("rejects tampered operator decrypt proofs", async function () {
    const { owner, buyer, seller, zeroTrace, zusdc, zeth } = await deployFixture();
    const baseAmount = ethers.parseEther("0.1");
    const price = 2_300_000_000n;
    const quoteAmount = 230_000_000n;
    const buyOrderId = ethers.keccak256(ethers.toUtf8Bytes("buy-order-5"));
    const sellOrderId = ethers.keccak256(ethers.toUtf8Bytes("sell-order-5"));

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

    const proof = await buildMatchProof(owner, zeroTrace, buyOrderId, sellOrderId);
    proof.buyLimitPrice = proof.buyLimitPrice + 1n;

    await expect(
      zeroTrace.connect(owner).executeMatch(buyOrderId, sellOrderId, proof)
    ).to.be.revertedWithCustomError(zeroTrace, "InvalidDecryptProof");
  });
});

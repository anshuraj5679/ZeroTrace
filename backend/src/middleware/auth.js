const { getAddress, verifyMessage } = require("ethers");

function buildAuthMessage(nonce, timestamp) {
  return `ZeroTrace Order Request\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

async function verifySignature(req, _res, next) {
  try {
    const { walletAddress, signature, nonce, timestamp } = req.body;

    if (!walletAddress || !signature || !nonce || !timestamp) {
      throw Object.assign(new Error("Missing signature fields."), {
        statusCode: 400,
        code: "AUTH_FIELDS_REQUIRED"
      });
    }

    const issuedAt = Number(timestamp);
    if (!Number.isFinite(issuedAt)) {
      throw Object.assign(new Error("Invalid signature timestamp."), {
        statusCode: 400,
        code: "INVALID_TIMESTAMP"
      });
    }

    if (Math.abs(Date.now() - issuedAt) > 5 * 60 * 1000) {
      throw Object.assign(new Error("Signature timestamp expired."), {
        statusCode: 401,
        code: "SIGNATURE_EXPIRED"
      });
    }

    const expectedWallet = getAddress(walletAddress);
    const recoveredWallet = verifyMessage(buildAuthMessage(nonce, issuedAt), signature);

    if (getAddress(recoveredWallet) !== expectedWallet) {
      throw Object.assign(new Error("Invalid signature."), {
        statusCode: 401,
        code: "INVALID_SIGNATURE"
      });
    }

    req.auth = {
      walletAddress: expectedWallet,
      nonce,
      timestamp: issuedAt
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  buildAuthMessage,
  verifySignature
};


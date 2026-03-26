const crypto = require("crypto");

function getEncryptionKey() {
  const rawKey = (process.env.ENCRYPTION_KEY || "").replace(/^0x/, "");

  if (rawKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string.");
  }

  return Buffer.from(rawKey, "hex");
}

function encryptPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const serialized = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted.toString("hex")
  });
}

function decryptPayload(serialized) {
  const payload = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "hex")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = {
  decryptPayload,
  encryptPayload
};


export const PRICE_SCALE = 10n ** 9n;
export function priceQuotePerBaseScaled(o) {
    if (o.side === "BUY") {
        return (o.remainingDeposit * 10n ** BigInt(o.assetDecimals) * PRICE_SCALE) / (o.remainingRequest * 10n ** BigInt(o.cashDecimals));
    }
    else {
        return (o.remainingRequest * 10n ** BigInt(o.assetDecimals) * PRICE_SCALE) / (o.remainingDeposit * 10n ** BigInt(o.cashDecimals));
    }
}
export function unscalePrice(scaled) {
    return scaled / PRICE_SCALE;
}

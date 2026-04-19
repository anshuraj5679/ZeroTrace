// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { FHE, ebool, euint128 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { InEuint128 } from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

interface IPrivateERC20 {
    function _transferEncrypted(address to, euint128 encryptedAmount) external returns (euint128);
    function _transferFromEncrypted(address from, address to, euint128 encryptedAmount) external returns (euint128);
}

contract ZeroTrace is Ownable, ReentrancyGuard {
    struct Order {
        bytes32 id;
        address trader;
        address tokenBase;
        address tokenQuote;
        euint128 remainingBase;
        euint128 limitPrice;
        euint128 reservedQuote;
        bool isBuy;
        bool cancelled;
        bool closed;
        uint8 baseTokenDecimals;
        uint256 timestamp;
    }

    struct Trade {
        uint256 id;
        bytes32 buyOrderId;
        bytes32 sellOrderId;
        address buyer;
        address seller;
        address tokenBase;
        address tokenQuote;
        euint128 baseAmount;
        euint128 settlementPrice;
        uint256 timestamp;
    }

    struct MatchProof {
        uint128 buyRemainingBase;
        bytes buyRemainingBaseSig;
        uint128 sellRemainingBase;
        bytes sellRemainingBaseSig;
        uint128 buyLimitPrice;
        bytes buyLimitPriceSig;
        uint128 sellLimitPrice;
        bytes sellLimitPriceSig;
    }

    struct Settlement {
        uint128 matchedBase;
        uint128 settlementPrice;
        uint128 quoteSpent;
        uint128 quoteReservedAtLimit;
        uint128 quoteRefund;
    }

    mapping(bytes32 => Order) private _orders;
    mapping(uint256 => Trade) private _trades;
    mapping(bytes32 => bool) public executedTrades;

    address public operator;
    uint256 public tradeCount;

    event OrderSubmitted(
        bytes32 indexed orderId,
        address indexed trader,
        address indexed tokenBase,
        address tokenQuote,
        bool isBuy,
        uint256 timestamp
    );
    event TradeExecuted(
        uint256 indexed tradeId,
        bytes32 indexed buyOrderId,
        bytes32 indexed sellOrderId,
        address tokenBase,
        address tokenQuote,
        uint256 timestamp
    );
    event OrderCancelled(bytes32 indexed orderId);
    event OperatorUpdated(address indexed previousOperator, address indexed newOperator);

    error InvalidAddress();
    error InvalidOrder();
    error OrderExists();
    error Unauthorized();
    error InvalidMatch();
    error OrderClosed();
    error OrderCancelledAlready();
    error MatchNotCrossed();
    error InvalidDecryptProof();

    modifier onlyOperator() {
        if (msg.sender != operator) {
            revert Unauthorized();
        }
        _;
    }

    constructor(address initialOperator) Ownable(msg.sender) {
        if (initialOperator == address(0)) {
            revert InvalidAddress();
        }

        operator = initialOperator;
    }

    function submitOrder(
        bytes32 orderId,
        address tokenBase,
        address tokenQuote,
        InEuint128 calldata encryptedBaseAmount,
        InEuint128 calldata encryptedLimitPrice,
        bool isBuy
    ) external nonReentrant {
        if (orderId == bytes32(0)) {
            revert InvalidOrder();
        }
        if (
            tokenBase == address(0) ||
            tokenQuote == address(0) ||
            tokenBase == tokenQuote
        ) {
            revert InvalidAddress();
        }
        if (_orders[orderId].timestamp != 0) {
            revert OrderExists();
        }

        euint128 baseAmount = FHE.asEuint128(encryptedBaseAmount);
        euint128 limitPrice = FHE.asEuint128(encryptedLimitPrice);
        uint8 baseTokenDecimals = IERC20Metadata(tokenBase).decimals();

        euint128 remainingBase = baseAmount;
        euint128 reservedQuote = FHE.asEuint128(0);

        if (isBuy) {
            euint128 requestedQuote = _quoteForBase(baseAmount, limitPrice, baseTokenDecimals);
            FHE.allow(requestedQuote, tokenQuote);

            reservedQuote = IPrivateERC20(tokenQuote)._transferFromEncrypted(
                msg.sender,
                address(this),
                requestedQuote
            );
            remainingBase = FHE.min(
                baseAmount,
                _baseForQuote(reservedQuote, limitPrice, baseTokenDecimals)
            );
        } else {
            FHE.allow(baseAmount, tokenBase);
            remainingBase = IPrivateERC20(tokenBase)._transferFromEncrypted(
                msg.sender,
                address(this),
                baseAmount
            );
        }

        _orders[orderId] = Order({
            id: orderId,
            trader: msg.sender,
            tokenBase: tokenBase,
            tokenQuote: tokenQuote,
            remainingBase: remainingBase,
            limitPrice: limitPrice,
            reservedQuote: reservedQuote,
            isBuy: isBuy,
            cancelled: false,
            closed: false,
            baseTokenDecimals: baseTokenDecimals,
            timestamp: block.timestamp
        });

        _grantOrderAccess(_orders[orderId]);

        emit OrderSubmitted(orderId, msg.sender, tokenBase, tokenQuote, isBuy, block.timestamp);
    }

    function executeMatch(
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        MatchProof calldata proof
    ) external onlyOperator nonReentrant {
        bytes32 tradeKey = getTradeKey(buyOrderId, sellOrderId);
        if (executedTrades[tradeKey]) {
            revert InvalidMatch();
        }

        Order storage buyOrder = _orders[buyOrderId];
        Order storage sellOrder = _orders[sellOrderId];

        if (
            buyOrder.timestamp == 0 ||
            sellOrder.timestamp == 0 ||
            !buyOrder.isBuy ||
            sellOrder.isBuy ||
            buyOrder.tokenBase != sellOrder.tokenBase ||
            buyOrder.tokenQuote != sellOrder.tokenQuote ||
            buyOrder.baseTokenDecimals != sellOrder.baseTokenDecimals
        ) {
            revert InvalidMatch();
        }
        if (
            buyOrder.cancelled ||
            sellOrder.cancelled ||
            buyOrder.closed ||
            sellOrder.closed
        ) {
            revert OrderClosed();
        }

        _verifyMatchProof(buyOrder, sellOrder, proof);

        if (proof.buyLimitPrice < proof.sellLimitPrice) {
            revert MatchNotCrossed();
        }

        Settlement memory settlement = _buildSettlement(proof, buyOrder.baseTokenDecimals);
        (euint128 matchedBase, euint128 settlementPrice) =
            _settleOrders(buyOrder, sellOrder, proof, settlement);
        uint256 tradeId = _recordTrade(
            buyOrderId,
            sellOrderId,
            buyOrder,
            sellOrder,
            matchedBase,
            settlementPrice
        );
        executedTrades[tradeKey] = true;

        emit TradeExecuted(
            tradeId,
            buyOrderId,
            sellOrderId,
            buyOrder.tokenBase,
            buyOrder.tokenQuote,
            block.timestamp
        );
    }

    function cancelOrder(bytes32 orderId) external nonReentrant {
        Order storage order = _orders[orderId];
        if (order.timestamp == 0) {
            revert InvalidOrder();
        }
        if (order.trader != msg.sender) {
            revert Unauthorized();
        }
        if (order.cancelled) {
            revert OrderCancelledAlready();
        }
        if (order.closed) {
            revert OrderClosed();
        }

        order.cancelled = true;
        order.closed = true;

        if (order.isBuy) {
            FHE.allow(order.reservedQuote, order.tokenQuote);
            IPrivateERC20(order.tokenQuote)._transferEncrypted(order.trader, order.reservedQuote);
        } else {
            FHE.allow(order.remainingBase, order.tokenBase);
            IPrivateERC20(order.tokenBase)._transferEncrypted(order.trader, order.remainingBase);
        }

        emit OrderCancelled(orderId);
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) {
            revert InvalidAddress();
        }

        address previousOperator = operator;
        operator = newOperator;

        emit OperatorUpdated(previousOperator, newOperator);
    }

    function getOrder(bytes32 orderId)
        external
        view
        returns (
            address trader,
            address tokenBase,
            address tokenQuote,
            bool isBuy,
            bool cancelled,
            bool closed,
            uint8 baseTokenDecimals,
            uint256 timestamp
        )
    {
        Order storage order = _orders[orderId];
        return (
            order.trader,
            order.tokenBase,
            order.tokenQuote,
            order.isBuy,
            order.cancelled,
            order.closed,
            order.baseTokenDecimals,
            order.timestamp
        );
    }

    function getOrderCiphertexts(bytes32 orderId)
        external
        view
        returns (bytes32 remainingBase, bytes32 limitPrice, bytes32 reservedQuote)
    {
        Order storage order = _orders[orderId];
        return (
            euint128.unwrap(order.remainingBase),
            euint128.unwrap(order.limitPrice),
            euint128.unwrap(order.reservedQuote)
        );
    }

    function getTrade(uint256 tradeId)
        external
        view
        returns (
            bytes32 buyOrderId,
            bytes32 sellOrderId,
            address buyer,
            address seller,
            address tokenBase,
            address tokenQuote,
            uint256 timestamp
        )
    {
        Trade storage trade = _trades[tradeId];
        return (
            trade.buyOrderId,
            trade.sellOrderId,
            trade.buyer,
            trade.seller,
            trade.tokenBase,
            trade.tokenQuote,
            trade.timestamp
        );
    }

    function getTradeCiphertexts(uint256 tradeId)
        external
        view
        returns (bytes32 baseAmount, bytes32 settlementPrice)
    {
        Trade storage trade = _trades[tradeId];
        return (
            euint128.unwrap(trade.baseAmount),
            euint128.unwrap(trade.settlementPrice)
        );
    }

    function getTradeKey(bytes32 buyOrderId, bytes32 sellOrderId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(buyOrderId, sellOrderId));
    }

    function _grantOrderAccess(Order storage order) private {
        FHE.allowThis(order.remainingBase);
        FHE.allowThis(order.limitPrice);
        FHE.allowThis(order.reservedQuote);

        FHE.allow(order.remainingBase, order.trader);
        FHE.allow(order.limitPrice, order.trader);
        FHE.allow(order.reservedQuote, order.trader);
        FHE.allow(order.remainingBase, operator);
        FHE.allow(order.limitPrice, operator);
    }

    function _grantTradeAccess(Trade storage trade) private {
        FHE.allowThis(trade.baseAmount);
        FHE.allowThis(trade.settlementPrice);

        FHE.allow(trade.baseAmount, trade.buyer);
        FHE.allow(trade.baseAmount, trade.seller);
        FHE.allow(trade.settlementPrice, trade.buyer);
        FHE.allow(trade.settlementPrice, trade.seller);
    }

    function _verifyMatchProof(
        Order storage buyOrder,
        Order storage sellOrder,
        MatchProof calldata proof
    ) private view {
        if (
            !FHE.verifyDecryptResultSafe(
                buyOrder.remainingBase,
                proof.buyRemainingBase,
                proof.buyRemainingBaseSig
            ) ||
            !FHE.verifyDecryptResultSafe(
                sellOrder.remainingBase,
                proof.sellRemainingBase,
                proof.sellRemainingBaseSig
            ) ||
            !FHE.verifyDecryptResultSafe(
                buyOrder.limitPrice,
                proof.buyLimitPrice,
                proof.buyLimitPriceSig
            ) ||
            !FHE.verifyDecryptResultSafe(
                sellOrder.limitPrice,
                proof.sellLimitPrice,
                proof.sellLimitPriceSig
            )
        ) {
            revert InvalidDecryptProof();
        }
    }

    function _buildSettlement(
        MatchProof calldata proof,
        uint8 baseTokenDecimals
    ) private pure returns (Settlement memory settlement) {
        settlement.matchedBase = proof.buyRemainingBase < proof.sellRemainingBase
            ? proof.buyRemainingBase
            : proof.sellRemainingBase;
        if (settlement.matchedBase == 0) {
            revert InvalidMatch();
        }

        settlement.settlementPrice = uint128(
            (uint256(proof.buyLimitPrice) + uint256(proof.sellLimitPrice)) / 2
        );
        settlement.quoteSpent = _quoteForBasePlain(
            settlement.matchedBase,
            settlement.settlementPrice,
            baseTokenDecimals
        );
        settlement.quoteReservedAtLimit = _quoteForBasePlain(
            settlement.matchedBase,
            proof.buyLimitPrice,
            baseTokenDecimals
        );
        settlement.quoteRefund = settlement.quoteReservedAtLimit - settlement.quoteSpent;
    }

    function _settleOrders(
        Order storage buyOrder,
        Order storage sellOrder,
        MatchProof calldata proof,
        Settlement memory settlement
    ) private returns (euint128 matchedBase, euint128 settlementPrice) {
        matchedBase = FHE.asEuint128(uint256(settlement.matchedBase));
        settlementPrice = FHE.asEuint128(uint256(settlement.settlementPrice));
        euint128 quoteSpent = FHE.asEuint128(uint256(settlement.quoteSpent));
        euint128 quoteReservedAtLimit = FHE.asEuint128(uint256(settlement.quoteReservedAtLimit));
        euint128 quoteRefund = FHE.asEuint128(uint256(settlement.quoteRefund));

        buyOrder.remainingBase = FHE.sub(buyOrder.remainingBase, matchedBase);
        sellOrder.remainingBase = FHE.sub(sellOrder.remainingBase, matchedBase);
        buyOrder.reservedQuote = FHE.sub(buyOrder.reservedQuote, quoteReservedAtLimit);

        if (settlement.matchedBase == proof.buyRemainingBase) {
            buyOrder.closed = true;
        }
        if (settlement.matchedBase == proof.sellRemainingBase) {
            sellOrder.closed = true;
        }

        _grantOrderAccess(buyOrder);
        _grantOrderAccess(sellOrder);

        FHE.allow(matchedBase, buyOrder.tokenBase);
        FHE.allow(quoteSpent, buyOrder.tokenQuote);
        FHE.allow(quoteRefund, buyOrder.tokenQuote);

        IPrivateERC20(buyOrder.tokenBase)._transferEncrypted(buyOrder.trader, matchedBase);
        IPrivateERC20(buyOrder.tokenQuote)._transferEncrypted(sellOrder.trader, quoteSpent);
        IPrivateERC20(buyOrder.tokenQuote)._transferEncrypted(buyOrder.trader, quoteRefund);
    }

    function _recordTrade(
        bytes32 buyOrderId,
        bytes32 sellOrderId,
        Order storage buyOrder,
        Order storage sellOrder,
        euint128 matchedBase,
        euint128 settlementPrice
    ) private returns (uint256 tradeId) {
        tradeCount += 1;
        tradeId = tradeCount;

        _trades[tradeId] = Trade({
            id: tradeId,
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            buyer: buyOrder.trader,
            seller: sellOrder.trader,
            tokenBase: buyOrder.tokenBase,
            tokenQuote: buyOrder.tokenQuote,
            baseAmount: matchedBase,
            settlementPrice: settlementPrice,
            timestamp: block.timestamp
        });

        _grantTradeAccess(_trades[tradeId]);
    }

    function _quoteForBase(
        euint128 baseAmount,
        euint128 price,
        uint8 baseTokenDecimals
    ) private returns (euint128) {
        return FHE.div(
            FHE.mul(baseAmount, price),
            FHE.asEuint128(10 ** uint256(baseTokenDecimals))
        );
    }

    function _quoteForBasePlain(
        uint128 baseAmount,
        uint128 price,
        uint8 baseTokenDecimals
    ) private pure returns (uint128) {
        uint256 quoteAmount = (
            uint256(baseAmount) * uint256(price)
        ) / (10 ** uint256(baseTokenDecimals));

        if (quoteAmount > type(uint128).max) {
            revert InvalidMatch();
        }

        return uint128(quoteAmount);
    }

    function _baseForQuote(
        euint128 quoteAmount,
        euint128 price,
        uint8 baseTokenDecimals
    ) private returns (euint128) {
        euint128 zero = FHE.asEuint128(0);
        euint128 baseAtPrice = FHE.div(
            FHE.mul(quoteAmount, FHE.asEuint128(10 ** uint256(baseTokenDecimals))),
            price
        );

        return FHE.select(FHE.gt(price, zero), baseAtPrice, zero);
    }
}

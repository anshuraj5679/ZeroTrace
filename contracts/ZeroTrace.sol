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

        euint128 reservedQuote = isBuy
            ? _quoteForBase(baseAmount, limitPrice, baseTokenDecimals)
            : FHE.asEuint128(0);

        if (isBuy) {
            FHE.allow(reservedQuote, tokenQuote);
            IPrivateERC20(tokenQuote)._transferFromEncrypted(msg.sender, address(this), reservedQuote);
        } else {
            FHE.allow(baseAmount, tokenBase);
            IPrivateERC20(tokenBase)._transferFromEncrypted(msg.sender, address(this), baseAmount);
        }

        _orders[orderId] = Order({
            id: orderId,
            trader: msg.sender,
            tokenBase: tokenBase,
            tokenQuote: tokenQuote,
            remainingBase: baseAmount,
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
        bool buyFilled,
        bool sellFilled
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

        ebool crossed = FHE.gte(buyOrder.limitPrice, sellOrder.limitPrice);
        euint128 matchedBase = FHE.select(
            crossed,
            FHE.min(buyOrder.remainingBase, sellOrder.remainingBase),
            FHE.asEuint128(0)
        );
        euint128 settlementPrice = FHE.select(
            crossed,
            FHE.div(FHE.add(buyOrder.limitPrice, sellOrder.limitPrice), FHE.asEuint128(2)),
            FHE.asEuint128(0)
        );
        euint128 quoteSpent = _quoteForBase(
            matchedBase,
            settlementPrice,
            buyOrder.baseTokenDecimals
        );
        euint128 quoteReservedAtLimit = _quoteForBase(
            matchedBase,
            buyOrder.limitPrice,
            buyOrder.baseTokenDecimals
        );
        euint128 quoteRefund = FHE.sub(quoteReservedAtLimit, quoteSpent);

        buyOrder.remainingBase = FHE.sub(buyOrder.remainingBase, matchedBase);
        sellOrder.remainingBase = FHE.sub(sellOrder.remainingBase, matchedBase);
        buyOrder.reservedQuote = FHE.sub(buyOrder.reservedQuote, quoteReservedAtLimit);

        if (buyFilled) {
            buyOrder.closed = true;
        }
        if (sellFilled) {
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

        tradeCount += 1;
        _trades[tradeCount] = Trade({
            id: tradeCount,
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

        _grantTradeAccess(_trades[tradeCount]);
        executedTrades[tradeKey] = true;

        emit TradeExecuted(
            tradeCount,
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
        returns (uint256 remainingBase, uint256 limitPrice, uint256 reservedQuote)
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
        returns (uint256 baseAmount, uint256 settlementPrice)
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
    }

    function _grantTradeAccess(Trade storage trade) private {
        FHE.allowThis(trade.baseAmount);
        FHE.allowThis(trade.settlementPrice);

        FHE.allow(trade.baseAmount, trade.buyer);
        FHE.allow(trade.baseAmount, trade.seller);
        FHE.allow(trade.settlementPrice, trade.buyer);
        FHE.allow(trade.settlementPrice, trade.seller);
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
}

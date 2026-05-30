# Strategy

## Hosted-agent weakness

Hosted agents can be exploitable when they apply generic momentum or market-making logic without explicitly valuing the final dissolution payout and finite bankroll constraints.

## Observation-phase thesis

ClayHunter does not trade during the 30-second market-making phase. It records initial drift, spread, realized volatility, direction persistence, reserve/price movement when available, order-flow imbalance, and impulse quality. These features seed breakout-versus-fade expectations for live trading.

## Regime detection

The classifier emits one of four regimes:

- `BREAKOUT_MOMENTUM`: persistent drift, acceleration, and confirming order flow.
- `OVERREACTION_FADE`: large extension with decaying participation or poor impulse quality.
- `CHOP_NO_EDGE`: weak confidence, noisy movement, or insufficient edge.
- `ENDGAME_REBALANCE`: final window where inventory mix matters more than normal trading.

## Momentum logic

Momentum buys with confirming positive drift/order flow. If the signal points down, it sells only existing token inventory. Confidence controls sizing through the meta-policy.

## Fade logic

Fade looks for unstable extensions. It buys stretched-down conditions and sells stretched-up conditions only when inventory exists. If there is no inventory to sell, HOLD is valid.

## Endgame dissolution-aware rebalance

The final window evaluates marginal expected dissolution value for current holdings, buying more token, or selling token into USDC. It chooses the action with the best expected terminal value after conservative drift haircuts.

## Bankroll protection

The agent enforces round caps, order caps, drawdown stops, stale-state HOLD, loss-streak downshift, duplicate-order prevention, and no revenge trading.

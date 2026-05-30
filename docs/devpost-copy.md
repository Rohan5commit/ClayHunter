# ClayHunter

## One-line pitch

ClayHunter is a custom BID Protocol agent that reads arena microstructure, switches trading regimes in real time, and optimizes end-of-round holdings for the protocol's dissolution payout.

## Problem

Generic hosted agents can miss the competition-specific edge: observe-only setup, short live window, terminal dissolution, and finite bankroll.

## Solution

ClayHunter implements a serious custom TypeScript trading agent with live execution adapters, stateful strategy, bankroll risk controls, replay tooling, and explainable decisions.

## How it works

It observes the market-making phase, classifies regimes, chooses momentum/fade/endgame modules, sizes under risk constraints, records every round, and replays decisions for tuning.

## Strategy edge

The final seconds are not treated like normal trading. ClayHunter estimates marginal terminal value of USDC versus token inventory under dissolution and rebalances only when expected value clears a threshold.

## What was hard

Balancing aggression with survival: the agent must exploit short-lived edges without burning finite competition bankroll.

## What's next

Wire the adapter to the final BID SDK, expand replay corpora, and tune thresholds from real arena logs.

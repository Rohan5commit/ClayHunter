export type AgentMode = "live" | "paper" | "replay";
export type RoundPhase = "PRE_GAME" | "OBSERVE_MM_PHASE" | "ACTIVE_TRADING" | "ENDGAME_REBALANCE" | "ROUND_COMPLETE";
export type Regime = "BREAKOUT_MOMENTUM" | "OVERREACTION_FADE" | "CHOP_NO_EDGE" | "ENDGAME_REBALANCE";
export type TradeAction = "BUY" | "SELL" | "HOLD";

export interface MarketTick {
  roundId: string;
  ts: number;
  phase?: RoundPhase;
  price: number;
  bid?: number;
  ask?: number;
  volumeUsd?: number;
  buyVolumeUsd?: number;
  sellVolumeUsd?: number;
  reserveToken?: number;
  reserveUsdc?: number;
  sequence?: number;
}

export interface InventoryState {
  usdc: number;
  token: number;
  avgEntryPrice: number;
  realizedPnl: number;
  lastMarkPrice: number;
}

export interface RoundState {
  roundId: string;
  phase: RoundPhase;
  startedAt: number;
  phaseStartedAt: number;
  liveStartedAt?: number;
  completeAt?: number;
  ticks: MarketTick[];
  inventory: InventoryState;
  bankrollUsd: number;
  trades: TradeFill[];
  lastDecision?: Decision;
}

export interface TradeFill {
  id: string;
  roundId: string;
  ts: number;
  action: Exclude<TradeAction, "HOLD">;
  sizeUsd: number;
  price: number;
  tokenAmount: number;
  feeUsd?: number;
  module: string;
}

export interface SignalSnapshot {
  drift: number;
  acceleration: number;
  realizedVolatility: number;
  directionPersistence: number;
  orderFlowImbalance: number;
  spreadBps: number;
  impulseQuality: number;
  extensionZ: number;
  participationTrend: number;
  timeRemainingSec: number;
}

export interface RegimeResult {
  regime: Regime;
  confidence: number;
  signals: SignalSnapshot;
  notes: string[];
}

export interface StrategyProposal {
  action: TradeAction;
  sizeUsd: number;
  confidence: number;
  expectedEdge: number;
  module: "momentum" | "fade" | "endgame" | "none";
  signals: Record<string, number | string | boolean>;
}

export interface Decision {
  action: TradeAction;
  sizeUsd: number;
  rationale: {
    regime: Regime;
    confidence: number;
    signals: Record<string, number | string | boolean>;
    riskOverride?: string;
    expectedEdge?: number;
    module: string;
    timeRemaining: number;
    inventoryState: InventoryState;
    finalAction: TradeAction;
    finalSize: number;
  };
}

export interface AgentEvent {
  type: "ROUND_CREATED" | "PHASE_CHANGED" | "MARKET_TICK" | "TRADE_FILL" | "ROUND_SETTLED";
  ts: number;
  roundId: string;
  payload: Record<string, unknown>;
}

export interface OrderIntent {
  roundId: string;
  action: Exclude<TradeAction, "HOLD">;
  sizeUsd: number;
  clientOrderId: string;
  reason: Decision["rationale"];
}

export interface RoundResult {
  roundId: string;
  ts: number;
  startBankrollUsd: number;
  endBankrollUsd: number;
  pnlUsd: number;
  moduleAttribution: Record<string, number>;
}

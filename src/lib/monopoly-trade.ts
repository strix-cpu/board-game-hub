import { type MonopolyState } from "@/lib/monopoly-engine";

export interface MonopolyTrade {
  id: string;
  from: string;
  to: string;
  offerCash: number;
  requestCash: number;
  offerProperties: number[];
  requestProperties: number[];
}

export function applyMonopolyTrade(state: MonopolyState, trade: MonopolyTrade): MonopolyState | null {
  if (trade.from === trade.to || trade.offerCash < 0 || trade.requestCash < 0) return null;
  const from = state.players[trade.from]; const to = state.players[trade.to];
  if (!from || !to || from.bankrupt || to.bankrupt || from.cash < trade.offerCash || to.cash < trade.requestCash) return null;
  if (trade.offerProperties.some((id) => state.properties[id]?.owner !== trade.from || state.properties[id]?.houses > 0)) return null;
  if (trade.requestProperties.some((id) => state.properties[id]?.owner !== trade.to || state.properties[id]?.houses > 0)) return null;
  const properties = { ...state.properties };
  trade.offerProperties.forEach((id) => { properties[id] = { ...properties[id]!, owner: trade.to }; });
  trade.requestProperties.forEach((id) => { properties[id] = { ...properties[id]!, owner: trade.from }; });
  return {
    ...state,
    properties,
    players: {
      ...state.players,
      [trade.from]: { ...from, cash: from.cash - trade.offerCash + trade.requestCash },
      [trade.to]: { ...to, cash: to.cash - trade.requestCash + trade.offerCash },
    },
  };
}

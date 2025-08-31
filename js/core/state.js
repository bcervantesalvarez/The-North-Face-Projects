// state.js — central app state and constants
export const state = {
  hourly: [],
  wtd: {},
  meta: {},
  filters: { startIdx: 0, endIdx: 0, minTxn: 0 },
  charts: { hourly: null, cume: null, tu: null, eff: null },
};

export const ORDER_DEFAULT = ["wrap-tu","wrap-hourly","wrap-eff","wrap-cume","wrap-table","wrap-week"];
export const SIZE_KEYS = ["plot-hourly","plot-cume","plot-tu","plot-eff","panel-table","panel-week"];
export const VIEW_IDS = ["wrap-hourly","wrap-cume","wrap-tu","wrap-eff","wrap-table","wrap-week"];

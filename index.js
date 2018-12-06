'use strict';

const binance = require('node-binance-api')();
const coins = ['XRPBTC', 'XRPETH', 'ETHBTC'];

binance.websockets.depth(coins, (() => {
  const last = {};
  for (let i = 0; i < coins.length; i++) last[coins[i]] = [];
  return depth => {
    const symbol = depth.s;
    const ask = depth.a[0] === undefined ? last[symbol][0] : depth.a[0];
    const bid = depth.b[0] === undefined ? last[symbol][1] : depth.b[0];
    last[symbol] = [ask, bid];
    console.dir({ [symbol]: { ask, bid } });
  };
}
)());




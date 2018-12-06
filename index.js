'use strict';

const Binance = require('node-binance-api');
const mysql = require('mysql');

const coins = [
  ['XRPBTC', 'XRPETH', 'ETHBTC', 1, 0.02],
  ['EOSBTC', 'EOSETH', 'ETHBTC', 1, 0.02]
];

const arbitrageStraight = (prices, pairs) => {
  const quantity = pairs[3];
  const ask1 = prices[pairs[0]][0];
  const bid1 = prices[pairs[0]][1];
  const bid2 = prices[pairs[1]][1];
  const bid3 = prices[pairs[2]][1];
  const volAsk1 = prices[pairs[0]][2];
  const volBid2 = prices[pairs[1]][3];
  const volBid3 = prices[pairs[2]][3];

  const xrpQuant = quantity / ask1;
  const ethQuant = xrpQuant * bid2;
  const btcQuant = ethQuant * bid3;
  const profit = ((btcQuant - quantity) / quantity)  * 100;
  console.log(pairs.toString() + ' ' + profit);
  return {
    'arb_pair': pairs[2].substr(0, 3),
    'arb_asset': pairs[0].substr(0, 3),
    'order1_price': ask1,
    'order1_volume': volAsk1,
    'order1_volume_btc': ask1 * volAsk1,
    'order2_price': bid2,
    'order2_volume': volBid2,
    'order2_volume_btc': volBid2 * bid1,
    'order3_price': bid3,
    'order3_volume': volBid3,
    'order3_volume_btc': volBid3 * bid3,
    'pattern_type': 1,
    'timestamp': Math.floor(Date.now() / 1000),
    profit,
  };
};

const arbitrageBackward = (prices, pairs) => {
  const quantity = pairs[3];
  const ask2 = prices[pairs[1]][0];
  const ask3 = prices[pairs[2]][0];
  const bid1 = prices[pairs[0]][1];
  const volAsk2 = prices[pairs[1]][2];
  const volAsk3 = prices[pairs[2]][2];
  const volBid1 = prices[pairs[0]][3];

  const ethQuant = quantity / ask3;
  const xrpQuant = ethQuant / ask2;
  const btcQuant = xrpQuant * bid1;
  const profit = ((btcQuant - quantity) / quantity)  * 100;
  console.log(pairs.toString() + ' ' + profit);
  return {
    'arb_pair': pairs[2].substr(0, 3),
    'arb_asset': pairs[0].substr(0, 3),
    'order1_price': ask3,
    'order1_volume': volAsk3,
    'order1_volume_btc': ask3 * volAsk3,
    'order2_price': ask2,
    'order2_volume': volAsk2,
    'order2_volume_btc': volAsk2 * bid1,
    'order3_price': bid1,
    'order3_volume': volBid1,
    'order3_volume_btc': bid1 * volBid1,
    'pattern_type': 2,
    'timestamp': Math.floor(Date.now() / 1000),
    profit
  };
};

const allIsReady = last => {
  for (const i in last) {
    if (last[i][0] === undefined || last[i][1] === undefined)
      return false;
  }
  return true;
};

const connection = mysql.createConnection({
  host: 'goodmusi.mysql.tools',
  user: 'goodmusi_bnc',
  password: 'pqzzyffb',
  database: 'goodmusi_bnc'
});

connection.connect(err => {
  if (err) {
    console.error('error connecting: ' + err.stack);
    throw err;
  }
  console.log('Connected to database as id: ' + connection.threadId);
});

const sendRes = (data) => {
  connection.query('INSERT INTO binance_arbitrage_test SET ?', data, error => {
    if (error) throw error;
  });
};

const callback = (pairs) => {
  const last = {};
  for (const i in pairs.slice(0, 3))
    last[pairs[i]] = [];
  return depth => {
    const symbol = depth.s;
    let ask, bid, volAsk, volBid;
    if (depth.a[0] !== undefined) {
      ask = parseFloat(depth.a[0][0]);
      volAsk = parseFloat(depth.a[0][1]);
    } else {
      ask = last[symbol][0];
      volAsk = last[symbol][2];
    }
    if (depth.b[0] !== undefined) {
      bid = parseFloat(depth.b[0][0]);
      volBid = parseFloat(depth.b[0][1]);
    } else {
      bid = last[symbol][1];
      volBid = last[symbol][3];
    }
    last[symbol] = [ask, bid, volAsk, volBid];
    if (!allIsReady(last)) return;

    const straight = arbitrageStraight(last, pairs);
    const backward = arbitrageBackward(last, pairs);
    if (straight['profit'] >= pairs[4]) {
      const msg = '-----WOW WRITING NOW TO DATABASE----- ';
      console.log(msg + straight['profit'] + pairs.toString());
      sendRes(straight);
    }
    if (backward['profit'] >= pairs[4]) {
      const msg = '-----WOW WRITING NOW TO DATABASE----- ';
      console.log(msg + straight['profit'] + pairs.toString());
      sendRes(backward);
    }
  };
};

// Start sockets
const sockets = [];
for (let i = 0; i < coins.length; i++) {
  const newSocket = new Binance();
  const pairs = [coins[i][0], coins[i][1], coins[i][2]];
  newSocket.websockets.depth(pairs, callback(coins[i]));
  sockets.push(newSocket);
}



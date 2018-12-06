'use strict';

const binance = require('node-binance-api')();
const mysql = require('mysql');
const coins = ['XRPBTC', 'XRPETH', 'ETHBTC'];
const quantity = 1;

const connection = mysql.createConnection({
  host: 'goodmusi.mysql.tools',
  user: 'goodmusi_bnc',
  password: 'pqzzyffb',
  database: 'goodmusi_bnc'
});

connection.connect(err => {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connection.threadId);
});


const arbitrageXRP = last => {
  const xrpQuant = quantity / last['XRPBTC'][0];
  const ethQuant = xrpQuant * last['XRPETH'][1];
  const btcQuant = ethQuant * last['ETHBTC'][1];
  const profit = ((btcQuant - quantity) / quantity)  * 100;
  console.log(profit);
  return {
    'order1_price': last['XRPBTC'][0],
    'order1_volume': last['XRPBTC'][2],
    'order1_volume_btc': last['XRPBTC'][0] * last['XRPBTC'][2],
    'order2_price': last['XRPETH'][1],
    'order2_volume': last['XRPETH'][3],
    'order2_volume_btc': last['XRPETH'][3] * last['XRPBTC'][1],
    'order3_price': last['ETHBTC'][1],
    'order3_volume': last['ETHBTC'][3],
    'order3_volume_btc': last['ETHBTC'][3] * last['ETHBTC'][1],
    'pattern_type': 1,
    profit
  };
};

const arbitrageETH = last => {
  const ethQuant = quantity / last['ETHBTC'][0];
  const xrpQuant = ethQuant / last['XRPETH'][0];
  const btcQuant = xrpQuant * last['XRPBTC'][1];
  const profit = ((btcQuant - quantity) / quantity)  * 100;
  console.log(profit);
  return {
    'order1_price': last['ETHBTC'][0],
    'order1_volume': last['ETHBTC'][2],
    'order1_volume_btc': last['ETHBTC'][0] * last['ETHBTC'][2],
    'order2_price': last['XRPETH'][0],
    'order2_volume': last['XRPETH'][2],
    'order2_volume_btc': last['XRPETH'][2] * last['XRPBTC'][1],
    'order3_price': last['XRPBTC'][1],
    'order3_volume': last['XRPBTC'][3],
    'order3_volume_btc': last['XRPBTC'][1] * last['XRPBTC'][3],
    'pattern_type': 2,
    profit
  };
};

const allNotUndef = last => {
  for (const i in last) {
    if (last[i][0] === undefined || last[i][1] === undefined)
      return false;
  }
  return true;
};

binance.websockets.depth(coins, (() => {
  const last = {};
  for (const i in coins) last[coins[i]] = [];
  return depth => {
    const symbol = depth.s;
    let ask, bid, volAsk, volBid;
    if (depth.a[0] === undefined) {
      ask = last[symbol][0];
      volAsk = last[symbol][2];
    } else {
      ask = parseFloat(depth.a[0][0]);
      volAsk = parseFloat(depth.a[0][1]);
    }

    if (depth.b[0] === undefined) {
      bid = last[symbol][1];
      volBid = last[symbol][3];
    } else {
      bid = parseFloat(depth.b[0][0]);
      volBid = parseFloat(depth.b[0][1]);
    }
    last[symbol] = [ask, bid, volAsk, volBid];

    if (!allNotUndef(last)) return;

    const xrp = arbitrageXRP(last);
    const eth = arbitrageETH(last);
    if (xrp['profit'] >= 0.2) {
      connection.query(`INSERT INTO binance_arbitrage_test 
      (\`arb_pair\`, \`arb_asset\`, \`order1_price\`, \`order1_volume\`, 
      \`order1_volume_btc\`, \`order2_price\`, \`order2_volume\`, 
      \`order2_volume_btc\`, \`order3_price\`, \`order3_volume\`, 
      \`order3_volume_btc\`, \`pattern_type\`, \`profit\`, 
      \`timestamp\`)
      VALUES ('ETH', 'XRP', 
      ${xrp['order1_price']}, ${xrp['order1_volume']}, ${xrp['order1_volume_btc']}, 
      ${xrp['order2_price']}, ${xrp['order2_volume']}, ${xrp['order2_volume_btc']}, 
      ${xrp['order3_price']}, ${xrp['order3_volume']}, ${xrp['order3_volume_btc']}, 
      ${xrp['pattern_type']}, ${xrp['profit']}, ${Math.floor(Date.now() / 1000)})`,
      (error) => {
        if (error) throw error;
      });
    }

    if (eth['profit'] >= 0.2) {
      connection.query(`INSERT INTO binance_arbitrage_test 
      (\`arb_pair\`, \`arb_asset\`, \`order1_price\`, \`order1_volume\`, 
      \`order1_volume_btc\`, \`order2_price\`, \`order2_volume\`, 
      \`order2_volume_btc\`, \`order3_price\`, \`order3_volume\`, 
      \`order3_volume_btc\`, \`pattern_type\`, \`profit\`, 
      \`timestamp\`)
      VALUES ('ETH', 'XRP', 
      ${eth['order1_price']}, ${eth['order1_volume']}, ${eth['order1_volume_btc']}, 
      ${eth['order2_price']}, ${eth['order2_volume']}, ${eth['order2_volume_btc']}, 
      ${eth['order3_price']}, ${eth['order3_volume']}, ${eth['order3_volume_btc']}, 
      ${eth['pattern_type']}, ${eth['profit']}, ${Math.floor(Date.now() / 1000)})`,
        (error) => {
          if (error) throw error;
        });
    }

  };
}
)());

'use strict';

const Binance = require('node-binance-api');
const mysql = require('mysql');


const mainCoin = 'BTC';
const coins = [
  ['ETH', 'XRP', 0.1, 0.5],
  ['ETH', 'EOS', 0.1, 0.5],
  ['ETH', 'QKC', 0.1, 0.5],
  ['ETH', 'EDO', 0.1, 0.5],
  ['ETH', 'ADA', 0.1, 0.5],
  ['ETH', 'ZRX', 0.1, 0.5],
  ['ETH', 'PPT', 0.1, 0.5],
  ['ETH', 'NEO', 0.1, 0.5],
  ['ETH', 'HOT', 0.1, 0.5],
  ['ETH', 'ICX', 0.1, 0.5],
  ['ETH', 'POWR', 0.1, 0.5],
  ['ETH', 'STRAT', 0.1, 0.5],
  ['ETH', 'WAVES', 0.1, 0.5],
  ['ETH', 'AION', 0.1, 0.5],
  ['ETH', 'ARK', 0.1, 0.5],
  ['ETH', 'BQX', 0.1, 0.5],
  ['ETH', 'DASH', 0.1, 0.5],
  ['ETH', 'ELF', 0.1, 0.5],
];
const sockets = [];

const arbitrageStraight = (prices, pairs) => {
  const quantity = pairs[3];
  const asks1 = prices[pairs[0]]['asks'];
  const bids2 = prices[pairs[1]]['bids'];
  const bids3 = prices[pairs[2]]['bids'];

  // first step
  let sum = 0, sumAmount = 0, assetVol = null, avgPrice = null;
  let volBTC = null;
  for (const key in asks1) {
    const tempMainCoinVol = key * asks1[key];
    if (tempMainCoinVol + sum > quantity) {
      const lambda = quantity - sum;
      const temp = lambda / key;
      assetVol = sumAmount + temp;
      sumAmount += asks1[key];
      avgPrice = 1 / (assetVol / quantity);
      volBTC = sumAmount * avgPrice;
      // console.log('AvgPrice: ' + avgPrice);
      // console.log('XRP_vol_btc: ' + volBTC);
      // console.log('XRP_volume: ' + sumAmount);
      // console.log('Реальное количество XRP: ' + assetVol);
      break;
    } else {
      sum += tempMainCoinVol;
      sumAmount += asks1[key];
    }
  }
  // second step
  let assetAmount = 0, amountETH = 0, fakeAmountETH = 0, avgPrice2 = null;
  for (const key in bids2) {
    if (assetAmount + bids2[key] >= assetVol) {
      const lambda = assetVol - assetAmount;
      fakeAmountETH = amountETH;
      fakeAmountETH += key * bids2[key];
      amountETH += key * lambda;
      avgPrice2 = amountETH / assetVol;
      // console.log('Avg Price: ' + avgPrice2);
      // console.log('ETH amount: ' + amountETH);
      // console.log('Fake ETH amount: ' + fakeAmountETH);
      break;
    }
    amountETH += key * bids2[key];
    assetAmount += bids2[key];
  }

  // third step
  let assetAmount2 = 0, amountBTC = 0, fakeAmountBTC = 0, avgPrice3 = null;
  for (const key in bids3) {
    if (assetAmount2 + bids3[key] >= amountETH) {
      const lambda = amountETH - assetAmount2;
      fakeAmountBTC = amountBTC;
      fakeAmountBTC += key * bids3[key];
      amountBTC += key * lambda;
      avgPrice3 = amountBTC / amountETH;
      // console.log('Avg price' + avgPrice3);
      // console.log('BTC amount: ' + amountBTC);
      // console.log('Fake BTC amount: ' + fakeAmountBTC);
      break;
    }
    amountBTC += key * bids3[key];
    assetAmount2 += bids3[key];
  }
  let assetAmount3 = 0, amountBTC2 = 0;
  for (const key in bids3) {
    if (assetAmount3 + bids3[key] >= fakeAmountETH) {
      const lambda = fakeAmountETH - assetAmount3;
      amountBTC2 += key * lambda;
      // console.log('BTC amount: ' + amountBTC2);
      break;
    }
    amountBTC2 += key * bids3[key];
    assetAmount3 += bids3[key];
  }
  console.log('\n')


  const profit = ((amountBTC - quantity) / quantity)  * 100;
  console.log(pairs.toString() + ' ' + profit);
  return {
    'arb_pair': pairs[2].slice(0, -mainCoin.length),
    'arb_asset': pairs[0].slice(0, -mainCoin.length),
    'order1_price': avgPrice,
    'order1_volume': sumAmount,
    'order1_volume_btc': volBTC,
    'order2_price': avgPrice2,
    'order2_volume': fakeAmountETH,
    'order2_volume_btc': amountBTC2,
    'order3_price': avgPrice3,
    'order3_volume': fakeAmountBTC,
    'order3_volume_btc': fakeAmountBTC * avgPrice3,
    'pattern_type': 1,
    'timestamp': Math.floor(Date.now() / 1000),
    profit,
  };
};

// const arbitrageBackward = (prices, pairs) => {
//   const quantity = pairs[3];
//   const asks1 = prices[pairs[0]]['asks'];
//   const asks2 = prices[pairs[1]]['asks'];
//   const asks3 = prices[pairs[2]]['asks'];
//   const bids1 = prices[pairs[0]]['bids'];
//   const bids2 = prices[pairs[1]]['bids'];
//   const bids3 = prices[pairs[2]]['bids'];
//
//   // first step
//   let sum = 0, sumAmount = 0, assetVol = null, avgPrice = null;
//   let volBTC = null;
//   for (const key in asks3) {
//     const tempMainCoinVol = key * asks3[key];
//     if (tempMainCoinVol + sum > quantity) {
//       const lambda = quantity - sum;
//       const temp = lambda / key;
//       assetVol = sumAmount + temp;
//       sumAmount += asks3[key];
//       avgPrice = 1 / (assetVol / quantity);
//       volBTC = sumAmount * avgPrice;
//       console.log('AvgPrice: ' + avgPrice);
//       console.log('ETH_vol_btc: ' + volBTC);
//       console.log('ETH_volume: ' + sumAmount);
//       console.log('Реальное количество ETH: ' + assetVol);
//       break;
//     } else {
//       sum += tempMainCoinVol;
//       sumAmount += asks3[key];
//     }
//   }
//
//   // second step
//   let sum2 = 0, sumAmount2 = 0, assetVol2 = null, avgPrice2 = null;
//   for (const key in asks2) {
//     const tempMainCoinVol = key * asks2[key];
//     if (tempMainCoinVol + sum2 > assetVol) {
//       const lambda = assetVol - sum2;
//       const temp = lambda / key;
//       assetVol2 = sumAmount2 + temp;
//       sumAmount2 += asks2[key];
//       avgPrice2 = 1 / (assetVol2 / assetVol);
//       const volBTC = sumAmount2 * avgPrice2;
//       console.log('AvgPrice: ' + avgPrice2);
//       console.log('ETH_vol_btc: ' + volBTC);
//       console.log('ETH_volume: ' + sumAmount2);
//       console.log('Реальное количество ETH: ' + assetVol2);
//       break;
//     } else {
//       sum2 += tempMainCoinVol;
//       sumAmount2 += asks2[key];
//     }
//   }
//
//   // third step
//   let assetAmount = 0, amountBTC = 0, fakeAmountBTC = 0, avgPrice3 = null;
//   for (const key in bids2) {
//     if (assetAmount + bids2[key] >= assetVol2) {
//       const lambda = assetVol2 - assetAmount;
//       fakeAmountBTC = amountBTC;
//       fakeAmountBTC += key * bids2[key];
//       amountBTC += key * lambda;
//       avgPrice3 = amountBTC / assetVol2;
//       console.log('Avg Price: ' + avgPrice3);
//       console.log('ETH amount: ' + amountBTC);
//       console.log('Fake ETH amount: ' + fakeAmountBTC);
//       break;
//     }
//     amountBTC += key * bids2[key];
//     assetAmount += bids2[key];
//   }
//   const profit = ((amountBTC - quantity) / quantity)  * 100;
//   console.log(pairs.toString() + ' ' + profit);
//   return {
//     'arb_pair': pairs[2].slice(0, -mainCoin.length),
//     'arb_asset': pairs[0].slice(0, -mainCoin.length),
//     'order1_price': avgPrice,
//     'order1_volume': sumAmount,
//     'order1_volume_btc': volBTC,
//     'order2_price': avgPrice2,
//     'order2_volume': sumAmount2,
//     'order2_volume_btc': volAsk2 * bid1,
//     'order3_price': bid1,
//     'order3_volume': volBid1,
//     'order3_volume_btc': bid1 * volBid1,
//     'pattern_type': 2,
//     'timestamp': Math.floor(Date.now() / 1000),
//     profit
//   };
// };

const allIsReady = last => {
  for (const i in last) {
    if (last[i]['asks'] === {} || last[i]['bids'] === {})
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

const equalObject = (obj1, obj2) => JSON.stringify(obj1) === JSON.stringify(obj2);



const callback = (pairs, pos) => {
  const last = {};
  for (const i in pairs.slice(0, 3))
    last[pairs[i]] = {
      'asks': {},
      'bids': {}
    };
  return (symbol, depth) => {


    const bids = sockets[pos].sortBids(depth.bids);
    const asks = sockets[pos].sortAsks(depth.asks);
    if (equalObject(asks, last[symbol]['asks']) && equalObject(bids, last[symbol]['bids'])) return;
    last[symbol] = { asks, bids };
    if (!allIsReady(last))
      return;

    const straight = arbitrageStraight(last, pairs);
    // const backward = arbitrageBackward(last, pairs);
    if (straight['profit'] - 0.225 >= pairs[4]) {
      const msg = '-----WOW WRITING NOW TO DATABASE----- ';
      console.log(msg + straight['profit'] + pairs.toString());
      sendRes(straight);
    }
    // if (backward['profit'] >= pairs[4]) {
    //   const msg = '-----WOW WRITING NOW TO DATABASE----- ';
    //   console.log(msg + straight['profit'] + pairs.toString());
    //   sendRes(backward);
    // }
  };
};

// Start sockets

for (let i = 0; i < coins.length; i++) {
  const newSocket = new Binance();
  const first = coins[i][1] + mainCoin;
  const second = coins[i][1] + coins[i][0];
  const third = coins[i][0] + mainCoin;
  const pairs = [first, second, third];
  const pairsData = pairs.concat([coins[i][2], coins[i][3]]);
  newSocket.websockets.depthCache(pairs, callback(pairsData, i));
  sockets.push(newSocket);
}



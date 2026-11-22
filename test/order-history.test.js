const test = require('node:test');
const assert = require('node:assert/strict');
const orders = require('../lib/orders');

const history = [
  { id: 1001, date: '28/12/2021' },
  { id: 1002, date: '05/01/2022', coupon: 'SAVE10' },
  { id: 1003, date: '14/01/2022' },
  { id: 1004, date: '30/01/2022', coupon: 'SAVE10' },
  { id: 1005, date: '02/02/2022' },
  { id: 1006, date: '18/02/2022' },
  { id: 1007, date: '04/03/2022', status: 'pending' },
  { id: 1008, date: '15/03/2022' }
];

function ids(filters) {
  return orders.list({ orders: history }, filters).map(order => order.id);
}

test('CURRENT BEHAVIOUR: order history sorts by day of month first', () => {
  assert.deepEqual(ids(), [1004, 1001, 1006, 1008, 1003, 1002, 1007, 1005]);
});

test('CURRENT BEHAVIOUR: the January date-picker range includes all eight orders', () => {
  assert.deepEqual(ids({ from: '2022-01-01', to: '2022-01-31' }),
    [1004, 1001, 1006, 1008, 1003, 1002, 1007, 1005]);
});

test('a single-day range includes the order on that date in either input format', () => {
  for (const date of ['2022-01-14', '14/01/2022']) {
    assert.deepEqual(ids({ from: date, to: date }), [1003]);
  }
});

test('status and coupon search can be combined and listing preserves storage order', () => {
  const original = history.slice();
  assert.deepEqual(ids({ status: 'completed', search: ' save10 ' }), [1004, 1002]);
  assert.deepEqual(ids({ status: 'pending', search: '1007' }), [1007]);
  assert.deepEqual(history, original);
});

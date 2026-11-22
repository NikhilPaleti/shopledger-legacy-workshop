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

test('order history lists the newest dates first across months and years', () => {
  assert.deepEqual(ids(), [1008, 1007, 1006, 1005, 1004, 1003, 1002, 1001]);
});

test('the January date-picker range returns only January orders, newest first', () => {
  assert.deepEqual(ids({ from: '2022-01-01', to: '2022-01-31' }), [1004, 1003, 1002]);
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

test('one-sided and cross-year date ranges include their endpoints', () => {
  assert.deepEqual(ids({ from: '2022-02-18' }), [1008, 1007, 1006]);
  assert.deepEqual(ids({ to: '2022-01-05' }), [1002, 1001]);
  assert.deepEqual(ids({ from: '28/12/2021', to: '2022-01-05' }), [1002, 1001]);
});

test('mixed stored date formats sort together, with the latest order ID first on the same day', () => {
  const db = { orders: [
    { id: 3, date: '2024-03-01' },
    { id: 4, date: '1/3/2024' },
    { id: 2, date: '29/02/2024' }
  ] };
  const result = orders.list(db, { from: '29/02/2024', to: '2024-03-01' });
  assert.deepEqual(result.map(order => order.id), [4, 3, 2]);
  assert.equal(result[0].date, '1/3/2024');
});

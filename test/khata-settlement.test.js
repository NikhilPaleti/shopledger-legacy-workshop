const test = require('node:test');
const assert = require('node:assert/strict');
const ledger = require('../lib/ledger');

function meeraAccount() {
  return {
    customers: [{ id: 1, name: 'Meera Joshi', openingBalance: 450,
      totalBilled: 1982.01, totalSettled: 1200, balance: 1232.01 }],
    settlements: [],
    nextSettlementId: 501
  };
}

test('the text payment from the Khata form adds ₹500 and leaves Meera owing ₹732.01', () => {
  const db = meeraAccount();
  const result = ledger.recordSettlement(db, '1', '500', 'upi', 'Counter payment');
  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(ledger.listCustomers(db)[0].balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});

test('a numeric ₹500 payment reduces the balance and records one settlement', () => {
  const db = meeraAccount();
  const result = ledger.recordSettlement(db, 1, 500, 'cash', 'Counter payment');
  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(ledger.listCustomers(db)[0].balance, 732.01);
  assert.deepEqual(db.settlements, [result.settlement]);
  assert.equal(result.settlement.id, 501);
  assert.equal(result.settlement.amount, 500);
  assert.equal(result.settlement.mode, 'cash');
  assert.equal(result.settlement.note, 'Counter payment');
  assert.equal(db.nextSettlementId, 502);
});

test('missing customers and nonpositive payments leave the ledger untouched', () => {
  for (const [id, amount] of [[9, 500], [1, '0'], [1, -1], [1, '']]) {
    const db = meeraAccount();
    assert.equal(ledger.recordSettlement(db, id, amount).ok, false);
    assert.deepEqual(db, meeraAccount());
  }
});

test('successive decimal payments use numeric totals even when the stored total is a string', () => {
  const db = meeraAccount();
  db.customers[0].totalSettled = '1200';
  ledger.recordSettlement(db, 1, '499.90');
  ledger.recordSettlement(db, 1, '0.10');
  assert.equal(db.customers[0].totalSettled, 1700);
  assert.equal(ledger.listCustomers(db)[0].balance, 732.01);
  assert.deepEqual(db.settlements.map(entry => entry.amount), [0.10, 499.90]);
});

test('invalid and non-finite payments do not change the account, history or next ID', () => {
  for (const amount of ['invalid', 'Infinity', ' ', null, true, [500], {}, NaN, Infinity]) {
    const db = meeraAccount();
    assert.equal(ledger.recordSettlement(db, 1, amount).ok, false);
    assert.deepEqual(db, meeraAccount());
  }
});

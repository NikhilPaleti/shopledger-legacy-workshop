const test = require('node:test');
const assert = require('node:assert/strict');
const { computeInvoiceFigures, render } = require('../lib/invoice');

const riceAndOil = {
  id: 1002, coupon: 'SAVE10', subtotal: 1020, discount: 102, tax: 45.90, total: 963.90,
  items: [
    { name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 },
    { name: 'Sunflower oil', sku: 'OIL-001', hsn: '1512', price: 190, qty: 2 }
  ]
};

const bulkOil = {
  id: 1004, coupon: 'SAVE10', subtotal: 2240, discount: 150, tax: 104.50, total: 2194.50,
  items: [{ name: 'Groundnut oil', hsn: '1508', price: 1120, qty: 2 }]
};

const gheeAndOil = {
  id: 1007, subtotal: 1280, discount: 0, tax: 127, total: 1407,
  items: [
    { name: 'Ghee', hsn: '0405', price: 450, qty: 2 },
    { name: 'Sunflower oil', hsn: '1512', price: 190, qty: 2 }
  ]
};

test('the 18% no-coupon control order #1008 agrees with checkout', () => {
  const order = {
    id: 1008, total: 590,
    items: [
      { name: 'Tea', hsn: '0902', price: 140, qty: 1 },
      { name: 'Sherbet', hsn: '2106', price: 180, qty: 2 }
    ]
  };
  const invoice = computeInvoiceFigures(order);
  assert.equal(invoice.subtotal, 500);
  assert.equal(invoice.discount, 0);
  assert.equal(invoice.tax, 90);
  assert.equal(invoice.total, order.total);
  assert.deepEqual(invoice.rows.map(row => row.lineTax), [25.20, 64.80]);
  assert.doesNotMatch(render(order), /Accountant Reconciliation Notice/);
});

test('an explicit 5% rate splits an odd paisa between CGST and SGST', () => {
  const invoice = computeInvoiceFigures({
    items: [{ name: 'Sample', hsn: '0902', gstRate: 5, price: 1, qty: 1 }]
  });
  assert.equal(invoice.rows[0].gstPercent, 5);
  assert.equal(invoice.tax, 0.05);
  assert.equal(invoice.cgst, 0.03);
  assert.equal(invoice.sgst, 0.02);
});

test('a legacy line without HSN or SKU prints placeholders and uses the fallback rate', () => {
  const invoice = computeInvoiceFigures({ items: [{ name: 'Legacy item', price: 10, qty: 2 }] });
  assert.deepEqual(invoice.rows, [
    { name: 'Legacy item', sku: '-', hsn: '-', qty: 2, price: 10,
      gstPercent: 18, line: 20, lineTax: 3.60 }
  ]);
});

test('an order without items has zero figures and no rows', () => {
  const expected = { subtotal: 0, discount: 0, tax: 0, cgst: 0, sgst: 0, total: 0, rows: [] };
  assert.deepEqual(computeInvoiceFigures({}), expected);
  assert.deepEqual(computeInvoiceFigures({ items: [] }), expected);
});

test('CURRENT BEHAVIOUR: #1002 taxes the gross at 18% before SAVE10', () => {
  const invoice = computeInvoiceFigures(riceAndOil);
  assert.equal(invoice.discount, 120.36);
  assert.equal(invoice.tax, 183.60);
  assert.equal(invoice.total, 1083.24);
  assert.deepEqual(invoice.rows.map(row => row.lineTax), [115.20, 68.40]);
});

test('CURRENT BEHAVIOUR: #1004 exceeds the SAVE10 discount cap', () => {
  const invoice = computeInvoiceFigures(bulkOil);
  assert.equal(invoice.discount, 264.32);
  assert.equal(invoice.tax, 403.20);
  assert.equal(invoice.total, 2378.88);
});

test('CURRENT BEHAVIOUR: #1007 uses 18% on uncouponed 12% and 5% items', () => {
  const invoice = computeInvoiceFigures(gheeAndOil);
  assert.deepEqual(invoice.rows.map(row => row.gstPercent), [18, 18]);
  assert.deepEqual(invoice.rows.map(row => row.lineTax), [162, 68.40]);
  assert.equal(invoice.tax, 230.40);
  assert.equal(invoice.total, 1510.40);
});

test('CURRENT BEHAVIOUR: the printed #1002 invoice warns of a ₹119.34 discrepancy', () => {
  const html = render(riceAndOil);
  assert.match(html, /Accountant Reconciliation Notice/);
  assert.match(html, /Invoice computed total \(₹1083\.24\)/);
  assert.match(html, /recorded total \(₹963\.90\) by \+₹119\.34/);
});

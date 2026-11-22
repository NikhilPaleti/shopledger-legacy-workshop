const test = require('node:test');
const assert = require('node:assert/strict');
const { computeInvoiceFigures, render } = require('../lib/invoice');
const { getGstReconciliation } = require('../lib/reports');

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

test('#1002 applies SAVE10 before calculating 5% GST on each line', () => {
  const invoice = computeInvoiceFigures(riceAndOil);
  assert.equal(invoice.discount, riceAndOil.discount);
  assert.equal(invoice.tax, riceAndOil.tax);
  assert.deepEqual([invoice.cgst, invoice.sgst], [22.95, 22.95]);
  assert.equal(invoice.total, riceAndOil.total);
  assert.deepEqual(invoice.rows.map(row => row.lineTax), [28.80, 17.10]);
});

test('#1004 caps SAVE10 at ₹150 and taxes the discounted oil at 5%', () => {
  const invoice = computeInvoiceFigures(bulkOil);
  assert.equal(invoice.discount, bulkOil.discount);
  assert.equal(invoice.tax, bulkOil.tax);
  assert.equal(invoice.total, bulkOil.total);
});

test('#1007 keeps the 12% and 5% HSN rates without a coupon', () => {
  const invoice = computeInvoiceFigures(gheeAndOil);
  assert.deepEqual(invoice.rows.map(row => row.gstPercent), [12, 5]);
  assert.deepEqual(invoice.rows.map(row => row.lineTax), [108, 19]);
  assert.equal(invoice.tax, gheeAndOil.tax);
  assert.equal(invoice.total, gheeAndOil.total);
});

test('the printed #1002 invoice shows the billed total and GST without a discrepancy warning', () => {
  const html = render(riceAndOil);
  assert.match(html, /Invoice Total<\/td><td class="r">₹963\.90<\/td>/);
  assert.match(html, /Total GST\)<\/td><td class="r">₹45\.90<\/td>/);
  assert.match(html, /₹28\.80<\/td>/);
  assert.match(html, /₹17\.10<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('GST audit reconciles invoice #1002 with the amount and GST billed at checkout', () => {
  const audit = getGstReconciliation({ orders: [riceAndOil] });
  const [row] = audit.rows;
  assert.equal(row.invoiceTotal, riceAndOil.total);
  assert.equal(row.invoiceTax, riceAndOil.tax);
  assert.equal(row.invoiceDiscount, riceAndOil.discount);
  assert.equal(audit.mismatchCount, 0);
  assert.equal(audit.totalDelta, 0);
});

test('a flat coupon is apportioned before taxing the 12% and 18% lines of #1003', () => {
  const invoice = computeInvoiceFigures({
    coupon: 'FLAT50',
    items: [
      { name: 'Butter', hsn: '0405', price: 260, qty: 1 },
      { name: 'Tea', hsn: '0902', price: 140, qty: 1 }
    ]
  });
  assert.equal(invoice.discount, 50);
  assert.deepEqual(invoice.rows.map(row => row.lineTax), [27.30, 22.05]);
  assert.equal(invoice.tax, 49.35);
  assert.equal(invoice.total, 399.35);
});

test('a genuine one-paisa ledger difference still appears in the audit and on the invoice', () => {
  const order = { ...riceAndOil, total: 963.89 };
  const audit = getGstReconciliation({ orders: [order] });
  assert.equal(audit.mismatchCount, 1);
  assert.equal(audit.totalDelta, 0.01);
  assert.match(render(order), /recorded total \(₹963\.89\) by \+₹0\.01/);
});

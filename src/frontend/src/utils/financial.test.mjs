import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFinancialNumber,
  formatRatio,
  formatPercent,
  formatCurrency,
  formatBillions,
  formatInteger,
  formatChange,
  formatScore,
} from './financial.ts';

test('parseFinancialNumber parses numbers and numeric strings', () => {
  assert.equal(parseFinancialNumber(42), 42);
  assert.equal(parseFinancialNumber(3.1415), 3.1415);
  assert.equal(parseFinancialNumber(0), 0);
  assert.equal(parseFinancialNumber(-15.5), -15.5);
  assert.equal(parseFinancialNumber('128.50'), 128.5);
  assert.equal(parseFinancialNumber('$1,250.75'), 1250.75);
  assert.equal(parseFinancialNumber('15.4%'), 15.4);
});

test('parseFinancialNumber rejects null, undefined, invalid strings without silent zeroing', () => {
  assert.equal(parseFinancialNumber(null), null);
  assert.equal(parseFinancialNumber(undefined), null);
  assert.equal(parseFinancialNumber(''), null);
  assert.equal(parseFinancialNumber('—'), null);
  assert.equal(parseFinancialNumber('-'), null);
  assert.equal(parseFinancialNumber('N/A'), null);
  assert.equal(parseFinancialNumber('NAN'), null);
  assert.equal(parseFinancialNumber('invalid_text'), null);
  assert.equal(parseFinancialNumber(NaN), null);
  assert.equal(parseFinancialNumber(Infinity), null);
  assert.equal(parseFinancialNumber({}), null);
});

test('formatRatio formats numbers and strings with fallback', () => {
  assert.equal(formatRatio(25.436), '25.44');
  assert.equal(formatRatio('25.436'), '25.44');
  assert.equal(formatRatio(null), '—');
  assert.equal(formatRatio(undefined, 2, 'N/A'), 'N/A');
  assert.equal(formatRatio('invalid'), '—');
  assert.equal(formatRatio(0), '0.00');
});

test('formatPercent handles alreadyPercent toggle', () => {
  assert.equal(formatPercent(15.5), '15.50%');
  assert.equal(formatPercent('15.5'), '15.50%');
  assert.equal(formatPercent(0.155, 1, false), '15.5%');
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(undefined, 2, true, 'N/A'), 'N/A');
});

test('formatCurrency formats with symbol and commas', () => {
  assert.equal(formatCurrency(12450.5), '$12,450.50');
  assert.equal(formatCurrency('12450.5'), '$12,450.50');
  assert.equal(formatCurrency(0), '$0.00');
  assert.equal(formatCurrency(null), '—');
  assert.equal(formatCurrency(null, 2, '$', 'N/A'), 'N/A');
});

test('formatBillions formats large numbers into B units', () => {
  assert.equal(formatBillions(2500000000000), '$2,500.00B');
  assert.equal(formatBillions(1500000000), '$1.50B');
  assert.equal(formatBillions(null), '—');
});

test('formatInteger formats whole numbers with commas', () => {
  assert.equal(formatInteger(1542030), '1,542,030');
  assert.equal(formatInteger('1542030'), '1,542,030');
  assert.equal(formatInteger(0), '0');
  assert.equal(formatInteger(null, '0'), '0');
  assert.equal(formatInteger(null), '—');
});

test('formatChange formats combined change and percentage', () => {
  assert.equal(formatChange(2.5, 1.25), '+2.50 (+1.25%)');
  assert.equal(formatChange(-3.2, -1.8), '-3.20 (-1.80%)');
  assert.equal(formatChange(null, null), '—');
  assert.equal(formatChange(2.5, null), '+2.50');
  assert.equal(formatChange(null, 1.25), '+1.25%');
});

test('formatScore formats polarity with positive sign', () => {
  assert.equal(formatScore(0.42), '+0.42');
  assert.equal(formatScore(-0.35), '-0.35');
  assert.equal(formatScore(0), '0.00');
  assert.equal(formatScore('0.42'), '+0.42');
  assert.equal(formatScore(null), '—');
});

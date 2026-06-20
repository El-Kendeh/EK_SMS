/* One-off read-only check of the getFinanceAnalytics aggregation queries.
   Run: node scripts/test-analytics.js  (delete after verification) */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Op } = require('sequelize');
const sequelize = require('../src/config/db');
const Payment = require('../src/models/Payment');
const Expense = require('../src/models/Expense');
const Fee = require('../src/models/Fee');

(async () => {
  try {
    const any = await Payment.findOne({ attributes: ['school_id'], raw: true });
    if (!any) { console.log('No payments in DB — nothing to aggregate (queries still validated below with empty result).'); }
    const schoolId = any ? any.school_id : 1;
    console.log('Testing with school_id =', schoolId);

    const payWhere = { school_id: schoolId, status: 'completed' };
    const payMonth = sequelize.literal("DATE_FORMAT(paid_at, '%Y-%m')");

    const monthly = await Payment.findAll({
      where: payWhere,
      attributes: [
        [payMonth, 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [payMonth],
      order: [[payMonth, 'ASC']],
      raw: true,
    });
    console.log('monthly revenue:', JSON.stringify(monthly));

    const methods = await Payment.findAll({
      where: payWhere,
      attributes: [
        'payment_method',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['payment_method'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      raw: true,
    });
    console.log('methods:', JSON.stringify(methods));

    const expMonth = sequelize.literal("DATE_FORMAT(date, '%Y-%m')");
    const expenses = await Expense.findAll({
      where: { school_id: schoolId, status: 'approved' },
      attributes: [[expMonth, 'month'], [sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      group: [expMonth],
      order: [[expMonth, 'ASC']],
      raw: true,
    });
    console.log('monthly expenses:', JSON.stringify(expenses));

    const debtors = await Fee.findAll({
      where: { school_id: schoolId, status: { [Op.in]: ['pending', 'partial'] } },
      attributes: [
        'student_id',
        [sequelize.fn('SUM', sequelize.literal('amount_due - amount_paid')), 'balance'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'open_fees'],
      ],
      group: ['student_id'],
      order: [[sequelize.literal('balance'), 'DESC']],
      limit: 8,
      raw: true,
    });
    console.log('top debtors:', JSON.stringify(debtors));

    console.log('ALL AGGREGATION QUERIES OK');
    process.exit(0);
  } catch (err) {
    console.error('QUERY FAILED:', err.message);
    process.exit(1);
  }
})();

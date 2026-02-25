const pool = require('../config/db');

async function generateApplicationNumber(stationId) {
  const station = await pool.query(
    'SELECT station_code FROM stations WHERE id=$1',
    [stationId]
  );

  const stationCode = station.rows[0].station_code;
  const year = new Date().getFullYear().toString().slice(-2);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM applications 
     WHERE application_number LIKE $1`,
    [`APL${stationCode}${year}%`]
  );

  const count = parseInt(countResult.rows[0].count);
  const sequence = String(count + 1).padStart(5, '0');

  return `APL${stationCode}${year}${sequence}`;
}

module.exports = generateApplicationNumber;
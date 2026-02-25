const express = require('express');
const pool = require('../config/db');

const router = express.Router();


// 🔹 CREATE STATION (Protected by Secret Key)
router.post('/create', async (req, res) => {
  try {
    const { station_code, station_name, secretKey } = req.body;

    if (secretKey !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const existing = await pool.query(
      'SELECT * FROM stations WHERE station_code=$1',
      [station_code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Station already exists" });
    }

    const result = await pool.query(
      'INSERT INTO stations (station_code, station_name) VALUES ($1,$2) RETURNING *',
      [station_code, station_name]
    );

    res.status(201).json({
      message: "Station created successfully",
      station: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔹 GET ALL STATIONS (For Dropdown)
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM stations ORDER BY station_name ASC'
    );

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
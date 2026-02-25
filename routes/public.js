const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/license/:licenseNumber', async (req, res) => {
  const result = await pool.query(
    `SELECT l.*, a.authorized_name, a.authorized_phone, 
            a.authorized_address, a.shop_category
     FROM licenses l
     JOIN applications a 
       ON l.application_number = a.application_number
     WHERE l.license_number=$1`,
    [req.params.licenseNumber]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ message: "License not found" });

  res.json(result.rows[0]);
});

module.exports = router;
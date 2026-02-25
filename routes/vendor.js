const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const generateApplicationNumber = require('../utils/applicationGenerator');
const generateLicensePDF = require('../utils/licensePdfGenerator');
const generateApplicationPDF = require('../utils/applicationPdfGenerator');
const isEligibleForRenewal = require('../utils/renewalCheck');

const router = express.Router();


// ================= AUTH =================

// 🔹 REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await pool.query(
      'SELECT * FROM vendors WHERE email=$1',
      [email]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Vendor already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO vendors (name,email,password) VALUES ($1,$2,$3) RETURNING id,name,email',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "Vendor registered", vendor: result.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔹 LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM vendors WHERE email=$1',
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: "Vendor not found" });

    const vendor = result.rows[0];

    const validPassword = await bcrypt.compare(password, vendor.password);

    if (!validPassword)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: vendor.id, type: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: "Vendor login successful", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= APPLICATION =================

// 🔹 Apply Fresh
router.post('/apply', async (req, res) => {
  try {
    const {
      vendor_id,
      station_id,
      authorized_name,
      authorized_phone,
      authorized_address,
      pan_no,
      gst_no,
      aadhar_no,
      platform_no,
      shop_size_sqft,
      shop_category
    } = req.body;

    const applicationNumber = await generateApplicationNumber(station_id);

    const result = await pool.query(
      `INSERT INTO applications
       (application_number, vendor_id, station_id,
        authorized_name, authorized_phone, authorized_address,
        pan_no, gst_no, aadhar_no,
        platform_no, shop_size_sqft, shop_category,
        application_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        applicationNumber, vendor_id, station_id,
        authorized_name, authorized_phone, authorized_address,
        pan_no, gst_no, aadhar_no,
        platform_no, shop_size_sqft, shop_category,
        'fresh'
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔹 View Applications
router.get('/applications/:vendorId', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE vendor_id=$1',
    [req.params.vendorId]
  );
  res.json(result.rows);
});


// 🔹 View Licenses (with expiry check)
router.get('/licenses/:vendorId', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM licenses WHERE vendor_id=$1',
    [req.params.vendorId]
  );

  const updated = result.rows.map(l => {
    if (new Date() > l.valid_to) l.status = 'expired';
    return l;
  });

  res.json(updated);
});


// 🔹 Apply Renewal
router.post('/renew/:licenseNumber', async (req, res) => {
  try {
    const licenseResult = await pool.query(
      'SELECT * FROM licenses WHERE license_number=$1',
      [req.params.licenseNumber]
    );

    const license = licenseResult.rows[0];

    if (!isEligibleForRenewal(license.valid_to))
      return res.status(400).json({
        message: "Renewal allowed only within 2 months before expiry"
      });

    const applicationNumber = await generateApplicationNumber(license.station_id);

    const result = await pool.query(
      `INSERT INTO applications
       (application_number, vendor_id, station_id,
        application_type, renewal_for_license, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        applicationNumber,
        license.vendor_id,
        license.station_id,
        'renewal',
        license.license_number,
        'submitted'
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔹 Download License PDF
router.get('/download-license/:licenseNumber', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM licenses WHERE license_number=$1',
    [req.params.licenseNumber]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ message: "License not found" });

  await generateLicensePDF(res, result.rows[0]);
});


// 🔹 DOWNLOAD APPLICATION PDF
router.get('/download-application/:applicationNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, s.station_name
       FROM applications a
       JOIN stations s ON a.station_id = s.id
       WHERE a.application_number=$1`,
      [req.params.applicationNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Application not found"
      });
    }

    await generateApplicationPDF(res, result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
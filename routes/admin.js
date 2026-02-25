const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const generateLicenseNumber = require('../utils/licenseGenerator');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const router = express.Router();


// ================= ADMIN AUTH =================

// 🔹 ADMIN REGISTER (Protected by Secret Key)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    if (secretKey !== process.env.ADMIN_SECRET)
      return res.status(403).json({ message: "Unauthorized access" });

    const existing = await pool.query(
      'SELECT * FROM admin WHERE email=$1',
      [email]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO admin (name,email,password) VALUES ($1,$2,$3) RETURNING id,name,email',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "Admin created", admin: result.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔹 ADMIN LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM admin WHERE email=$1',
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: "Admin not found" });

    const admin = result.rows[0];

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: admin.id, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: "Admin login successful", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= PROTECTED ROUTES =================

router.use(verifyToken, verifyRole('admin'));


// 🔹 VIEW ALL APPLICATIONS
router.get('/applications/all', async (req, res) => {
  const result = await pool.query(`
    SELECT a.*, s.station_name
    FROM applications a
    JOIN stations s ON a.station_id = s.id
    ORDER BY a.applied_at DESC
  `);
  res.json(result.rows);
});

router.get('/applications/fresh', async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM applications WHERE application_type='fresh' AND status='submitted'"
  );
  res.json(result.rows);
});

router.get('/applications/renewal', async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM applications WHERE application_type='renewal' AND status='submitted'"
  );
  res.json(result.rows);
});


// 🔹 APPROVE FRESH
router.put('/approve-fresh/:applicationNumber', async (req, res) => {
  try {
    const applicationNumber = req.params.applicationNumber;

    const appResult = await pool.query(
      `SELECT * FROM applications 
       WHERE application_number=$1 
       AND application_type='fresh'
       AND status='submitted'`,
      [applicationNumber]
    );

    if (appResult.rows.length === 0)
      return res.status(404).json({ message: "Fresh application not found" });

    const application = appResult.rows[0];
    const licenseNumber = await generateLicenseNumber(application.station_id);

    const today = new Date();
    const validTo = new Date();
    validTo.setFullYear(today.getFullYear() + 2);

    await pool.query('BEGIN');

    await pool.query(
      "UPDATE applications SET status='approved' WHERE application_number=$1",
      [applicationNumber]
    );

    await pool.query(
      `INSERT INTO licenses
       (application_number, vendor_id, station_id,
        license_number, valid_from, valid_to, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        applicationNumber,
        application.vendor_id,
        application.station_id,
        licenseNumber,
        today,
        validTo,
        'active'
      ]
    );

    await pool.query('COMMIT');

    res.json({ message: "Fresh approved", licenseNumber });

  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});


// 🔹 APPROVE RENEWAL
router.put('/approve-renewal/:applicationNumber', async (req, res) => {
  try {
    const applicationNumber = req.params.applicationNumber;

    const appResult = await pool.query(
      `SELECT * FROM applications
       WHERE application_number=$1
       AND application_type='renewal'
       AND status='submitted'`,
      [applicationNumber]
    );

    if (appResult.rows.length === 0)
      return res.status(404).json({ message: "Renewal not found" });

    const application = appResult.rows[0];

    const licenseResult = await pool.query(
      "SELECT * FROM licenses WHERE license_number=$1",
      [application.renewal_for_license]
    );

    const license = licenseResult.rows[0];

    const newValidTo = new Date(license.valid_to);
    newValidTo.setFullYear(newValidTo.getFullYear() + 2);

    await pool.query('BEGIN');

    await pool.query(
      "UPDATE applications SET status='approved' WHERE application_number=$1",
      [applicationNumber]
    );

    await pool.query(
      "UPDATE licenses SET valid_to=$1, status='active' WHERE license_number=$2",
      [newValidTo, license.license_number]
    );

    await pool.query('COMMIT');

    res.json({ message: "Renewal approved", newValidTo });

  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});


router.put('/reject-fresh/:applicationNumber', async (req, res) => {
  await pool.query(
    "UPDATE applications SET status='rejected' WHERE application_number=$1",
    [req.params.applicationNumber]
  );
  res.json({ message: "Fresh rejected" });
});

router.put('/reject-renewal/:applicationNumber', async (req, res) => {
  await pool.query(
    "UPDATE applications SET status='rejected' WHERE application_number=$1",
    [req.params.applicationNumber]
  );
  res.json({ message: "Renewal rejected" });
});

module.exports = router;
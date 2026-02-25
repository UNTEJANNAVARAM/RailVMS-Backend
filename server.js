require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const vendorRoutes = require('./routes/vendor');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const stationRoutes = require('./routes/station');

app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/station', stationRoutes);

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
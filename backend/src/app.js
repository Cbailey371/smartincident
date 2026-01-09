const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const incidentRoutes = require('./routes/incidentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const ticketTypeRoutes = require('./routes/ticketTypeRoutes');
const companyRoutes = require('./routes/companyRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Force Headers for Uploads
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ticket-types', ticketTypeRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
const notificationConfigRoutes = require('./routes/notificationConfigRoutes');
app.use('/api/settings/notifications', notificationConfigRoutes);
const commentRoutes = require('./routes/commentRoutes');
app.use('/api/incidents/:incidentId/comments', commentRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Tickets API' });
});

module.exports = app;

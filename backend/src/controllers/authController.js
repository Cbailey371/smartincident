const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sendEmail } = require('../services/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        console.log(`[LOGIN DEBUG] Attempt for ${email}`);

        if (!user) {
            console.log("[LOGIN DEBUG] User not found");
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`[LOGIN DEBUG] User found: ${user.id}, Role: ${user.role}, HashExists: ${!!user.password_hash}`);

        if (!user.password_hash) {
            console.log("[LOGIN DEBUG] No password hash found");
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`[LOGIN DEBUG] Password match: ${isMatch}`);

        if (isMatch) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company_id: user.company_id,
                token: generateToken(user.id),
            });
        } else {
            console.log("[LOGIN DEBUG] Password mismatch");
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.reset_token = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.reset_token_expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        await sendEmail({
            to: user.email,
            subject: 'Password Reset Token',
            text: message,
            html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
        });

        res.status(200).json({ data: 'Email sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const resetToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    try {
        const user = await User.findOne({
            where: {
                reset_token: resetToken,
                reset_token_expiry: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        user.password_hash = await bcrypt.hash(req.body.password, 10);
        user.reset_token = null;
        user.reset_token_expiry = null;
        await user.save();

        res.status(200).json({ data: 'Password updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // From protect middleware

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Verify old password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }

        // Hash new password
        user.password_hash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

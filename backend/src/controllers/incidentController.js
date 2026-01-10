const { Incident, User, Company, TicketType, Attachment } = require('../models');
const { Op } = require('sequelize');
const { sendEmail } = require('../services/emailService');

exports.createIncident = async (req, res) => {
    try {
        const { title, description, priority, type_id, assignee_id } = req.body;

        const reporter_id = req.user.id;

        // Determine Company ID
        let company_id = req.user.company_id;
        if (['superadmin', 'agent'].includes(req.user.role) && req.body.company_id) {
            company_id = req.body.company_id;
        }

        // Generate Ticket Code: INC-{CompanyID}-{TimeHex} (Simple unique generation)
        // In production, might want a sequential counter per company.
        const timestamp = Date.now().toString(36).toUpperCase();
        const codePrefix = company_id ? `INC-${company_id}` : 'INC-GLB';
        const ticket_code = `${codePrefix}-${timestamp}`;

        const incident = await Incident.create({
            ticket_code,
            title,
            description,
            priority,
            status: 'open',
            reporter_id,
            company_id,
            assignee_id: assignee_id || null, // Optional
            type_id: type_id || null
        });

        if (req.file) {
            await Attachment.create({
                file_path: req.file.path,
                original_name: req.file.originalname,
                incident_id: incident.id
            });
        }

        // NOTIFICATIONS
        // Wrap in try-catch to ensure Incident creation succeeds even if notifications fail
        try {
            const reporter = await User.findByPk(reporter_id);
            console.log(`[CreateIncident] Reporter found: ${reporter ? reporter.email : 'No'}`);

            // 1. Notify Reporter (Client)
            if (reporter && reporter.email) {
                try {
                    await sendEmail({
                        to: reporter.email,
                        subject: `Ticket Creado: ${ticket_code} - ${title}`,
                        text: `Hemos recibido tu incidencia. Código: ${ticket_code}. Un agente la revisará pronto.`,
                        html: `<h3>Ticket Registrado</h3><p>Tu incidencia <strong>${ticket_code}</strong> ha sido creada exitosamente.</p><p>Título: ${title}</p>`
                    });
                    console.log(`[CreateIncident] Email sent to reporter: ${reporter.email}`);
                } catch (err) {
                    console.error(`[CreateIncident] Failed to email reporter:`, err);
                }
            }

            // 2. Notify Superadmin (and Assignee if exists)
            // Use Op.or for safer case handling instead of iLike which might be dialect specific
            const admins = await User.findAll({
                where: {
                    role: { [Op.or]: ['superadmin', 'Superadmin', 'SuperAdmin'] }
                }
            });
            console.log(`[CreateIncident] Found ${admins.length} superadmins to notify.`);

            for (const admin of admins) {
                if (admin.email) {
                    try {
                        await sendEmail({
                            to: admin.email,
                            subject: `[Nuevo Ticket] ${ticket_code} - ${title}`,
                            text: `Nuevo ticket creado por ${reporter?.name || 'Usuario'}. Prioridad: ${priority}.`,
                            html: `<p>Se ha creado un nuevo ticket en el sistema.</p><p><strong>Creado por:</strong> ${reporter?.name}</p><p><strong>Título:</strong> ${title}</p><p><a href="https://smartincident.cbtechpty.com/incidents/${incident.id}">Ver Ticket</a></p>`
                        });
                        console.log(`[CreateIncident] Email sent to admin: ${admin.email}`);
                    } catch (err) {
                        console.error(`[CreateIncident] Failed to email admin ${admin.email}:`, err);
                    }
                } else {
                    console.log(`[CreateIncident] Admin ${admin.id} has no email.`);
                }
            }

            if (assignee_id) {
                const assignee = await User.findByPk(assignee_id);
                if (assignee && assignee.email) {
                    try {
                        await sendEmail({
                            to: assignee.email,
                            subject: `[Asignado] Ticket ${ticket_code}`,
                            text: `Se te ha asignado el ticket ${ticket_code}.`,
                            html: `<p>Se te ha asignado un nuevo ticket.</p><p><a href="https://smartincident.cbtechpty.com/incidents/${incident.id}">Ver Ticket</a></p>`
                        });
                        console.log(`[CreateIncident] Email sent to assignee: ${assignee.email}`);
                    } catch (err) {
                        console.error(`[CreateIncident] Failed to email assignee:`, err);
                    }
                } else {
                    console.log(`[CreateIncident] Assignee ${assignee_id} not found or no email.`);
                }
            }
        } catch (notificationError) {
            console.error('[CreateIncident] CRITICAL NOTIFICATION ERROR:', notificationError);
            // Do NOT throw here, so the client still gets the 201 Created response
        }

        res.status(201).json(incident);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllIncidents = async (req, res) => {
    try {
        let whereClause = {};

        // Multi-tenancy Filtering
        if (req.user.role === 'superadmin') {
            // Can see all. Optionally filter by company_id query param
            if (req.query.company_id && req.query.company_id !== 'all') whereClause.company_id = req.query.company_id;
        }
        else if (req.user.role === 'company_admin') {
            whereClause.company_id = req.user.company_id;
        }
        else if (req.user.role === 'client') {
            whereClause.reporter_id = req.user.id;
        }
        else if (req.user.role === 'agent') {
            whereClause = {
                [Op.or]: [
                    { assignee_id: req.user.id },
                    // { company_id: [Array of supported IDs] } 
                ]
            };
        }

        // Common Filters (applied on top of role restrictions)
        if (req.query.status && req.query.status !== 'all') {
            if (req.query.status.includes(',')) {
                whereClause.status = { [Op.in]: req.query.status.split(',') };
            } else {
                whereClause.status = req.query.status;
            }
        }

        if (req.query.priority && req.query.priority !== 'all') {
            whereClause.priority = req.query.priority;
        }

        if (req.query.assignee_id && req.query.assignee_id !== 'all') {
            // Ensure we don't override role-based assignee restrictions blindly, 
            // but for now, intersecting role restrictions with query params is complex.
            // Simplified: If user is superadmin/company_admin, they can filter by assignee.
            // If agent, they usually see their own, so filtering by another assignee might result in empty.
            whereClause.assignee_id = req.query.assignee_id;
        }

        if (req.query.ticket_code) {
            whereClause.ticket_code = { [Op.like]: `%${req.query.ticket_code}%` };
        }

        const incidents = await Incident.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'reporter', attributes: ['name', 'email'] },
                { model: User, as: 'assignee', attributes: ['name', 'email'] },
                { model: Company, as: 'company', attributes: ['name'] },
                // { model: TicketType, as: 'type', attributes: ['name'] } 
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id, {
            include: [
                { model: User, as: 'reporter', attributes: ['name', 'email'] },
                { model: User, as: 'assignee', attributes: ['name', 'email'] },
                { model: Company, as: 'company', attributes: ['name'] },
                { model: Attachment }
            ]
        });

        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        // Authorization check for ID access
        if (req.user.role === 'client' && incident.reporter_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to view this ticket' });
        }
        if (req.user.role === 'company_admin' && incident.company_id !== req.user.company_id) {
            return res.status(403).json({ error: 'Unauthorized to view this ticket' });
        }

        res.json(incident);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateIncident = async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        const previousAssigneeId = incident.assignee_id;
        const previousStatus = incident.status;

        await incident.update(req.body);

        // Notifications Logic check
        const updatedIncident = await Incident.findByPk(req.params.id, {
            include: [
                { model: User, as: 'reporter', attributes: ['name', 'email'] },
                { model: User, as: 'assignee', attributes: ['name', 'email'] }
            ]
        });

        // A. Assignment Change
        if (req.body.assignee_id && req.body.assignee_id !== previousAssigneeId) {
            if (updatedIncident.assignee && updatedIncident.assignee.email) {
                await sendEmail({
                    to: updatedIncident.assignee.email,
                    subject: `[Asignado] Ticket ${updatedIncident.ticket_code}`,
                    text: `Se te ha asignado el ticket ${updatedIncident.ticket_code}.`,
                    html: `<p>El ticket <strong>${updatedIncident.ticket_code}</strong> ha sido asignado a tu usuario.</p><p><a href="https://smartincident.cbtechpty.com/incidents/${incident.id}">Ver Ticket</a></p>`
                });
            }
        }

        // B. Status Closed/Resolved
        if (req.body.status && (req.body.status === 'closed' || req.body.status === 'resolved') && previousStatus !== req.body.status) {
            if (updatedIncident.reporter && updatedIncident.reporter.email) {
                await sendEmail({
                    to: updatedIncident.reporter.email,
                    subject: `[Actualización] Ticket ${updatedIncident.ticket_code} está ${req.body.status}`,
                    text: `Tu ticket ha cambiado de estado a: ${req.body.status}.`,
                    html: `<p>Tu ticket <strong>${updatedIncident.ticket_code}</strong> ha sido actualizado a estado: <strong>${req.body.status}</strong>.</p><p><a href="https://smartincident.cbtechpty.com/incidents/${incident.id}">Ver Ticket</a></p>`
                });
            }
        }

        res.json(incident);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteIncident = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Solo el Superadmin puede eliminar incidentes' });
        }

        const incident = await Incident.findByPk(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        await incident.destroy();
        res.json({ message: 'Incidente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

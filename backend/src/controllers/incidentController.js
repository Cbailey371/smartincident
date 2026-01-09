const { Incident, User, Company, TicketType, Attachment } = require('../models');
const { Op } = require('sequelize');

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

        // Add Authz checks here if needed specific to Update

        await incident.update(req.body);
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

const { Incident, sequelize, User, Company, TicketType } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardMetrics = async (req, res) => {
    try {
        const { startDate, endDate, companyId } = req.query;
        let whereClause = {};

        // 1. Basic Multi-tenancy / Role filters
        if (req.user.role === 'company_admin') {
            whereClause.company_id = req.user.company_id;
        } else if (req.user.role === 'client') {
            whereClause.reporter_id = req.user.id;
        } else if (companyId && req.user.role === 'superadmin') {
            whereClause.company_id = companyId;
        }

        // 2. Date Range Filter
        if (startDate && endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // --- METRICS CALCULATIONS ---

        // M1: Incidentes Activos (Current Operational Load)
        const activeIncidents = await Incident.count({
            where: { ...whereClause, status: { [Op.notIn]: ['resolved', 'closed'] } }
        });

        // M2: Incidentes Críticos (P1)
        const criticalIncidents = await Incident.count({
            where: { ...whereClause, priority: 'critical', status: { [Op.notIn]: ['resolved', 'closed'] } }
        });

        // Get all resolved/closed tickets in this period for MTTR and SLA
        const resolvedTickets = await Incident.findAll({
            where: {
                ...whereClause,
                status: { [Op.in]: ['resolved', 'closed'] }
            },
            include: [{ model: TicketType, as: 'type' }]
        });

        // M3 & M4: SLA Compliance & MTTR
        let slaMetCount = 0;
        let totalResolutionTime = 0; // in milliseconds

        resolvedTickets.forEach(t => {
            const resolutionTimeMs = new Date(t.updatedAt) - new Date(t.createdAt);
            totalResolutionTime += resolutionTimeMs;

            if (t.type && t.type.sla_resolution) {
                const slaMs = t.type.sla_resolution * 60 * 60 * 1000;
                if (resolutionTimeMs <= slaMs) {
                    slaMetCount++;
                }
            } else {
                // If no type/SLA defined, assume default 24h as per model
                if (resolutionTimeMs <= (24 * 60 * 60 * 1000)) slaMetCount++;
            }
        });

        const slaCompliance = resolvedTickets.length > 0
            ? Math.round((slaMetCount / resolvedTickets.length) * 100)
            : 100;

        const mttrSeconds = resolvedTickets.length > 0
            ? Math.floor((totalResolutionTime / resolvedTickets.length) / 1000)
            : 0;

        const mttrFormatted = mttrSeconds > 0
            ? `${Math.floor(mttrSeconds / 3600)}h ${Math.floor((mttrSeconds % 3600) / 60)}m`
            : "0h 0m";

        // M5: Incidentes Vencidos (Overdue Open Tickets)
        // We consider an open ticket overdue if it exceeds the resolution SLA
        // For simplicity, we'll fetch open ones and check against their type SLA
        const openTickets = await Incident.findAll({
            where: { ...whereClause, status: { [Op.notIn]: ['resolved', 'closed'] } },
            include: [{ model: TicketType, as: 'type' }]
        });

        let overdueCount = 0;
        const now = new Date();
        openTickets.forEach(t => {
            const ageMs = now - new Date(t.createdAt);
            const slaMs = (t.type?.sla_resolution || 24) * 60 * 60 * 1000;
            if (ageMs > slaMs) overdueCount++;
        });

        // M6: Incidentes Nuevos Hoy
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const newToday = await Incident.count({
            where: { ...whereClause, createdAt: { [Op.gte]: startOfToday } }
        });

        // M7: Backlog Total (Same as Active but usually refers to the queue debt)
        const backlogTotal = activeIncidents;

        // Recent Activity
        const recentIncidents = await Incident.findAll({
            where: whereClause,
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: ['reporter', 'assignee', 'company']
        });

        res.json({
            metrics: {
                active: activeIncidents,
                critical: criticalIncidents,
                slaCompliance: `${slaCompliance}%`,
                mttr: mttrFormatted,
                overdue: overdueCount,
                newToday: newToday,
                backlog: backlogTotal
            },
            recentIncidents
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

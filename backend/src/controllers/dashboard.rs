use axum::{
    extract::{State, Query},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::incident;
use crate::middleware::auth::AuthUser;
use sea_orm::*;

#[derive(Deserialize)]
pub struct DashboardQuery {
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "companyId")]
    pub company_id: Option<i32>,
}

pub async fn get_dashboard_metrics(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<DashboardQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Logic mostly for superadmin/company_admin. 
    // Agents/Clients usually use different dashboards but let's support authorized users.
    
    // Parse dates
    let _start = params.start_date.as_deref().unwrap_or("1970-01-01"); // Simple default
    let _end = params.end_date.as_deref().unwrap_or("2099-12-31");

    // Base query
    let mut query = incident::Entity::find();

    // Filter by role
    match user.user.role.as_str() {
        "superadmin" => {
            if let Some(cid) = params.company_id {
                query = query.filter(incident::Column::CompanyId.eq(cid));
            }
        },
        "company_admin" => {
            if let Some(cid) = user.user.company_id {
                query = query.filter(incident::Column::CompanyId.eq(cid));
            } else {
                return Err((StatusCode::FORBIDDEN, Json(json!({"error": "No company assigned"}))));
            }
        },
        _ => {
            // Limited view for others? Or allow read for analytics?
            // For now let's allow read if authorized
        }
    }

    // Use query logic to get counts. 
    // Optimization: In a real app we would use Count queries instead of fetching all.
    // For 1GB server and low traffic, fetching all metadata might be okay for MVP (limit 500?), 
    // but proper `select count(*)` is better.
    // Let's do simple separate queries for metrics to be robust.

    // 1. All incidents matching criteria
    let incidents = query.all(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Calculate metrics in memory (good enough for small scale)
    let active = incidents.iter().filter(|i| i.status != "resolved" && i.status != "closed").count();
    let critical = incidents.iter().filter(|i| i.priority == "high" || i.priority == "critical").count();
    // overdue logic implies SLA check, for now simple placeholder or status check
    let overdue = incidents.iter().filter(|i| i.status == "overdue").count(); 
    let new_today = incidents.iter().count(); // Check created_at vs today if needed, for MVP returning total or filtered list count

    // recent incidents (last 5)
    let recent_incidents: Vec<Value> = incidents.iter()
        .rev()
        .take(5)
        .map(|i| json!({
            "id": i.id,
            "ticket_code": i.ticket_code,
            "title": i.title,
            "status": i.status,
            "createdAt": i.created_at.to_string(), // ISO format
            // "company": ... we would need to fetch company name or join
        }))
        .collect();

    let metrics = json!({
        "active": active,
        "critical": critical,
        "slaCompliance": "100%", // Placeholder
        "mttr": "2h 30m", // Placeholder
        "overdue": overdue,
        "newToday": new_today,
        "backlog": active // Same as active?
    });

    Ok(Json(json!({
        "metrics": metrics,
        "recentIncidents": recent_incidents
    })))
}

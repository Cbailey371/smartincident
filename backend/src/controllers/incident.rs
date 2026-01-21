use axum::{
    extract::{State, Path, Query, Multipart},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::{incident, user, attachment, company};
use crate::middleware::auth::AuthUser;
use crate::utils::email::EmailService;
use sea_orm::{entity::*, query::*, EntityTrait, QueryFilter, ColumnTrait};
use chrono::Utc;
use std::path::Path as stdPath;
use tokio::fs;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentQuery {
    pub company_id: Option<String>, // Keep internal name snake_case if preferred, but serde will map from companyId
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee_id: Option<i32>,
    pub ticket_code: Option<String>,
}

pub async fn get_all_incidents(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<IncidentQuery>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let mut query = incident::Entity::find();

    // Role-based filtering
    match user.user.role.as_str() {
        "superadmin" => {
            if let Some(cid) = params.company_id {
                if cid != "all" {
                    if let Ok(id) = cid.parse::<i32>() {
                        query = query.filter(incident::Column::CompanyId.eq(id));
                    }
                }
            }
        }
        "client" => {
            if let Some(cid) = user.user.company_id {
                query = query.filter(incident::Column::CompanyId.eq(cid));
            } else {
                query = query.filter(incident::Column::ReporterId.eq(user.user.id));
            }
        }
        "agent" => {
            query = query.filter(incident::Column::AssigneeId.eq(user.user.id));
        }
        _ => return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized role"})))),
    }

    // Additional filters
    if let Some(status_str) = params.status {
        if status_str != "all" {
            let statuses: Vec<String> = status_str.split(',').map(|s| s.to_string()).collect();
            if !statuses.is_empty() {
                query = query.filter(incident::Column::Status.is_in(statuses));
            }
        }
    }

    if let Some(priority) = params.priority {
        if priority != "all" {
            query = query.filter(incident::Column::Priority.eq(priority));
        }
    }

    if let Some(assignee_id) = params.assignee_id {
        query = query.filter(incident::Column::AssigneeId.eq(assignee_id));
    }

    if let Some(code) = params.ticket_code {
        query = query.filter(incident::Column::TicketCode.contains(&code));
    }

    let incidents_with_related = query
        .find_with_related(company::Entity)
        .order_by_desc(incident::Column::CreatedAt)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut result: Vec<Value> = Vec::new();

    for (inc, companies) in incidents_with_related {
        let mut inc_val = json!(inc);
        inc_val["company"] = json!(companies.first());
        
        // Also fetch assignee if exists
        if let Some(aid) = inc.assignee_id {
            let assignee = user::Entity::find_by_id(aid).one(&state.db).await.unwrap_or(None);
            inc_val["assignee"] = json!(assignee);
        }

        result.push(inc_val);
    }

    Ok(Json(json!(result)))
}


pub async fn create_incident(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<incident::Model>), (StatusCode, Json<Value>)> {
    let mut title = String::new();
    let mut description = String::new();
    let mut priority = String::new();
    let mut type_id: Option<i32> = None;
    let mut company_id_input: Option<i32> = None;
    let mut file_data: Option<(String, Vec<u8>, String)> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))))? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "title" => title = field.text().await.unwrap_or_default(),
            "description" => description = field.text().await.unwrap_or_default(),
            "priority" => priority = field.text().await.unwrap_or_default(),
            "typeId" => type_id = field.text().await.ok().and_then(|t| t.parse().ok()),
            "companyId" => company_id_input = field.text().await.ok().and_then(|c| c.parse().ok()),
            "image" | "file" => {
                let file_name = field.file_name().unwrap_or("upload").to_string();
                let mime = field.content_type().unwrap_or("application/octet-stream").to_string();
                let bytes = field.bytes().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
                file_data = Some((file_name, bytes.to_vec(), mime));
            }
            _ => {}
        }
    }

    if title.is_empty() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Title is required"}))));
    }

    let company_id = match user.user.role.as_str() {
        "superadmin" | "agent" => company_id_input.or(user.user.company_id).unwrap_or(0),
        _ => user.user.company_id.unwrap_or(0),
    };

    let timestamp = Utc::now().timestamp().to_string();
    let code_prefix = if company_id != 0 { format!("INC-{}", company_id) } else { "INC-GLB".into() };
    let ticket_code = format!("{}-{}", code_prefix, timestamp);

    if type_id.is_none() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Debe seleccionar un Tipo de Incidente"}))));
    }

    let new_incident = incident::ActiveModel {
        ticket_code: Set(Some(ticket_code)),
        title: Set(title),
        description: Set(description),
        priority: Set(priority),
        status: Set("open".into()),
        reporter_id: Set(user.user.id),
        company_id: Set(company_id),
        type_id: Set(type_id.unwrap()), // Safe now
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };

    let incident = new_incident
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Handle File Upload if present
    if let Some((file_name, bytes, mime)) = file_data {
        let upload_dir = "uploads";
        let _ = fs::create_dir_all(upload_dir).await;
        let ts = Utc::now().timestamp_millis();
        let safe_name = format!("{}-{}", ts, file_name);
        let save_path = stdPath::new(upload_dir).join(&safe_name);
        
        if fs::write(&save_path, bytes).await.is_ok() {
            let relative_path = format!("uploads/{}", safe_name);
            let _ = attachment::ActiveModel {
                file_path: Set(relative_path),
                original_name: Set(file_name),
                mime_type: Set(mime),
                incident_id: Set(Some(incident.id)),
                created_at: Set(Utc::now().into()),
                updated_at: Set(Utc::now().into()),
                ..Default::default()
            }.insert(&state.db).await;
        }
    }

    // Email notifications (same as before)
    let db_clone = state.db.clone();
    let user_email = user.user.email.clone();
    let res_ticket_code = incident.ticket_code.clone().unwrap_or_default();
    let res_title = incident.title.clone();
    
    tokio::spawn(async move {
        let _ = EmailService::send_email(
            &db_clone,
            user_email,
            format!("Ticket Creado: {} - {}", res_ticket_code, res_title),
            format!("Hemos recibido tu incidencia. Código: {}. Un agente la revisará pronto.", res_ticket_code),
            Some(format!("<h3>Ticket Registrado</h3><p>Tu incidencia <strong>{}</strong> ha sido creada exitosamente.</p><p>Título: {}</p>", res_ticket_code, res_title))
        ).await;

        if let Ok(admins) = user::Entity::find()
            .filter(user::Column::Role.eq("superadmin"))
            .all(&db_clone)
            .await {
                for admin in admins {
                    let _ = EmailService::send_email(
                        &db_clone,
                        admin.email,
                        format!("[Nuevo Ticket] {} - {}", res_ticket_code, res_title),
                        format!("Nuevo ticket creado.\nCódigo: {}\nTítulo: {}", res_ticket_code, res_title),
                        None
                    ).await;
                }
            }
    });

    Ok((StatusCode::CREATED, Json(incident)))
}

pub async fn get_incident_by_id(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let incident = incident::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Incident not found"}))))?;

    // Authorization check
    if user_auth.user.role == "client" {
        if let Some(cid) = user_auth.user.company_id {
            if incident.company_id != cid {
                return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized (Company Mismatch)"}))));
            }
        } else if incident.reporter_id != user_auth.user.id {
            return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized (Not Reporter)"}))));
        }
    }

    let mut inc_val = json!(incident);

    // Fetch Reporter
    let reporter = user::Entity::find_by_id(incident.reporter_id).one(&state.db).await.unwrap_or(None);
    inc_val["reporter"] = json!(reporter);

    // Fetch Assignee
    if let Some(aid) = incident.assignee_id {
        let assignee = user::Entity::find_by_id(aid).one(&state.db).await.unwrap_or(None);
        inc_val["assignee"] = json!(assignee);
    }

    // Fetch Company
    if incident.company_id != 0 {
        let comp = company::Entity::find_by_id(incident.company_id).one(&state.db).await.unwrap_or(None);
        inc_val["company"] = json!(comp);
    }

    // Fetch Attachments
    let attachments = attachment::Entity::find()
        .filter(attachment::Column::IncidentId.eq(incident.id))
        .all(&state.db)
        .await
        .unwrap_or_default();
    inc_val["attachments"] = json!(attachments);

    Ok(Json(inc_val))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIncidentRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee_id: Option<i32>, // serde maps from assigneeId
}

pub async fn update_incident(
    State(state): State<AppState>,
    AuthUser { .. }: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateIncidentRequest>,
) -> Result<Json<incident::Model>, (StatusCode, Json<Value>)> {
    let incident = incident::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Incident not found"}))))?;

    let mut am: incident::ActiveModel = incident.into();

    if let Some(t) = payload.title { am.title = Set(t); }
    if let Some(d) = payload.description { am.description = Set(d); }
    if let Some(s) = payload.status { am.status = Set(s); }
    if let Some(p) = payload.priority { am.priority = Set(p); }
    if let Some(a) = payload.assignee_id { am.assignee_id = Set(Some(a)); }
    
    am.updated_at = Set(Utc::now().into());

    let updated = am.update(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(updated))
}

pub async fn delete_incident(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can delete incidents"}))));
    }

    let incident = incident::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Incident not found"}))))?;

    incident.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "Incident deleted successfully"})))
}

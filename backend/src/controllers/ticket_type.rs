use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::{ticket_type, incident};
use crate::middleware::auth::AuthUser;
use sea_orm::{entity::*, EntityTrait, QueryFilter, ColumnTrait};
use chrono::Utc;

pub async fn get_all_ticket_types(
    State(state): State<AppState>,
    _: AuthUser,
) -> Result<Json<Vec<ticket_type::Model>>, (StatusCode, Json<Value>)> {
    let types = ticket_type::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(types))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTicketTypeRequest {
    pub name: String,
    pub description: Option<String>,
    pub sla_response: i32,
    pub sla_resolution: i32,
    pub is_global: bool,
    pub companies: Option<Value>, // Ignore if sent
}

pub async fn create_ticket_type(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateTicketTypeRequest>,
) -> Result<(StatusCode, Json<ticket_type::Model>), (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let new_type = ticket_type::ActiveModel {
        name: Set(payload.name),
        description: Set(payload.description),
        sla_response: Set(payload.sla_response),
        sla_resolution: Set(payload.sla_resolution),
        is_global: Set(payload.is_global),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };

    let model = new_type
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(model)))
}

pub async fn update_ticket_type(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateTicketTypeRequest>,
) -> Result<Json<ticket_type::Model>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let tt = ticket_type::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Ticket type not found"}))))?;

    let mut am: ticket_type::ActiveModel = tt.into();
    am.name = Set(payload.name);
    am.description = Set(payload.description);
    am.sla_response = Set(payload.sla_response);
    am.sla_resolution = Set(payload.sla_resolution);
    am.is_global = Set(payload.is_global);
    am.updated_at = Set(Utc::now().into());

    let updated = am.update(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(updated))
}

pub async fn delete_ticket_type(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let tt = ticket_type::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Ticket type not found"}))))?;

    // 1. Delete all incidents of this type
    incident::Entity::delete_many()
        .filter(incident::Column::TypeId.eq(id))
        .exec(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related incidents: {}", e)}))))?;

    // 2. Delete the ticket type
    tt.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "Ticket type deleted successfully"})))
}

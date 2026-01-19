use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::company;
use crate::middleware::auth::AuthUser;
use sea_orm::{entity::*, EntityTrait};
use chrono::Utc;

pub async fn get_all_companies(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<company::Model>>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can list companies"}))));
    }

    let companies = company::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(companies))
}

#[derive(Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    pub address: Option<String>,
    pub contact_email: Option<String>,
}

pub async fn create_company(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateCompanyRequest>,
) -> Result<(StatusCode, Json<company::Model>), (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can create companies"}))));
    }

    let new_company = company::ActiveModel {
        name: Set(payload.name),
        address: Set(payload.address),
        contact_email: Set(payload.contact_email),
        created_at: Set(Utc::now().naive_utc()),
        updated_at: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    let company = new_company
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(company)))
}

pub async fn get_company_by_id(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<company::Model>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" && user.user.company_id != Some(id) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let company = company::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Company not found"}))))?;

    Ok(Json(company))
}

pub async fn update_company(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateCompanyRequest>,
) -> Result<Json<company::Model>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let company = company::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Company not found"}))))?;

    let mut am: company::ActiveModel = company.into();
    am.name = Set(payload.name);
    am.address = Set(payload.address);
    am.contact_email = Set(payload.contact_email);
    am.updated_at = Set(Utc::now().naive_utc());

    let updated = am.update(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(updated))
}

pub async fn delete_company(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let company = company::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Company not found"}))))?;

    company.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "Company deleted successfully"})))
}

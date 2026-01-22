use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::{company, user, incident, comment, attachment};
use crate::middleware::auth::AuthUser;
use sea_orm::{entity::*, EntityTrait, ColumnTrait, QueryFilter, PaginatorTrait, sea_query::Expr};
use chrono::Utc;

pub async fn get_all_companies(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can list companies"}))));
    }

    let companies = company::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut result: Vec<Value> = Vec::new();

    for c in companies {
        let user_count: u64 = user::Entity::find()
            .filter(user::Column::CompanyId.eq(c.id))
            .count(&state.db)
            .await
            .unwrap_or(0);

        let incident_count: u64 = incident::Entity::find()
            .filter(incident::Column::CompanyId.eq(c.id))
            .count(&state.db)
            .await
            .unwrap_or(0);

        let mut company_val = json!(c);
        company_val["usersCount"] = json!(user_count);
        company_val["ticketsCount"] = json!(incident_count);
        result.push(company_val);
    }

    Ok(Json(json!(result)))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCompanyRequest {
    pub name: String,
    pub address: Option<String>,
    pub contact_email: Option<String>,
    pub status: String,
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
        status: Set(payload.status),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
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
    am.status = Set(payload.status);
    am.updated_at = Set(Utc::now().into());

    let updated = am.update(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Cascade inactivation: if company is inactive, deactivate all its users
    if updated.status == "inactive" {
        user::Entity::update_many()
            .col_expr(user::Column::Status, Expr::value("inactive"))
            .filter(user::Column::CompanyId.eq(id))
            .exec(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Error deactivating users: {}", e)}))))?;
    }

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

    // 1. Delete all incidents of this company
    let company_incidents = incident::Entity::find()
        .filter(incident::Column::CompanyId.eq(id))
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let incident_ids: Vec<i32> = company_incidents.iter().map(|i| i.id).collect();

    if !incident_ids.is_empty() {
        // Find all comments for these incidents
        let comments = comment::Entity::find()
            .filter(comment::Column::IncidentId.is_in(incident_ids.clone()))
            .all(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        
        let comment_ids: Vec<i32> = comments.iter().map(|c| c.id).collect();

        // 1. Delete attachments linked to these comments
        if !comment_ids.is_empty() {
            attachment::Entity::delete_many()
                .filter(attachment::Column::CommentId.is_in(comment_ids))
                .exec(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related comment attachments: {}", e)}))))?;
        }

        // 2. Delete attachments linked to these incidents
        attachment::Entity::delete_many()
            .filter(attachment::Column::IncidentId.is_in(incident_ids.clone()))
            .exec(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related incident attachments: {}", e)}))))?;

        // 3. Delete comments of these incidents
        comment::Entity::delete_many()
            .filter(comment::Column::IncidentId.is_in(incident_ids.clone()))
            .exec(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related comments: {}", e)}))))?;

        // 4. Delete the incidents themselves
        incident::Entity::delete_many()
            .filter(incident::Column::CompanyId.eq(id))
            .exec(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related incidents: {}", e)}))))?;
    }

    // 2. Delete all users of this company
    user::Entity::delete_many()
        .filter(user::Column::CompanyId.eq(id))
        .exec(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related users: {}", e)}))))?;

    // 3. Delete the company
    company.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "Company deleted successfully"})))
}

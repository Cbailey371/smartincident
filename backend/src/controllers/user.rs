use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::user;
use crate::middleware::auth::AuthUser;
use sea_orm::{entity::*, EntityTrait, QueryFilter, ColumnTrait};
use chrono::Utc;
use bcrypt::{hash, DEFAULT_COST};

pub async fn get_all_users(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<user::Model>>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can list users"}))));
    }

    let users = user::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(users))
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub password: Option<String>,
    pub role: String,
    pub company_id: Option<i32>,
}

pub async fn create_user(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<user::Model>), (StatusCode, Json<Value>)> {
    if user_auth.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can create users"}))));
    }

    // Check if user exists
    let exists = user::Entity::find()
        .filter(user::Column::Email.eq(&payload.email))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    if exists.is_some() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "User with this email already exists"}))));
    }

    let password_hash = if let Some(pwd) = payload.password {
        Some(hash(pwd, DEFAULT_COST).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing error"}))))?)
    } else {
        None
    };

    let new_user = user::ActiveModel {
        name: Set(payload.name),
        email: Set(payload.email),
        role: Set(payload.role),
        password_hash: Set(password_hash),
        company_id: Set(payload.company_id),
        created_at: Set(Utc::now().naive_utc()),
        updated_at: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    let user_model = new_user
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(user_model)))
}

pub async fn get_user_by_id(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<user::Model>, (StatusCode, Json<Value>)> {
    if user_auth.user.role != "superadmin" && user_auth.user.id != id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let user_model = user::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    Ok(Json(user_model))
}

pub async fn update_user(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<user::Model>, (StatusCode, Json<Value>)> {
    if user_auth.user.role != "superadmin" && user_auth.user.id != id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let user_model = user::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    let mut am: user::ActiveModel = user_model.into();
    am.name = Set(payload.name);
    am.email = Set(payload.email);
    am.role = Set(payload.role);
    am.company_id = Set(payload.company_id);
    
    if let Some(pwd) = payload.password {
        if !pwd.is_empty() {
            let hashed = hash(pwd, DEFAULT_COST).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing error"}))))?;
            am.password_hash = Set(Some(hashed));
        }
    }
    
    am.updated_at = Set(Utc::now().naive_utc());

    let updated = am.update(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(updated))
}

pub async fn delete_user(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user_auth.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can delete users"}))));
    }

    let user_model = user::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    user_model.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "User deleted successfully"})))
}

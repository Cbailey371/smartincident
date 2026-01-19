use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use crate::AppState;
use crate::models::user;
use crate::middleware::auth::AuthUser;
use sea_orm::EntityTrait;
use serde_json::{json, Value};

pub async fn get_all_users(
    State(state): State<AppState>,
    _: AuthUser,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let users = user::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!(users)))
}

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use crate::AppState;
use crate::utils::jwt::verify_token;
use crate::models::user;
use sea_orm::EntityTrait;

pub struct AuthUser {
    pub user: user::Model,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let state = parts
            .extensions
            .get::<AppState>()
            .ok_or((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "State error"}))))?;

        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "No authorization header"}))))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid authorization header"}))));
        }

        let token = &auth_header[7..];
        let claims = verify_token(token)
            .map_err(|_| (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))))?;

        let user = user::Entity::find_by_id(claims.id)
            .one(&state.db)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))))?
            .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "User not found"}))))?;

        if user.status != "active" {
            return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Cuenta desactivada"}))));
        }

        Ok(AuthUser { user })
    }
}

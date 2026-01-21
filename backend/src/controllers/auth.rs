use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use crate::AppState;
use crate::models::user;
use crate::utils::jwt::generate_token;
use crate::utils::email::EmailService;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use bcrypt::{verify, hash, DEFAULT_COST};
use uuid::Uuid;
use chrono::{Utc, Duration};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub role: String,
    pub company_id: Option<i32>,
    pub token: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<Value>)> {
    let user = user::Entity::find()
        .filter(user::Column::Email.eq(payload.email))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid email or password"}))))?;

    let password_hash = user.password_hash.as_ref().ok_or((
        StatusCode::UNAUTHORIZED,
        Json(json!({"error": "Invalid email or password"})),
    ))?;

    if !verify(payload.password, password_hash).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Bcrypt error"}))))? {
        return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid email or password"}))));
    }

    let token = generate_token(user.id);

    Ok(Json(LoginResponse {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        token,
    }))
}
#[derive(Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

pub async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let user = user::Entity::find()
        .filter(user::Column::Email.eq(payload.email))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    let token = Uuid::new_v4().to_string();
    let expiry = Utc::now() + Duration::hours(1);

    let mut am: user::ActiveModel = user.into();
    let user_email = am.email.clone().unwrap(); // Get before move
    am.reset_token = Set(Some(token.clone()));
    am.reset_token_expiry = Set(Some(expiry.into()));
    am.update(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Send email (Fire and forget)
    let db_clone = state.db.clone();
    tokio::spawn(async move {
        let _ = EmailService::send_email(
            &db_clone,
            user_email,
            "Recuperación de Contraseña".into(),
            format!("Tu token de recuperación es: {}. Expira en 1 hora.", token),
            Some(format!("<h3>Recuperación de Contraseña</h3><p>Usa el siguiente token para restablecer tu contraseña: <strong>{}</strong></p><p>Este token expira en 1 hora.</p>", token))
        ).await;
    });

    Ok(Json(json!({"message": "Password reset email sent"})))
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

pub async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let user = user::Entity::find()
        .filter(user::Column::ResetToken.eq(payload.token))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid or expired token"}))))?;

    if let Some(expiry) = user.reset_token_expiry {
        if expiry.timestamp() < Utc::now().timestamp() {
            return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Token expired"}))));
        }
    }

    let hashed = hash(payload.new_password, DEFAULT_COST)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hash error"}))))?;

    let mut am: user::ActiveModel = user.into();
    am.password_hash = Set(Some(hashed));
    am.reset_token = Set(None);
    am.reset_token_expiry = Set(None);
    am.update(&state.db).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "Password updated successfully"})))
}

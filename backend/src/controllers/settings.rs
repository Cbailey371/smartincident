use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use crate::AppState;
use crate::models::notification_config;
use crate::middleware::auth::AuthUser;
use crate::utils::email::EmailService;
use sea_orm::{entity::*, EntityTrait};
use chrono::Utc;

#[derive(Serialize, Deserialize)]
pub struct NotificationConfigRequest {
    pub smtp_host: String,
    pub smtp_port: i32,
    pub smtp_user: String,
    pub smtp_pass: String,
    pub sender_email: String,
    pub is_active: bool,
}

pub async fn get_notification_config(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if !["superadmin", "company_admin"].contains(&user.user.role.as_str()) {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let config = notification_config::Entity::find()
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .unwrap_or_else(|| {
            notification_config::Model {
                id: 0,
                smtp_host: "".into(),
                smtp_port: 587,
                smtp_user: "".into(),
                smtp_pass: "".into(),
                sender_email: "".into(),
                is_active: false,
                created_at: Utc::now().naive_utc(),
                updated_at: Utc::now().naive_utc(),
            }
        });

    let mut val = json!(config);
    if user.user.role != "superadmin" {
        val["smtp_pass"] = json!("******");
    }

    Ok(Json(val))
}

pub async fn update_notification_config(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<NotificationConfigRequest>,
) -> Result<Json<notification_config::Model>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can update config"}))));
    }

    let existing = notification_config::Entity::find()
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut am = match existing {
        Some(config) => {
            let mut am: notification_config::ActiveModel = config.into();
            am.smtp_host = Set(payload.smtp_host);
            am.smtp_port = Set(payload.smtp_port);
            am.smtp_user = Set(payload.smtp_user);
            if payload.smtp_pass != "******" && !payload.smtp_pass.is_empty() {
                am.smtp_pass = Set(payload.smtp_pass);
            }
            am.sender_email = Set(payload.sender_email);
            am.is_active = Set(payload.is_active);
            am.updated_at = Set(Utc::now().naive_utc());
            am
        },
        None => notification_config::ActiveModel {
            smtp_host: Set(payload.smtp_host),
            smtp_port: Set(payload.smtp_port),
            smtp_user: Set(payload.smtp_user),
            smtp_pass: Set(payload.smtp_pass),
            sender_email: Set(payload.sender_email),
            is_active: Set(payload.is_active),
            created_at: Set(Utc::now().naive_utc()),
            updated_at: Set(Utc::now().naive_utc()),
            ..Default::default()
        }
    };

    let result = am.save(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(result.try_into_model().unwrap()))
}

#[derive(Deserialize)]
pub struct TestEmailRequest {
    pub email: String,
}

pub async fn test_notification_config(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<TestEmailRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    match EmailService::send_email(
        &state.db,
        payload.email,
        "Prueba de Configuración".into(),
        "Este es un correo de prueba del sistema SmartIncident.".into(),
        Some("<h3>Prueba de Conexión</h3><p>Si recibes esto, el servidor SMTP está correctamente configurado.</p>".into())
    ).await {
        Ok(_) => Ok(Json(json!({"message": "Correo de prueba enviado con éxito"}))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Error SMTP: {}", e)})))),
    }
}

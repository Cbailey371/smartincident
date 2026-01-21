use axum::{
    extract::{Path, State, Multipart},
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use crate::AppState;
use crate::models::{comment, attachment};
use crate::middleware::auth::AuthUser;
use sea_orm::{entity::*, EntityTrait, QueryFilter};
use chrono::Utc;
use std::path::Path as stdPath;
use tokio::fs;


pub async fn get_comments_by_incident(
    State(state): State<AppState>,
    _: AuthUser,
    Path(incident_id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let comments = comment::Entity::find()
        .filter(comment::Column::IncidentId.eq(incident_id))
        .find_with_related(attachment::Entity)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Transform to include attachments in the JSON
    let mut result = Vec::new();
    for (comment, attachments) in comments {
        let mut comment_val = json!(comment);
        comment_val["attachments"] = json!(attachments);
        result.push(comment_val);
    }

    Ok(Json(json!(result)))
}

pub async fn create_comment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(incident_id): Path<i32>,
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let mut content = String::new();
    let mut file_data: Option<(String, Vec<u8>, String)> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))))? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "content" => content = field.text().await.unwrap_or_default(),
            "file" => {
                let file_name = field.file_name().unwrap_or("upload").to_string();
                let mime = field.content_type().unwrap_or("application/octet-stream").to_string();
                let bytes = field.bytes().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
                tracing::info!("RECEPTOR (COMENTARIO): Archivo '{}' recibido con {} bytes", file_name, bytes.len());
                file_data = Some((file_name, bytes.to_vec(), mime));
            }
            _ => {}
        }
    }

    if content.is_empty() && file_data.is_none() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Content or file is required"}))));
    }

    let new_comment = comment::ActiveModel {
        content: Set(content),
        incident_id: Set(incident_id),
        author_id: Set(user.user.id),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };

    let result = new_comment.insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Handle File Upload if present
    if let Some((file_name, bytes, mime)) = file_data {
        let upload_dir = "uploads";
        let _ = fs::create_dir_all(upload_dir).await;
        let ts = Utc::now().timestamp_millis();
        let safe_name = format!("{}-{}", ts, file_name.replace(' ', "_"));
        let save_path = stdPath::new(upload_dir).join(&safe_name);
        let bytes_len = bytes.len();
        
        match fs::write(&save_path, &bytes).await {
            Ok(_) => {
                let abs_path = std::fs::canonicalize(&save_path).unwrap_or_else(|_| save_path.clone());
                tracing::info!("ARCHIVO GUARDADO: Escrito en {:?} ({} bytes)", abs_path, bytes_len);

                let relative_path = format!("uploads/{}", safe_name);
                let _ = attachment::ActiveModel {
                    file_path: Set(relative_path),
                    original_name: Set(file_name),
                    mime_type: Set(mime),
                    incident_id: Set(Some(incident_id)),
                    comment_id: Set(Some(result.id)),
                    created_at: Set(Utc::now().into()),
                    updated_at: Set(Utc::now().into()),
                    ..Default::default()
                }.insert(&state.db).await;
            },
            Err(e) => {
                tracing::error!("ERROR AL GUARDAR ARCHIVO: {}", e);
            }
        }
    }

    Ok(Json(json!(result)))
}

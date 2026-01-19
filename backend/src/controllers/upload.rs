use axum::{
    extract::Multipart,
    http::StatusCode,
    Json,
};
use serde_json::{json, Value};
use std::path::Path;
use tokio::fs;

pub async fn upload_file(mut multipart: Multipart) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let mut file_path = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))))? {
        let name = field.name().unwrap_or("file").to_string();
        let file_name = field.file_name().unwrap_or("upload").to_string();
        let _content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        let data = field.bytes().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

        if name == "file" {
            let upload_dir = "uploads";
            let _ = fs::create_dir_all(upload_dir).await;
            
            let timestamp = chrono::Utc::now().timestamp_millis();
            let safe_file_name = format!("{}-{}", timestamp, file_name);
            let path = Path::new(upload_dir).join(&safe_file_name);
            
            fs::write(&path, data).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
            file_path = format!("/uploads/{}", safe_file_name);
        }
    }

    if file_path.is_empty() {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "No file uploaded"}))));
    }

    Ok(Json(json!({ "url": file_path })))
}

use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::AppState;
use crate::models::{user, company, incident, comment, attachment};
use crate::middleware::auth::AuthUser;
use sea_orm::{entity::*, EntityTrait, QueryFilter, ColumnTrait, sea_query::Expr};
use chrono::Utc;
use bcrypt::{hash, DEFAULT_COST};

pub async fn get_all_users(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can list users"}))));
    }

    let users_with_companies = user::Entity::find()
        .find_with_related(company::Entity)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let result: Vec<Value> = users_with_companies.into_iter().map(|(u, companies)| {
        let mut user_val = json!(u);
        user_val["company"] = json!(companies.first());
        user_val
    }).collect();

    Ok(Json(json!(result)))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub password: Option<String>,
    pub role: String,
    pub company_id: Option<i32>,
    pub status: Option<String>,
}

pub async fn create_user(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, Json<Value>)> {
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

    let mut raw_password = String::new();
    let password_hash = if let Some(pwd) = payload.password {
        if !pwd.is_empty() {
             raw_password = pwd.clone();
             Some(hash(pwd, DEFAULT_COST).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing error"}))))?)
        } else {
             raw_password = uuid::Uuid::new_v4().to_string()[..12].to_string();
             Some(hash(&raw_password, DEFAULT_COST).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing error"}))))?)
        }
    } else {
        // Auto-generate if None
        raw_password = uuid::Uuid::new_v4().to_string()[..12].to_string();
        Some(hash(&raw_password, DEFAULT_COST).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing error"}))))?)
    };

    let new_user = user::ActiveModel {
        name: Set(payload.name.clone()),
        email: Set(payload.email.clone()),
        role: Set(payload.role),
        status: Set(payload.status.unwrap_or_else(|| "active".into())),
        password_hash: Set(password_hash),
        company_id: Set(payload.company_id),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
        ..Default::default()
    };

    let user_model = new_user
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Send Welcome Email if password was generated or provided
    if !raw_password.is_empty() {
        let email_to = payload.email.clone();
        let name = payload.name.clone();
        let db = state.db.clone();
        let pwd_to_send = raw_password.clone();
        
        tokio::spawn(async move {
            let subject = "Bienvenido a SmartIncident - Tus Credenciales";
            let body_html = format!(
                r#"
                <html>
                    <body style="font-family: sans-serif; color: #333;">
                        <h2 style="color: #2563eb;">¡Hola, {}!</h2>
                        <p>Se ha creado tu cuenta en <strong>SmartIncident</strong>.</p>
                        <p>Estas son tus credenciales de acceso:</p>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Usuario:</strong> {}</p>
                            <p style="margin: 5px 0;"><strong>Contraseña:</strong> {}</p>
                        </div>
                        <p>Te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.</p>
                        <br/>
                        <p>Saludos,<br/>El equipo de SmartIncident</p>
                    </body>
                </html>
                "#,
                name, email_to, pwd_to_send
            );

            if let Err(e) = crate::utils::email::EmailService::send_email(
                &db,
                email_to,
                subject.to_string(),
                format!("Hola {}, bienvenido. Tus credenciales son: Usuario: {}, Password: {}", name, name, pwd_to_send),
                Some(body_html)
            ).await {
                tracing::error!("Failed to send welcome email: {}", e);
            }
        });
    }

    // Return the user with company info if possible (optional but good for UI consistency)
    let mut user_val = json!(user_model);
    if let Some(cid) = user_model.company_id {
        let company = company::Entity::find_by_id(cid).one(&state.db).await.unwrap_or(None);
        user_val["company"] = json!(company);
    }

    Ok((StatusCode::CREATED, Json(user_val)))
}

pub async fn get_user_by_id(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user_auth.user.role != "superadmin" && user_auth.user.id != id {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Unauthorized"}))));
    }

    let user_with_company = user::Entity::find_by_id(id)
        .find_with_related(company::Entity)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let (u, companies) = user_with_company.first().cloned().ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;
    
    let mut user_val = json!(u);
    user_val["company"] = json!(companies.first());

    Ok(Json(user_val))
}

pub async fn update_user(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
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
    if let Some(status) = payload.status {
        am.status = Set(status);
    }
    
    if let Some(pwd) = payload.password {
        if !pwd.is_empty() {
            let hashed = hash(pwd, DEFAULT_COST).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Hashing error"}))))?;
            am.password_hash = Set(Some(hashed));
        }
    }
    
    am.updated_at = Set(Utc::now().into());

    let updated = am.update(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut user_val = json!(updated);
    if let Some(cid) = updated.company_id {
        let company = company::Entity::find_by_id(cid).one(&state.db).await.unwrap_or(None);
        user_val["company"] = json!(company);
    }

    Ok(Json(user_val))
}

pub async fn delete_user(
    State(state): State<AppState>,
    user_auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if user_auth.user.role != "superadmin" {
        return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Only superadmin can delete users"}))));
    }

    if user_auth.user.id == id {
        return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "You cannot delete yourself"}))));
    }

    let user_model = user::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))))?;

    // 1. Handle incidents assigned to this user
    incident::Entity::update_many()
        .col_expr(incident::Column::AssigneeId, Expr::value(sea_orm::Value::Int(None)))
        .filter(incident::Column::AssigneeId.eq(id))
        .exec(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // 2. Handle incidents reported by this user
    let reported_incidents = incident::Entity::find()
        .filter(incident::Column::ReporterId.eq(id))
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    let incident_ids: Vec<i32> = reported_incidents.iter().map(|i| i.id).collect();

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
            .filter(incident::Column::ReporterId.eq(id))
            .exec(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Could not delete related incidents: {}", e)}))))?;
    }

    // 3. Delete the user
    user_model.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(Json(json!({"message": "User deleted successfully"})))
}

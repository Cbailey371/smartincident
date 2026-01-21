use axum::Router;
use crate::AppState;

pub mod auth;
pub mod incident;
pub mod company;
pub mod upload;
pub mod comment;
pub mod ticket_type;
pub mod user;
pub mod dashboard;

pub fn api_routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/incidents", incident::routes().merge(comment::routes()))
        .nest("/companies", company::routes())
        .nest("/upload", upload::routes())
        .nest("/ticket-types", ticket_type::routes())
        .nest("/users", user::routes())
        .nest("/dashboard", dashboard::routes())
}

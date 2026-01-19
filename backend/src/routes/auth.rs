use axum::{
    routing::post,
    Router,
};
use crate::AppState;
use crate::controllers::auth;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(auth::login))
        .route("/forgot-password", post(auth::forgot_password))
        .route("/reset-password", post(auth::reset_password))
}

use axum::{
    routing::{post, put},
    Router,
};
use crate::AppState;
use crate::controllers::auth;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(auth::login))
        .route("/forgot-password", post(auth::forgot_password))
        .route("/reset-password/:token", put(auth::reset_password))
}

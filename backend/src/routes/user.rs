use axum::{
    routing::get,
    Router,
};
use crate::AppState;
use crate::controllers::user;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(user::get_all_users))
}

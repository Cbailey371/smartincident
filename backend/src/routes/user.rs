use axum::{
    routing::{get, post, put, delete},
    Router,
};
use crate::AppState;
use crate::controllers::user;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(user::get_all_users).post(user::create_user))
        .route("/:id", get(user::get_user_by_id).put(user::update_user).delete(user::delete_user))
}

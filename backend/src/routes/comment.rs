use axum::{
    routing::get,
    Router,
};
use crate::AppState;
use crate::controllers::comment;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/:id/comments", get(comment::get_comments_by_incident).post(comment::create_comment))
}

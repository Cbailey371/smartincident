use axum::{
    routing::post,
    Router,
};
use crate::AppState;
use crate::controllers::upload;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", post(upload::upload_file))
}

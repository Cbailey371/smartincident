use axum::{
    routing::get,
    Router,
};
use crate::AppState;
use crate::controllers::dashboard;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(dashboard::get_dashboard_metrics))
}

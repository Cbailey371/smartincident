use axum::{
    routing::{get, post},
    Router,
};
use crate::AppState;
use crate::controllers::settings;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/notifications", get(settings::get_notification_config).put(settings::update_notification_config))
        .route("/notifications/test", post(settings::test_notification_config))
}

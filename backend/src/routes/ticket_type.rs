use axum::{
    routing::get,
    Router,
};
use crate::AppState;
use crate::controllers::ticket_type;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(ticket_type::get_all_ticket_types))
}

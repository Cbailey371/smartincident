use axum::{
    routing::{get, put},
    Router,
};
use crate::AppState;
use crate::controllers::ticket_type;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(ticket_type::get_all_ticket_types).post(ticket_type::create_ticket_type))
        .route("/:id", put(ticket_type::update_ticket_type).delete(ticket_type::delete_ticket_type))
}

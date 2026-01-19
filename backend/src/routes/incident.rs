use axum::{
    routing::get,
    Router as AxRouter,
};
use crate::AppState;
use crate::controllers::incident;

pub fn routes() -> AxRouter<AppState> {
    AxRouter::new()
        .route("/", get(incident::get_all_incidents).post(incident::create_incident))
        .route("/:id", get(incident::get_incident_by_id).put(incident::update_incident).delete(incident::delete_incident))
}

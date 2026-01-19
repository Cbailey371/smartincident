use axum::{
    routing::get,
    Router,
};
use crate::AppState;
use crate::controllers::company;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(company::get_all_companies).post(company::create_company))
        .route("/:id", get(company::get_company_by_id).put(company::update_company).delete(company::delete_company))
}

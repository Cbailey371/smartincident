use axum::{routing::get, Router};
use std::net::SocketAddr;
use dotenvy::dotenv;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use socketioxide::SocketIo;
use tower_http::services::ServeDir;
use crate::utils::sockets::on_connect;

mod config;
mod models;
mod controllers;
mod routes;
mod middleware;
pub mod utils;

#[derive(Clone)]
pub struct AppState {
    pub db: sea_orm::DatabaseConnection,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    // Inicializar logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Conectar a la base de datos
    let db = config::database::connect().await.expect("Failed to connect to database");
    let state = AppState { db };

    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    // Configurar Socket.io
    let (layer, io) = SocketIo::new_layer();
    io.ns("/", on_connect);

    // Construir la aplicación con rutas
    let app = Router::new()
        .route("/", get(|| async { "tusociosmart API (Rust Edition)" }))
        .nest("/api", routes::api_routes())
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(layer)
        .layer(cors)
        .layer(axum::extract::DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB
        .layer(axum::Extension(state.clone()))
        .with_state(state);

    // Ejecutar el servidor
    let addr = SocketAddr::from(([0, 0, 0, 0], 5002));
    tracing::info!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

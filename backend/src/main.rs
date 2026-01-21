use axum::{routing::get, Router};
use std::net::SocketAddr;
use dotenvy::dotenv;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use socketioxide::SocketIo;
use tower_http::services::ServeDir;
use crate::utils::sockets::on_connect;
use sea_orm::*;
use bcrypt::{hash, DEFAULT_COST};
use chrono::Utc;

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
    
    // Inicializar Tablas y Admin
    init_db(&db).await;

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
        .layer(axum::Extension(state.clone()))
        .with_state(state);

    // Ejecutar el servidor
    let addr = SocketAddr::from(([0, 0, 0, 0], 5002));
    tracing::info!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn init_db(db: &DatabaseConnection) {
    let backend = db.get_database_backend();
    let schema = Schema::new(backend);

    // Lista de entidades para crear tablas
    let stmts = vec![
        schema.create_table_from_entity(models::company::Entity).if_not_exists().to_owned(),
        schema.create_table_from_entity(models::user::Entity).if_not_exists().to_owned(),
        schema.create_table_from_entity(models::ticket_type::Entity).if_not_exists().to_owned(),
        schema.create_table_from_entity(models::incident::Entity).if_not_exists().to_owned(),
        schema.create_table_from_entity(models::comment::Entity).if_not_exists().to_owned(),
        schema.create_table_from_entity(models::attachment::Entity).if_not_exists().to_owned(),
        schema.create_table_from_entity(models::notification_config::Entity).if_not_exists().to_owned(),
    ];

    for stmt in stmts {
        let _ = db.execute(backend.build(&stmt)).await;
    }

    // Crear Admin por defecto
    let email = "admin@smartincident.com";
    let admin_exists = models::user::Entity::find()
        .filter(models::user::Column::Email.eq(email))
        .one(db)
        .await
        .unwrap_or(None);

    if admin_exists.is_none() {
        let password = "admin123";
        let hashed = hash(password, DEFAULT_COST).unwrap();
        
        let admin = models::user::ActiveModel {
            name: Set("Super Administrator".into()),
            email: Set(email.into()),
            role: Set("superadmin".into()),
            password_hash: Set(Some(hashed)),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
            ..Default::default()
        };
        
        let _ = models::user::Entity::insert(admin).exec(db).await;
        tracing::info!("Admin user created: {} / {}", email, password);
    }
}

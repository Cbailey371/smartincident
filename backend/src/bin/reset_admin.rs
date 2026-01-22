use sea_orm::*;
use bcrypt::{hash, DEFAULT_COST};
use dotenvy::dotenv;
use std::env;

#[path = "../models/mod.rs"]
mod models;
#[path = "../config/mod.rs"]
mod config;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Uso: cargo run --bin reset_admin -- <nueva_contraseña>");
        return;
    }

    let new_password = &args[1];
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(db_url).await.expect("Failed to connect to database");

    let email = "admin@smartincident.com";
    let user = models::user::Entity::find()
        .filter(models::user::Column::Email.eq(email))
        .one(&db)
        .await
        .expect("Error al buscar el usuario");

    match user {
        Some(user) => {
            let hashed = hash(new_password, DEFAULT_COST).expect("Error al hashear la contraseña");
            let mut am: models::user::ActiveModel = user.into();
            am.password_hash = Set(Some(hashed));
            am.update(&db).await.expect("Error al actualizar la contraseña");
            println!("Contraseña de {} actualizada correctamente.", email);
        }
        None => {
            println!("No se encontró el usuario administrador ({}).", email);
        }
    }
}

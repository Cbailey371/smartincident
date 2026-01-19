use sea_orm::{Database, DatabaseConnection};
use std::env;

pub async fn connect() -> Result<DatabaseConnection, sea_orm::DbErr> {
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(db_url).await?;
    Ok(db)
}

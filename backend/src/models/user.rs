use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "Users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    #[sea_orm(unique)]
    pub email: String,
    pub role: String, // Usaremos String para los ENUMs iniciales por simplicidad
    pub password_hash: Option<String>,
    pub reset_token: Option<String>,
    pub reset_token_expiry: Option<DateTime>,
    pub company_id: Option<i32>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::company::Entity",
        from = "Column::CompanyId",
        to = "super::company::Column::Id"
    )]
    Company,
}

impl Related<super::company::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Company.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

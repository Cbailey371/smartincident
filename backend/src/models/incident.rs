use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "incidents")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub ticket_code: Option<String>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub reporter_id: i32,
    pub assignee_id: Option<i32>,
    pub company_id: i32,
    pub type_id: i32,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::ReporterId",
        to = "super::user::Column::Id"
    )]
    Reporter,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::AssigneeId",
        to = "super::user::Column::Id"
    )]
    Assignee,
    #[sea_orm(
        belongs_to = "super::company::Entity",
        from = "Column::CompanyId",
        to = "super::company::Column::Id"
    )]
    Company,
    #[sea_orm(
        belongs_to = "super::ticket_type::Entity",
        from = "Column::TypeId",
        to = "super::ticket_type::Column::Id"
    )]
    TicketType,
    #[sea_orm(has_many = "super::comment::Entity")]
    Comment,
    #[sea_orm(has_many = "super::attachment::Entity")]
    Attachment,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reporter.def()
    }
}

impl Related<super::company::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Company.def()
    }
}

impl Related<super::ticket_type::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TicketType.def()
    }
}

impl Related<super::comment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Comment.def()
    }
}

impl Related<super::attachment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Attachment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

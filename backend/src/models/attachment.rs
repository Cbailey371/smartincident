use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "attachments")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub file_path: String,
    pub original_name: String,
    pub mime_type: String,
    pub incident_id: Option<i32>,
    pub comment_id: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::incident::Entity",
        from = "Column::IncidentId",
        to = "super::incident::Column::Id"
    )]
    Incident,
    #[sea_orm(
        belongs_to = "super::comment::Entity",
        from = "Column::CommentId",
        to = "super::comment::Column::Id"
    )]
    Comment,
}

impl Related<super::incident::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Incident.def()
    }
}

impl Related<super::comment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Comment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

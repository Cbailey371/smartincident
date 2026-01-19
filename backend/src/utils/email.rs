use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use crate::models::notification_config;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

pub struct EmailService;

impl EmailService {
    pub async fn send_email(
        db: &DatabaseConnection,
        to: String,
        subject: String,
        body_text: String,
        body_html: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let config = notification_config::Entity::find()
            .filter(notification_config::Column::IsActive.eq(true))
            .one(db)
            .await?;

        if let Some(cfg) = config {
            let creds = Credentials::new(cfg.smtp_user.clone(), cfg.smtp_pass.clone());

            let mailer = SmtpTransport::relay(&cfg.smtp_host)?
                .credentials(creds)
                .port(cfg.smtp_port as u16)
                .build();

            let email = Message::builder()
                .from(format!("Tickets SaaS <{}>", cfg.sender_email).parse()?)
                .to(to.parse()?)
                .subject(subject)
                .header(lettre::message::header::ContentType::TEXT_HTML)
                .body(body_html.unwrap_or(body_text))?;

            mailer.send(&email)?;
            tracing::info!("Email sent successfully");
            Ok(())
        } else {
            tracing::warn!("No active email configuration found. Mocking email to: {}", to);
            Ok(())
        }
    }
}

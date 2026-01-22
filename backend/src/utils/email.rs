use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, AsyncSmtpTransport, Tokio1Executor, AsyncTransport};
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

            let mailer = if cfg.smtp_port == 465 {
                // For port 465, relay often handles implicit TLS automatically if detection works,
                // but let's try standard relay first as it handles 465/587 internally in many versions
                AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.smtp_host)?
            } else {
                // For 587, explicitly use STARTTLS relay
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.smtp_host)?
            }
            .credentials(creds)
            .port(cfg.smtp_port as u16)
            .build();

            let email = Message::builder()
                .from(format!("SmartIncident <{}>", cfg.sender_email).parse()?)
                .to(to.parse()?)
                .subject(subject)
                .header(lettre::message::header::ContentType::TEXT_HTML)
                .body(body_html.unwrap_or(body_text))?;

            mailer.send(email).await?;
            tracing::info!("Email sent successfully");
            Ok(())
        } else {
            tracing::warn!("No active email configuration found. Mocking email to: {}", to);
            Ok(())
        }
    }
}

use socketioxide::extract::{SocketRef, Data};
use serde_json::Value;

pub fn on_connect(socket: SocketRef) {
    tracing::info!("socket connected: {}", socket.id);

    socket.on("join", |socket: SocketRef, Data::<Value>(data)| {
        if let Some(room) = data.get("room").and_then(|v| v.as_str()) {
            let room = room.to_string();
            tracing::info!("socket {} joining room {}", socket.id, room);
            let _ = socket.leave_all();
            let _ = socket.join(room);
        }
    });

    socket.on("message", |socket: SocketRef, Data::<Value>(data)| {
        tracing::info!("message received from {}: {:?}", socket.id, data);
        if let Some(room) = data.get("room").and_then(|v| v.as_str()) {
            let room = room.to_string();
            let _ = socket.within(room).emit("message", &data);
        }
    });
}

-- Rollback analytics, WebSocket, and video streaming tables

DROP TABLE IF EXISTS live_streams CASCADE;
DROP TABLE IF EXISTS video_assets CASCADE;
DROP TABLE IF EXISTS websocket_connections CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;

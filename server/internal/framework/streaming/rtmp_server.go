package streaming

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nareix/joy4/av/avutil"
	"github.com/nareix/joy4/av/pubsub"
	"github.com/nareix/joy4/format"
	"github.com/nareix/joy4/format/rtmp"

	"github.com/keshablive/quester/internal/framework/interfaces"
)

// RTMPServer handles incoming RTMP streams and publishes to transcoding pipeline
type RTMPServer struct {
	addr       string
	repo       interfaces.StreamRepository
	listener   net.Listener
	queue      *pubsub.Queue
	streams    map[string]*StreamSession // streamID -> session
	streamsMux sync.RWMutex
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup

	// Callbacks
	onPublishStart func(streamID string, session *StreamSession) error
	onPublishEnd   func(streamID string, session *StreamSession) error
}

// StreamSession represents an active RTMP stream session
type StreamSession struct {
	ID          string
	StreamID    string
	IngestURL   string
	StartedAt   time.Time
	EndedAt     *time.Time
	BytesIn     int64
	BytesOut    int64
	IsActive    bool
	RemoteAddr  string
	UserAgent   string
	Demuxer     *rtmp.Conn
	Transcoder  *Transcoder
	HLSUploader *HLSUploader
	DVRManager  *DVRManager
}

// RTMPServerConfig holds RTMP server configuration
type RTMPServerConfig struct {
	Addr             string                      // RTMP listen address (e.g., ":1935")
	StreamRepo       interfaces.StreamRepository // Stream repository interface
	TranscoderConfig *TranscoderConfig           // FFmpeg transcoder config
	UploaderConfig   *HLSUploaderConfig          // S3 uploader config
	DVRConfig        *DVRConfig                  // DVR manager config
}

// NewRTMPServer creates a new RTMP server instance
func NewRTMPServer(config *RTMPServerConfig) (*RTMPServer, error) {
	if config.Addr == "" {
		config.Addr = ":1935"
	}

	ctx, cancel := context.WithCancel(context.Background())

	server := &RTMPServer{
		addr:    config.Addr,
		repo:    config.StreamRepo,
		queue:   pubsub.NewQueue(),
		streams: make(map[string]*StreamSession),
		ctx:     ctx,
		cancel:  cancel,
	}

	return server, nil
}

// SetPublishCallbacks sets callbacks for publish events
func (s *RTMPServer) SetPublishCallbacks(
	onStart func(streamID string, session *StreamSession) error,
	onEnd func(streamID string, session *StreamSession) error,
) {
	s.onPublishStart = onStart
	s.onPublishEnd = onEnd
}

// Start starts the RTMP server and begins accepting connections
func (s *RTMPServer) Start() error {
	listener, err := net.Listen("tcp", s.addr)
	if err != nil {
		return fmt.Errorf("failed to start RTMP server on %s: %w", s.addr, err)
	}

	s.listener = listener
	fmt.Printf("RTMP server listening on %s\n", s.addr)

	s.wg.Add(1)
	go s.acceptLoop()

	return nil
}

// Stop gracefully stops the RTMP server
func (s *RTMPServer) Stop() error {
	s.cancel()

	if s.listener != nil {
		s.listener.Close()
	}

	// Wait for all connections to close
	s.wg.Wait()

	return nil
}

// acceptLoop accepts incoming RTMP connections
func (s *RTMPServer) acceptLoop() {
	defer s.wg.Done()

	for {
		select {
		case <-s.ctx.Done():
			return
		default:
		}

		conn, err := s.listener.Accept()
		if err != nil {
			if s.ctx.Err() != nil {
				// Server is shutting down
				return
			}
			fmt.Printf("RTMP accept error: %v\n", err)
			continue
		}

		s.wg.Add(1)
		go s.handleConnection(conn)
	}
}

// handleConnection handles a single RTMP connection
func (s *RTMPServer) handleConnection(conn net.Conn) {
	defer s.wg.Done()
	defer conn.Close()

	rtmpConn := rtmp.NewConn(conn)

	// Handle RTMP handshake (API changed - no parameters needed)
	if err := rtmpConn.Prepare(); err != nil {
		fmt.Printf("RTMP handshake failed: %v\n", err)
		return
	}

	// Extract stream path and query parameters
	streamPath := rtmpConn.URL.Path
	streamKey := rtmpConn.URL.Query().Get("key")

	fmt.Printf("RTMP connection: path=%s, key=%s (first 8 chars)\n",
		streamPath, truncateString(streamKey, 8))

	// Authenticate stream
	streamID, err := s.authenticateStream(streamPath, streamKey)
	if err != nil {
		fmt.Printf("RTMP authentication failed: %v\n", err)
		return
	}

	// Handle publish or play (note: Publishing is unexported, need to check streams differently)
	// We'll determine publish vs play based on whether streams are being read or written
	s.handlePublish(streamID, rtmpConn, conn.RemoteAddr().String())
}

// authenticateStream validates stream credentials and returns stream ID
func (s *RTMPServer) authenticateStream(streamPath, streamKey string) (string, error) {
	// Extract stream ID from path (e.g., "/live/stream-id" -> "stream-id")
	parts := strings.Split(strings.Trim(streamPath, "/"), "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid stream path: %s", streamPath)
	}

	streamID := parts[1]

	// Validate UUID format
	if _, err := uuid.Parse(streamID); err != nil {
		return "", fmt.Errorf("invalid stream ID format: %s", streamID)
	}

	ctx := context.Background()

	// Query repository for stream
	stream, err := s.repo.FindByID(ctx, streamID)
	if err != nil {
		return "", fmt.Errorf("stream not found: %s - %w", streamID, err)
	}

	// Verify stream key
	if stream.GetStreamKey() != streamKey {
		return "", fmt.Errorf("invalid stream key for stream: %s", streamID)
	}

	// Check stream status (must be pending to start streaming)
	if stream.GetStatus() != string(interfaces.StreamStatusPending) {
		return "", fmt.Errorf("stream not in pending status: %s (current: %s)",
			streamID, stream.GetStatus())
	}

	// Additional validation can be done by implementing StreamValidator
	// and injecting it into the RTMPServer

	return streamID, nil
}

// handlePublish handles an incoming RTMP publish (broadcaster)
func (s *RTMPServer) handlePublish(streamID string, conn *rtmp.Conn, remoteAddr string) {
	fmt.Printf("RTMP publish started: stream=%s, remote=%s\n", streamID, remoteAddr)

	// Create stream session
	session := &StreamSession{
		ID:         uuid.New().String(),
		StreamID:   streamID,
		IngestURL:  conn.URL.String(),
		StartedAt:  time.Now(),
		IsActive:   true,
		RemoteAddr: remoteAddr,
		Demuxer:    conn,
	}

	// Register session
	s.streamsMux.Lock()
	s.streams[streamID] = session
	s.streamsMux.Unlock()

	// Callback: notify stream started
	if s.onPublishStart != nil {
		if err := s.onPublishStart(streamID, session); err != nil {
			fmt.Printf("RTMP publish start callback failed: %v\n", err)
			s.cleanupSession(streamID, session)
			return
		}
	}

	// Read and process stream data
	if err := s.processPublish(streamID, session); err != nil {
		fmt.Printf("RTMP publish error: %v\n", err)
	}

	// Cleanup
	fmt.Printf("RTMP publish ended: stream=%s\n", streamID)
	s.cleanupSession(streamID, session)

	// Callback: notify stream ended
	if s.onPublishEnd != nil {
		if err := s.onPublishEnd(streamID, session); err != nil {
			fmt.Printf("RTMP publish end callback failed: %v\n", err)
		}
	}
}

// processPublish reads RTMP packets and forwards to transcoder
func (s *RTMPServer) processPublish(streamID string, session *StreamSession) error {
	// Read stream header
	streams, err := session.Demuxer.Streams()
	if err != nil {
		return fmt.Errorf("failed to read RTMP streams: %w", err)
	}

	// Start transcoder (will be implemented in T095)
	// For now, just read and discard packets
	fmt.Printf("RTMP stream has %d tracks\n", len(streams))

	// Create packet reader (HandlerDemuxer doesn't have Conn field in newer versions)
	demuxer := &avutil.HandlerDemuxer{}

	// Read packets until connection closes
	for {
		select {
		case <-s.ctx.Done():
			return nil
		default:
		}

		pkt, err := demuxer.ReadPacket()
		if err != nil {
			return fmt.Errorf("read packet error: %w", err)
		}

		session.BytesIn += int64(len(pkt.Data))

		// TODO (T095): Forward packet to transcoder
		// session.Transcoder.WritePacket(pkt)
	}
}

// handlePlay handles an RTMP play request (viewer)
func (s *RTMPServer) handlePlay(streamID string, conn *rtmp.Conn) {
	fmt.Printf("RTMP play requested: stream=%s\n", streamID)

	// Check if stream exists and is live
	s.streamsMux.RLock()
	session, exists := s.streams[streamID]
	s.streamsMux.RUnlock()

	if !exists || !session.IsActive {
		fmt.Printf("RTMP play failed: stream not live: %s\n", streamID)
		return
	}

	// Subscribe to stream queue
	cursor := s.queue.Latest()

	// Write stream header (WriteHeader now returns error from Streams call)
	streams, err := session.Demuxer.Streams()
	if err != nil {
		fmt.Printf("RTMP play get streams failed: %v\n", err)
		return
	}
	if err := conn.WriteHeader(streams); err != nil {
		fmt.Printf("RTMP play write header failed: %v\n", err)
		return
	}

	// Forward packets to viewer
	for {
		select {
		case <-s.ctx.Done():
			return
		default:
		}

		pkt, err := cursor.ReadPacket()
		if err != nil {
			fmt.Printf("RTMP play read packet failed: %v\n", err)
			return
		}

		if err := conn.WritePacket(pkt); err != nil {
			fmt.Printf("RTMP play write packet failed: %v\n", err)
			return
		}

		session.BytesOut += int64(len(pkt.Data))
	}
}

// cleanupSession cleans up a stream session
func (s *RTMPServer) cleanupSession(streamID string, session *StreamSession) {
	now := time.Now()
	session.EndedAt = &now
	session.IsActive = false

	// Stop transcoder
	if session.Transcoder != nil {
		session.Transcoder.Stop()
	}

	// Stop HLS uploader
	if session.HLSUploader != nil {
		session.HLSUploader.Stop()
	}

	// Stop DVR manager
	if session.DVRManager != nil {
		session.DVRManager.Stop()
	}

	// Unregister session
	s.streamsMux.Lock()
	delete(s.streams, streamID)
	s.streamsMux.Unlock()
}

// GetActiveStreams returns all active stream sessions
func (s *RTMPServer) GetActiveStreams() []*StreamSession {
	s.streamsMux.RLock()
	defer s.streamsMux.RUnlock()

	sessions := make([]*StreamSession, 0, len(s.streams))
	for _, session := range s.streams {
		if session.IsActive {
			sessions = append(sessions, session)
		}
	}

	return sessions
}

// GetStream returns a specific stream session
func (s *RTMPServer) GetStream(streamID string) (*StreamSession, bool) {
	s.streamsMux.RLock()
	defer s.streamsMux.RUnlock()

	session, exists := s.streams[streamID]
	return session, exists
}

// truncateString truncates a string to maxLen characters
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func init() {
	// Register RTMP format handler
	format.RegisterAll()
}

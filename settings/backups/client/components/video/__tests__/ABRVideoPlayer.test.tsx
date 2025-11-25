// ABRVideoPlayer Component Tests
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ABRVideoPlayer } from '../ABRVideoPlayer';
import {
  VideoStreamManager,
  StreamState,
  StreamEvent,
  QualityLevel,
} from '../../../lib/services/video-stream-manager';
import { NetworkQuality } from '../../../lib/services/bandwidth-monitor';
import { BufferState } from '../../../lib/services/buffer-manager';

jest.mock('../../../lib/services/video-stream-manager');

describe('ABRVideoPlayer', () => {
  let mockManager: jest.Mocked<VideoStreamManager>;
  let eventHandlers: Map<StreamEvent, Function>;

  const testQualities: QualityLevel[] = [
    { label: '720p', height: 720, bitrate: 2800000 },
    { label: '1080p', height: 1080, bitrate: 4500000 },
  ];

  beforeEach(() => {
    eventHandlers = new Map();
    mockManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setQuality: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((event: StreamEvent, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      off: jest.fn(),
      destroy: jest.fn(),
    } as any;
    (VideoStreamManager as jest.MockedClass<typeof VideoStreamManager>).mockImplementation(
      () => mockManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const emitEvent = (event: StreamEvent, data?: any) => {
    const handler = eventHandlers.get(event);
    if (handler) handler(data);
  };

  it('should render without crashing', () => {
    const { getByTestId } = render(
      <ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" />
    );
    expect(getByTestId('abr-video-player')).toBeTruthy();
  });

  it('should initialize and start stream', async () => {
    render(<ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" />);
    await waitFor(() => {
      expect(mockManager.initialize).toHaveBeenCalled();
      expect(mockManager.start).toHaveBeenCalled();
    });
  });

  it('should pause when playing', async () => {
    const { getByTestId } = render(
      <ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" showControls={true} />
    );
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());
    act(() => emitEvent(StreamEvent.STATE_CHANGE, StreamState.PLAYING));
    fireEvent.press(getByTestId('play-pause-button'));
    await waitFor(() => expect(mockManager.pause).toHaveBeenCalled());
  });

  it('should open quality selector', async () => {
    const { getByTestId, getByText } = render(
      <ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" showQualitySelector={true} />
    );
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());
    act(() => emitEvent(StreamEvent.READY, { qualities: testQualities }));
    fireEvent.press(getByTestId('quality-selector-button'));
    await waitFor(() => {
      expect(getByText('720p')).toBeTruthy();
      expect(getByText('1080p')).toBeTruthy();
    });
  });

  it('should switch quality', async () => {
    const { getByTestId, getByText } = render(
      <ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" showQualitySelector={true} />
    );
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());
    act(() => emitEvent(StreamEvent.READY, { qualities: testQualities }));
    fireEvent.press(getByTestId('quality-selector-button'));
    const quality1080p = await waitFor(() => getByText('1080p'));
    fireEvent.press(quality1080p);
    await waitFor(() =>
      expect(mockManager.setQuality).toHaveBeenCalledWith(
        expect.objectContaining({ label: '1080p' })
      )
    );
  });

  it('should call onQualityChange callback', async () => {
    const onQualityChange = jest.fn();
    render(
      <ABRVideoPlayer
        hlsUrl="https://test.example.com/stream.m3u8"
        onQualityChange={onQualityChange}
      />
    );
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());
    act(() => emitEvent(StreamEvent.QUALITY_CHANGE, { to: testQualities[1], reason: 'manual' }));
    await waitFor(() => expect(onQualityChange).toHaveBeenCalledWith(testQualities[1]));
  });

  it('should display current quality', async () => {
    const { getByText } = render(
      <ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" showControls={true} />
    );
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());
    act(() => emitEvent(StreamEvent.QUALITY_CHANGE, { to: testQualities[0], reason: 'initial' }));
    await waitFor(() => expect(getByText(/720p/)).toBeTruthy());
  });

  it('should show debug panel when enabled', async () => {
    const { getByText } = render(
      <ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" showDebugMetrics={true} />
    );
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());

    const metrics = {
      state: StreamState.PLAYING,
      currentQuality: testQualities[0],
      networkQuality: NetworkQuality.GOOD,
      bufferState: BufferState.HEALTHY,
      bandwidth: 5000000,
      latency: 50,
      qualitySwitchCount: 3,
      bufferLevel: 15.5,
      downloadRate: 6000000,
      playbackRate: 2800000,
      stallCount: 0,
      dvrWindowDuration: 3600,
      dvrSegmentCount: 120,
      dvrStorageSize: 100000000,
      uploadCount: 50,
      uploadFailureCount: 0,
      uploadRetryCount: 0,
      uptime: 1000,
      averageQuality: 2.5,
    };

    act(() => emitEvent(StreamEvent.METRICS, metrics));
    await waitFor(() => expect(getByText('Debug Metrics')).toBeTruthy());
  });

  it('should destroy on unmount', async () => {
    const { unmount } = render(<ABRVideoPlayer hlsUrl="https://test.example.com/stream.m3u8" />);
    await waitFor(() => expect(mockManager.initialize).toHaveBeenCalled());
    unmount();
    expect(mockManager.destroy).toHaveBeenCalled();
  });
});

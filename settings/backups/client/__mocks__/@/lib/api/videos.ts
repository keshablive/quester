/**
 * Mock for videosApi - used in video upload tests
 */

export const videosApi = {
  uploadVideo: jest.fn(),
  createStream: jest.fn(),
  getStreams: jest.fn(),
  getStreamById: jest.fn(),
  updateStream: jest.fn(),
  deleteStream: jest.fn(),
  startStream: jest.fn(),
  endStream: jest.fn(),
  getStreamStats: jest.fn(),
};

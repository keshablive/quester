import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import GlobalSearchBar from '@/components/navigation/global-search-bar';

describe('GlobalSearchBar', () => {
  const mockOnSearch = jest.fn();
  const mockOnResultSelect = jest.fn();
  const mockOnFocus = jest.fn();

  const defaultProps = {
    onSearch: mockOnSearch,
    onResultSelect: mockOnResultSelect,
    onFocus: mockOnFocus,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<GlobalSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeTruthy();
  });

  it('debounces search input and calls onSearch after delay', async () => {
    jest.useFakeTimers();
    render(<GlobalSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);

    fireEvent.changeText(searchInput, 'quest');

    // Should not call immediately
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Fast forward debounce delay
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('quest');
    });

    jest.useRealTimers();
  });

  it('shows loading state during search', async () => {
    render(<GlobalSearchBar {...defaultProps} isLoading />);

    expect(screen.getByTestId('search-loading')).toBeTruthy();
  });

  it('displays search results when provided', () => {
    const results = [
      { id: '1', title: 'Quest Alpha', type: 'quest' as const, description: 'Complete this quest' },
      { id: '2', title: 'Course Beta', type: 'course' as const, description: 'Learn React Native' },
    ];

    const { getByPlaceholderText } = render(
      <GlobalSearchBar {...defaultProps} results={results} />
    );

    // Type query to show results
    const searchInput = getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'quest');

    expect(screen.getByText('Quest Alpha')).toBeTruthy();
    expect(screen.getByText('Course Beta')).toBeTruthy();
  });

  it('calls onResultSelect when result is tapped', () => {
    const results = [
      { id: '1', title: 'Quest Alpha', type: 'quest' as const, description: 'Complete this quest' },
    ];

    const { getByPlaceholderText } = render(
      <GlobalSearchBar {...defaultProps} results={results} />
    );

    // Type query to show results
    const searchInput = getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'quest');

    const result = screen.getByText('Quest Alpha');
    fireEvent.press(result);

    expect(mockOnResultSelect).toHaveBeenCalledWith(results[0]);
  });

  it('shows empty state when no results found', () => {
    const { getByPlaceholderText } = render(
      <GlobalSearchBar {...defaultProps} results={[]} showEmptyState />
    );

    // Type query to trigger empty state
    const searchInput = getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'nonexistent');

    expect(screen.getByText(/no results/i)).toBeTruthy();
  });

  it('clears search input when clear button is pressed', () => {
    render(<GlobalSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'quest');

    const clearButton = screen.getByLabelText(/clear search/i);
    fireEvent.press(clearButton);

    expect(searchInput.props.value).toBe('');
  });

  it('has proper accessibility properties', () => {
    render(<GlobalSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput.props.accessibilityLabel).toMatch(/search/i);
    expect(searchInput.props.accessibilityRole).toBe('search');
  });

  it('calls onFocus when input is focused', () => {
    render(<GlobalSearchBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent(searchInput, 'focus');

    expect(mockOnFocus).toHaveBeenCalled();
  });

  it('limits preview results to maximum count', () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      title: `Result ${i}`,
      type: 'quest' as const,
      description: `Description ${i}`,
    }));

    const { getByPlaceholderText } = render(
      <GlobalSearchBar {...defaultProps} results={results} maxPreviewResults={5} />
    );

    // Type query to show results
    const searchInput = getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'result');

    const resultElements = screen.getAllByText(/Result \d+/);
    expect(resultElements.length).toBeLessThanOrEqual(5);
  });
});

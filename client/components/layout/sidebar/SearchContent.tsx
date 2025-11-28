/**
 * Search Content Component
 *
 * Search interface with input and results
 */

import * as React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, Input } from '@/components/ui';
import { Search, X } from 'lucide-react-native';
import { Stack } from '@/core';
import { SearchResultCard } from './SearchResultCard';
import type { SearchContentProps } from './types';

export function SearchContent({
  query,
  onQueryChange,
  onClear,
  results,
  onSelect,
}: SearchContentProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <Stack className="flex-1">
        {/* Search Input */}
        <View className="px-6 pb-2 pt-4">
          <View className="relative">
            <View className="absolute bottom-0 left-4 top-0 z-10 justify-center">
              <Search size={20} className="text-muted-foreground" />
            </View>
            <Input
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search pages, users, files..."
              className="h-12 pl-12 pr-12 text-base"
              autoFocus
            />
            {query.length > 0 && (
              <View className="absolute bottom-0 right-4 top-0 justify-center">
                <Pressable
                  onPress={onClear}
                  className="h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <X size={14} className="text-muted-foreground" />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Results */}
        {results.length > 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}>
            <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Results ({results.length})
            </Text>
            <Stack className="gap-2">
              {results.map((result) => (
                <SearchResultCard key={result.id} result={result} onSelect={onSelect} />
              ))}
            </Stack>
          </ScrollView>
        ) : query.length > 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-muted-foreground">No results found for "{query}"</Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <Search size={40} className="mb-4 text-muted-foreground/30" />
            <Text className="text-center text-muted-foreground">Start typing to search...</Text>
          </View>
        )}
      </Stack>
    </KeyboardAvoidingView>
  );
}

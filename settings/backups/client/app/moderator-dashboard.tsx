import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ban, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  getModerationQueue,
  reviewContent,
  getModerationStats,
  getAccuracyDrift,
  getModerationConfig,
  updateModerationConfig,
  ModerationQueueItem,
  ModerationStats,
  AccuracyDrift,
  ModerationConfig,
} from '@/lib/api/interactions';

export default function ModeratorDashboard() {
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'config'>('queue');
  const [queueStatus, setQueueStatus] = useState<'pending' | 'reviewed'>('pending');
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [drift, setDrift] = useState<AccuracyDrift | null>(null);
  const [_config, _setConfig] = useState<ModerationConfig | null>(null);
  const [selectedContentType, setSelectedContentType] = useState('comment');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Review form state
  const [_reviewingItem, _setReviewingItem] = useState<ModerationQueueItem | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  // Config form state
  const [configForm, setConfigForm] = useState({
    auto_remove_threshold: 95,
    review_threshold: 70,
    auto_approve: true,
  });

  useEffect(() => {
    loadData();
  }, [activeTab, queueStatus, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'queue') {
        const response = await getModerationQueue(queueStatus, 20, page);
        setQueue((prev) => (page === 1 ? response.data : [...prev, ...response.data]));
        setHasMore(response.meta.page < response.meta.pages);
      } else if (activeTab === 'stats') {
        const [statsData, driftData] = await Promise.all([
          getModerationStats(30),
          getAccuracyDrift(30, 5),
        ]);
        setStats(statsData);
        setDrift(driftData);
      } else if (activeTab === 'config') {
        const configData = await getModerationConfig(selectedContentType);
        _setConfig(configData);
        setConfigForm({
          auto_remove_threshold: configData.auto_remove_threshold,
          review_threshold: configData.review_threshold,
          auto_approve: configData.auto_approve,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadData();
    setRefreshing(false);
  };

  const handleReview = async (
    item: ModerationQueueItem,
    action: 'approve' | 'remove' | 'warn' | 'ban'
  ) => {
    _setReviewingItem(item);
    const actionMessages = {
      approve: 'Approve this content?',
      remove: 'Remove this content?',
      warn: 'Approve with warning to user?',
      ban: 'Remove content and ban user?',
    };

    Alert.alert('Confirm Action', actionMessages[action], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: action === 'ban' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await reviewContent(item.id, action, reviewReason || undefined);
            Alert.alert('Success', `Content ${action}d successfully`);
            setReviewReason('');
            _setReviewingItem(null);
            handleRefresh();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to review content');
          }
        },
      },
    ]);
  };

  const handleSaveConfig = async () => {
    try {
      await updateModerationConfig(selectedContentType, configForm);
      Alert.alert('Success', 'Configuration updated successfully');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update configuration');
    }
  };

  const renderQueueItem = (item: ModerationQueueItem) => {
    // Optimized with useMemo (Phase 7, T113) - expensive sort operation
    const topCategories = React.useMemo(() => {
      const categoryEntries = Object.entries(item.ai_categories);
      return categoryEntries.sort(([, a], [, b]) => b - a).slice(0, 3);
    }, [item.ai_categories]);

    return (
      <View
        key={item.id}
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: item.confidence_score > 95 ? '#DC3545' : '#FFA500',
        }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>
              {item.content_type.toUpperCase()} #{item.content_id}
            </Text>
            <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              Flagged {format(new Date(item.flagged_at), 'MMM d, yyyy HH:mm')}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: item.confidence_score > 95 ? '#DC354520' : '#FFA50020',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: item.confidence_score > 95 ? '#DC3545' : '#FFA500',
              }}>
              {item.confidence_score.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Content */}
        <View
          style={{
            backgroundColor: '#F9F9F9',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}>
          <Text style={{ fontSize: 14, color: '#333', lineHeight: 20 }}>
            {item.content.content || 'No content'}
          </Text>
        </View>

        {/* AI Categories */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {topCategories.map(([category, score]) => (
            <View
              key={category}
              style={{
                backgroundColor: '#007AFF20',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
              }}>
              <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '600' }}>
                {category}: {(score * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        {!item.reviewed_at && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleReview(item, 'approve')}
              style={{
                flex: 1,
                backgroundColor: '#28A745',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReview(item, 'warn')}
              style={{
                flex: 1,
                backgroundColor: '#FFC107',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Warn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReview(item, 'remove')}
              style={{
                flex: 1,
                backgroundColor: '#DC3545',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Remove</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReview(item, 'ban')}
              style={{
                backgroundColor: '#6C757D',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Ban size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Reviewed Status */}
        {item.reviewed_at && (
          <View
            style={{
              backgroundColor: '#E9ECEF',
              padding: 12,
              borderRadius: 8,
            }}>
            <Text style={{ fontSize: 13, color: '#666' }}>
              Reviewed by {item.reviewer?.name || 'Unknown'} on{' '}
              {format(new Date(item.reviewed_at), 'MMM d, yyyy HH:mm')}
            </Text>
            {item.review_reason && (
              <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                Reason: {item.review_reason}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Drift Alert */}
        {drift?.drift_detected && (
          <View
            style={{
              backgroundColor: '#DC354520',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#DC3545',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <AlertTriangle size={24} color="#DC3545" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#DC3545', marginLeft: 8 }}>
                Accuracy Drift Detected!
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              AI moderation accuracy has drifted by {drift.drift_percentage.toFixed(1)}% (threshold:{' '}
              {drift.threshold}%)
            </Text>
            <Text style={{ fontSize: 13, color: '#666' }}>
              AI Accuracy: {drift.ai_accuracy.toFixed(1)}% | Disagreements: {drift.disagreements} /{' '}
              {drift.total_reviewed}
            </Text>
          </View>
        )}

        {/* Overview Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
            }}>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Total Flagged</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#333' }}>
              {stats.total_flagged.toLocaleString()}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
            }}>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Pending Review</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFA500' }}>
              {stats.pending_review.toLocaleString()}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
            }}>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Approval Rate</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#28A745' }}>
              {stats.approval_rate.toFixed(1)}%
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
            }}>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Avg Review Time</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#007AFF' }}>
              {stats.avg_review_time_minutes.toFixed(1)}m
            </Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            Moderation Breakdown
          </Text>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Auto-Approved</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#28A745' }}>
                {stats.auto_approved_count.toLocaleString()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Auto-Rejected</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC3545' }}>
                {stats.auto_rejected_count.toLocaleString()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Manual Approved</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#28A745' }}>
                {stats.manual_approved_count.toLocaleString()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Manual Rejected</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC3545' }}>
                {stats.manual_rejected_count.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            Flagged by Category
          </Text>

          <View style={{ gap: 12 }}>
            {Object.entries(stats.flagged_by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <View key={category}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}>
                    <Text style={{ fontSize: 13, color: '#666' }}>{category}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>
                      {count.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E9ECEF', borderRadius: 3 }}>
                    <View
                      style={{
                        height: 6,
                        backgroundColor: '#007AFF',
                        borderRadius: 3,
                        width: `${(count / stats.total_flagged) * 100}%`,
                      }}
                    />
                  </View>
                </View>
              ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderConfig = () => {
    return (
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Content Type Selector */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Content Type</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['comment', 'post', 'review'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedContentType(type)}
                style={{
                  flex: 1,
                  backgroundColor: selectedContentType === type ? '#007AFF' : '#F5F5F5',
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: selectedContentType === type ? 'white' : '#666',
                  }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Thresholds */}
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 16 }}>
            Moderation Thresholds
          </Text>

          <View style={{ gap: 20 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                Auto-Remove Threshold: {configForm.auto_remove_threshold}%
              </Text>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                Content with confidence above this will be automatically rejected
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                }}
                value={configForm.auto_remove_threshold.toString()}
                onChangeText={(text) =>
                  setConfigForm({
                    ...configForm,
                    auto_remove_threshold: parseFloat(text) || 0,
                  })
                }
                keyboardType="numeric"
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                Review Threshold: {configForm.review_threshold}%
              </Text>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                Content with confidence above this will be flagged for human review
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                }}
                value={configForm.review_threshold.toString()}
                onChangeText={(text) =>
                  setConfigForm({
                    ...configForm,
                    review_threshold: parseFloat(text) || 0,
                  })
                }
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              onPress={() =>
                setConfigForm({ ...configForm, auto_approve: !configForm.auto_approve })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                backgroundColor: '#F9F9F9',
                borderRadius: 8,
              }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  Auto-Approve
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  Automatically approve content below review threshold
                </Text>
              </View>
              <View
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: configForm.auto_approve ? '#28A745' : '#CCC',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'white',
                    alignSelf: configForm.auto_approve ? 'flex-end' : 'flex-start',
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSaveConfig}
            style={{
              backgroundColor: '#007AFF',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 20,
            }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              Save Configuration
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: 'white',
          paddingTop: 60,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
        }}>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>
          Moderator Dashboard
        </Text>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { key: 'queue', label: 'Queue', icon: 'list' },
            { key: 'stats', label: 'Statistics', icon: 'stats-chart' },
            { key: 'config', label: 'Configuration', icon: 'settings' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key as any);
                setPage(1);
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === tab.key ? '#007AFF' : '#F5F5F5',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}>
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? 'white' : '#666'}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: activeTab === tab.key ? 'white' : '#666',
                  marginLeft: 6,
                }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Queue Status Filter */}
        {activeTab === 'queue' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[
              { key: 'pending', label: 'Pending' },
              { key: 'reviewed', label: 'Reviewed' },
            ].map((status) => (
              <TouchableOpacity
                key={status.key}
                onPress={() => {
                  setQueueStatus(status.key as any);
                  setPage(1);
                }}
                style={{
                  flex: 1,
                  backgroundColor: queueStatus === status.key ? '#FFA500' : '#F5F5F5',
                  paddingVertical: 8,
                  borderRadius: 6,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: queueStatus === status.key ? 'white' : '#666',
                  }}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, padding: 16 }}>
        {activeTab === 'queue' && (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
            {loading && queue.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ fontSize: 14, color: '#666', marginTop: 12 }}>Loading queue...</Text>
              </View>
            ) : queue.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <CheckCircle size={64} color="#28A745" />
                <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16 }}>All Clear!</Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                  No items in the {queueStatus} queue
                </Text>
              </View>
            ) : (
              <>
                {queue.map(renderQueueItem)}
                {hasMore && !loading && (
                  <TouchableOpacity
                    onPress={() => setPage((p) => p + 1)}
                    style={{
                      backgroundColor: 'white',
                      paddingVertical: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}>
                    <Text style={{ color: '#007AFF', fontWeight: '600' }}>Load More</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        )}

        {activeTab === 'stats' && renderStats()}
        {activeTab === 'config' && renderConfig()}
      </View>
    </View>
  );
}

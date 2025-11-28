import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { adminService } from '@/core';
import { Shield, Key, FileText, BarChart3, RefreshCw } from 'lucide-react-native';
import { cn } from '@/core';

import { AdminStats, EncryptionKey, AuditLogEntry } from './types';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, keysData, auditData] = await Promise.all([
        adminService.getStats(),
        adminService.listKeys(),
        adminService.getAuditLog(),
      ]);

      setStats(statsData);
      setKeys(keysData);
      setAuditLog(auditData.slice(0, 5)); // Show only recent 5
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateDEK = async () => {
    try {
      setActionLoading(true);
      await adminService.rotateDEK();
      await loadDashboard(); // Reload to show new key
    } catch (err) {
      console.error('Failed to rotate DEK:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading admin dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-6">
        <Text className="text-base text-destructive text-center mb-4">{error}</Text>
        <Pressable className="bg-primary px-6 py-3 rounded-lg" onPress={loadDashboard}>
          <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-card px-5 py-5 border-b border-border">
        <View className="flex-row items-center">
          <Shield size={32} className="text-primary" />
          <View className="ml-4">
            <Text className="text-2xl font-bold text-foreground">Admin Dashboard</Text>
            <Text className="text-sm text-muted-foreground mt-0.5">KMS Management</Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View className="flex-row p-4 gap-3">
          <View className="flex-1 bg-card rounded-xl p-4 items-center shadow-sm">
            <Key size={24} className="text-emerald-500" />
            <Text className="text-2xl font-bold text-foreground mt-2">{stats.totalKeys || 0}</Text>
            <Text className="text-xs text-muted-foreground mt-1">Total Keys</Text>
          </View>

          <View className="flex-1 bg-card rounded-xl p-4 items-center shadow-sm">
            <Shield size={24} className="text-primary" />
            <Text className="text-2xl font-bold text-foreground mt-2">{stats.activeKeys || 0}</Text>
            <Text className="text-xs text-muted-foreground mt-1">Active Keys</Text>
          </View>

          <View className="flex-1 bg-card rounded-xl p-4 items-center shadow-sm">
            <BarChart3 size={24} className="text-amber-500" />
            <Text className="text-2xl font-bold text-foreground mt-2">{stats.rotations || 0}</Text>
            <Text className="text-xs text-muted-foreground mt-1">Rotations</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View className="p-4">
        <Text className="text-lg font-semibold text-foreground mb-4">Actions</Text>
        
        <Pressable
          className={cn(
            "flex-row items-center justify-center bg-primary py-3.5 rounded-lg gap-2",
            actionLoading && "opacity-60"
          )}
          onPress={handleRotateDEK}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <RefreshCw size={20} className="text-primary-foreground" />
              <Text className="text-base font-semibold text-primary-foreground">Rotate DEK</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Encryption Keys */}
      <View className="p-4">
        <Text className="text-lg font-semibold text-foreground mb-4">Encryption Keys</Text>
        
        {keys.length === 0 ? (
          <Text className="text-sm text-muted-foreground italic">No keys found</Text>
        ) : (
          keys.map((key, index) => (
            <View key={index} className="bg-card rounded-xl p-4 mb-3 border border-border">
              <View className="flex-row items-center mb-3 gap-2">
                <Key size={20} className="text-primary" />
                <Text className="text-base font-semibold text-foreground flex-1">
                  Version {key.version || index + 1}
                </Text>
                <View className={cn(
                  "px-2 py-1 rounded-full",
                  key.status === 'active' ? "bg-emerald-100 dark:bg-emerald-900/30" : 
                  key.status === 'rotated' ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"
                )}>
                  <Text className={cn(
                    "text-[10px] font-bold uppercase",
                    key.status === 'active' ? "text-emerald-800 dark:text-emerald-300" : 
                    key.status === 'rotated' ? "text-red-800 dark:text-red-300" : "text-muted-foreground"
                  )}>
                    {key.status || 'active'}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row mb-1">
                <Text className="text-sm text-muted-foreground w-24">Algorithm:</Text>
                <Text className="text-sm font-medium text-foreground">{key.algorithm || 'AES-256-GCM'}</Text>
              </View>

              {key.createdAt && (
                <View className="flex-row">
                  <Text className="text-sm text-muted-foreground w-24">Created:</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Audit Log */}
      <View className="p-4 pb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-semibold text-foreground">Recent Audit Log</Text>
          <FileText size={20} className="text-muted-foreground" />
        </View>

        {auditLog.length === 0 ? (
          <Text className="text-sm text-muted-foreground italic">No audit entries</Text>
        ) : (
          auditLog.map((entry, index) => (
            <View key={index} className="flex-row items-start mb-4">
              <View className="w-2 h-2 rounded-full bg-primary mt-1.5 mr-3" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground mb-0.5">
                  {entry.action || 'Key operation'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Recent'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

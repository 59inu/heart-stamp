/**
 * 네트워크 상태 감지 훅
 * @react-native-community/netinfo를 사용하여 온라인/오프라인 상태 감지
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

export interface NetworkStatus {
  isConnected: boolean | null;  // null은 아직 상태를 알 수 없음을 의미
  isInternetReachable: boolean | null;
  type: string | null;
  details: any;
}

/**
 * 네트워크 상태를 감지하는 React 훅
 *
 * @returns {NetworkStatus} 현재 네트워크 상태
 *
 * @example
 * ```tsx
 * const { isConnected, isInternetReachable } = useNetworkStatus();
 *
 * if (!isConnected) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    type: null,
    details: null,
  });

  useEffect(() => {
    // 초기 상태 가져오기
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
      });
    });

    // 네트워크 상태 변경 리스너 등록
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      logger.log(`📡 [useNetworkStatus] Network state changed:`, {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });

      setNetworkStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
      });
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}

/**
 * 간단한 온라인/오프라인 상태만 필요한 경우 사용하는 훅
 *
 * @returns {boolean} true면 온라인, false면 오프라인
 *
 * @example
 * ```tsx
 * const isOnline = useIsOnline();
 *
 * if (!isOnline) {
 *   Toast.show({ type: 'error', text1: '오프라인 상태예요' });
 * }
 * ```
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus();

  // null (아직 상태를 모름)인 경우 일단 온라인으로 간주
  // 사용자 경험을 위해 낙관적으로 처리
  return isConnected !== false;
}

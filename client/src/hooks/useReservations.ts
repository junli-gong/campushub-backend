import { useCallback, useState } from 'react';
import {
  cancelReservation,
  fetchResources,
  fetchUserReservations,
  type Reservation,
  type Resource,
} from '../api/campushubApi';
import { useAsyncList } from './useAsyncList';
import { useReservationMutation } from './useReservationMutation';
interface ReservationsOptions {
  userId: string;
  revision: number;
  onBusyChange: (busy: boolean) => void;
}
interface ReservationsState {
  active: Reservation[];
  names: Map<string, string>;
  isLoading: boolean;
  error: string;
  pendingId: string;
  mutationError: string;
  success: string;
  refresh: () => void;
  cancel: (id: string) => Promise<void>;
}
export function useReservations({
  userId,
  revision,
  onBusyChange,
}: ReservationsOptions): ReservationsState {
  const [refreshCount, setRefreshCount] = useState(0);
  const load = useCallback(
    (): Promise<Reservation[]> => fetchUserReservations(userId),
    [userId],
  );
  const { data, isLoading, error } = useAsyncList(
    load,
    revision + refreshCount,
  );
  // Names are optional labels; an out-of-service resource still displays its ID.
  const loadResources = useCallback(
    (): Promise<Resource[]> => fetchResources(),
    [],
  );
  const resources = useAsyncList(loadResources, 0);
  const names = new Map(
    resources.data.map((resource: Resource): [string, string] => [
      resource.id,
      resource.name,
    ]),
  );
  const mutation = useReservationMutation({
    execute: cancelReservation,
    successMessage: 'Reservation cancelled. The time slot is available again.',
    onBusyChange,
  });
  function refresh(): void {
    setRefreshCount((value: number): number => value + 1);
  }
  async function cancel(id: string): Promise<void> {
    if (await mutation.run(id)) refresh();
  }
  return {
    active: data.filter(
      (booking: Reservation): boolean => booking.status !== 'CANCELLED',
    ),
    names,
    isLoading,
    error,
    pendingId: mutation.pending ?? '',
    mutationError: mutation.error,
    success: mutation.success,
    refresh,
    cancel,
  };
}

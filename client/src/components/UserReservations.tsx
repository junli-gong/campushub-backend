import { useCallback, useRef, useState, type ReactElement } from 'react';
import {
  cancelReservation,
  errorMessage,
  fetchUserReservations,
  type Reservation,
} from '../api/campushubApi';
import { useAsyncList } from '../hooks/useAsyncList';
import styles from '../App.module.css';
interface UserReservationsProps {
  userId: string;
  revision: number;
  onBusyChange: (busy: boolean) => void;
}
export function UserReservations({
  userId,
  revision,
  onBusyChange,
}: UserReservationsProps): ReactElement {
  const [refresh, setRefresh] = useState(0);
  const [pendingId, setPendingId] = useState('');
  const [mutationError, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(false);
  const load = useCallback(
    (): Promise<Reservation[]> => fetchUserReservations(userId),
    [userId],
  );
  const { data, isLoading, error } = useAsyncList(load, revision + refresh);
  const active = data.filter(
    (booking: Reservation): boolean => booking.status !== 'CANCELLED',
  );
  async function cancel(id: string): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    setPendingId(id);
    setError('');
    setSuccess('');
    onBusyChange(true);
    try {
      await cancelReservation(id);
      setSuccess('Reservation cancelled. The time slot is available again.');
      setRefresh((value: number): number => value + 1);
    } catch (failure: unknown) {
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setPendingId('');
      onBusyChange(false);
    }
  }
  return (
    <section
      id="my-bookings"
      className={styles.bookings}
      aria-labelledby="bookings-title"
    >
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>03 / YOUR PLANS</p>
          <h2 id="bookings-title">
            My Bookings{' '}
            {!isLoading && !error && (
              <span className={styles.count}>{active.length}</span>
            )}
          </h2>
        </div>
        <button
          type="button"
          disabled={isLoading || !!pendingId}
          onClick={(): void => setRefresh(refresh + 1)}
        >
          Refresh
        </button>
      </div>
      <p className={styles.muted}>
        Active reservations for <strong>{userId}</strong>. All times shown in
        your local timezone.
      </p>
      {isLoading && (
        <p role="status" className={styles.empty}>
          Loading your bookings…
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error} Use Refresh to try again.
        </p>
      )}
      {mutationError && (
        <p role="alert" className={styles.error}>
          {mutationError}
        </p>
      )}
      {success && (
        <p role="status" className={styles.success}>
          {success}
        </p>
      )}
      {!isLoading && !error && active.length === 0 && (
        <div className={styles.empty}>
          <strong>Your next plan starts here.</strong>
          <p>No active bookings yet. Choose a resource above to get started.</p>
        </div>
      )}
      {!isLoading &&
        !error &&
        active.map((booking: Reservation): ReactElement => (
          <article className={styles.bookingRow} key={booking.id}>
            <div>
              <span className={styles.status}>{booking.status}</span>
              <h3>{booking.resourceId}</h3>
              <p>
                {new Date(booking.startTime).toLocaleString()} –{' '}
                {new Date(booking.endTime).toLocaleString()}
              </p>
              <small className={styles.muted}>Booking {booking.id}</small>
            </div>
            <button
              type="button"
              disabled={!!pendingId}
              onClick={(): void => {
                void cancel(booking.id);
              }}
            >
              {pendingId === booking.id ? 'Cancelling…' : 'Cancel reservation'}
            </button>
          </article>
        ))}
    </section>
  );
}

import type { ReactElement } from 'react';
import type { Reservation } from '../api/campushubApi';
import { useReservations } from '../hooks/useReservations';
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
  const {
    active,
    names,
    isLoading,
    error,
    pendingId,
    mutationError,
    success,
    refresh,
    cancel,
  } = useReservations({ userId, revision, onBusyChange });
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
          onClick={refresh}
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
              <h3>{names.get(booking.resourceId) ?? booking.resourceId}</h3>
              <p>
                {new Date(booking.startTime).toLocaleString()} –{' '}
                {new Date(booking.endTime).toLocaleString()}
              </p>
              <small className={styles.muted}>
                {booking.resourceId} · Booking {booking.id}
              </small>
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

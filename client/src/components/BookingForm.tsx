import type { FormEvent, ReactElement } from 'react';
import type { Resource } from '../api/campushubApi';
import { useBooking } from '../hooks/useBooking';
import styles from '../App.module.css';
interface BookingFormProps {
  resource: Resource | null;
  userId: string;
  onCreated: () => void;
  onBusyChange: (busy: boolean) => void;
}
export function BookingForm({
  resource,
  userId,
  onCreated,
  onBusyChange,
}: BookingFormProps): ReactElement {
  const {
    start,
    end,
    changeStart,
    changeEnd,
    submit,
    isLoading,
    error,
    success,
  } = useBooking({ resource, userId, onCreated, onBusyChange });
  return (
    <section className={styles.bookingPanel} aria-labelledby="booking-title">
      <p className={styles.eyebrow}>02 / MAKE IT YOURS</p>
      <h2 id="booking-title">Reserve a moment.</h2>
      <p className={styles.muted}>
        A place to focus. A tool to build. Time for what matters.
      </p>
      <div className={styles.chosen}>
        <span className={styles.eyebrow}>YOUR RESOURCE</span>
        <strong>{resource?.name ?? 'Choose a resource to begin'}</strong>
        <span>{resource?.location ?? 'Select a card from the directory.'}</span>
      </div>
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>): void => {
          event.preventDefault();
          void submit();
        }}
        aria-busy={isLoading}
      >
        <fieldset disabled={isLoading || !resource} className={styles.fieldset}>
          <label htmlFor="start-time">Start time</label>
          <input
            id="start-time"
            type="datetime-local"
            required
            value={start}
            onChange={(event): void => {
              changeStart(event.target.value);
            }}
          />
          <label htmlFor="end-time">End time</label>
          <input
            id="end-time"
            type="datetime-local"
            required
            value={end}
            onChange={(event): void => {
              changeEnd(event.target.value);
            }}
          />
          <p className={styles.note}>
            Times are in {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
          <button className={styles.primary} type="submit">
            {isLoading ? 'Reserving…' : 'Create reservation'}{' '}
            <span aria-hidden="true">→</span>
          </button>
        </fieldset>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className={styles.success} role="status">
            {success}
          </p>
        )}
      </form>
      <p className={styles.note}>
        Plans changed? Cancel anytime from My Bookings.
      </p>
    </section>
  );
}

import { useRef, useState, type FormEvent, type ReactElement } from 'react';
import {
  createReservation,
  errorMessage,
  type Resource,
} from '../api/campushubApi';
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
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    setSuccess('');
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!resource) {
      setError('Choose a resource from the directory first.');
      return;
    }
    if (
      !start ||
      !end ||
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      endDate <= startDate
    ) {
      setError('Choose valid times with the end later than the start.');
      return;
    }
    pending.current = true;
    setLoading(true);
    onBusyChange(true);
    try {
      await createReservation({
        resourceId: resource.id,
        userId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });
      setSuccess('Reservation created. You can find it in My Bookings.');
      onCreated();
    } catch (failure: unknown) {
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setLoading(false);
      onBusyChange(false);
    }
  }
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
          void submit(event);
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
              setStart(event.target.value);
              setError('');
              setSuccess('');
            }}
          />
          <label htmlFor="end-time">End time</label>
          <input
            id="end-time"
            type="datetime-local"
            required
            value={end}
            onChange={(event): void => {
              setEnd(event.target.value);
              setError('');
              setSuccess('');
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

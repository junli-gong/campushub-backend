import { useState, type FormEvent, type ReactElement } from 'react';
import type { Resource } from './api/campushubApi';
import { ResourceList } from './components/ResourceList';
import { BookingForm } from './components/BookingForm';
import { UserReservations } from './components/UserReservations';
import styles from './App.module.css';
interface WorkspaceProps {
  userId: string;
  onBusyChange: (busy: boolean) => void;
}
function Workspace({ userId, onBusyChange }: WorkspaceProps): ReactElement {
  const [selected, setSelected] = useState<Resource | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  function bookingBusy(value: boolean): void {
    setBusy(value);
    onBusyChange(value);
  }
  return (
    <>
      <div className={styles.workspace}>
        <ResourceList
          selectedId={selected?.id}
          disabled={busy}
          onSelect={setSelected}
        />
        <BookingForm
          key={selected?.id ?? 'none'}
          resource={selected}
          userId={userId}
          onCreated={(): void => setRevision(revision + 1)}
          onBusyChange={bookingBusy}
        />
      </div>
      <UserReservations
        userId={userId}
        revision={revision}
        onBusyChange={onBusyChange}
      />
    </>
  );
}
export function App(): ReactElement {
  const [userId, setUserId] = useState('user-456');
  const [draft, setDraft] = useState('user-456');
  const [error, setError] = useState('');
  const [busyCount, setBusyCount] = useState(0);
  function busy(value: boolean): void {
    setBusyCount((count: number): number =>
      Math.max(0, count + (value ? 1 : -1)),
    );
  }
  function switchStudent(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(draft)) {
      setError(
        'Use 1–64 letters, digits, underscores or hyphens; start with a letter or digit.',
      );
      return;
    }
    setError('');
    setUserId(draft);
  }
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="#">
          <span className={styles.brandMark} aria-hidden="true">
            C
          </span>
          CampusHub
          <span className={styles.brandSuffix}> / campus life, connected</span>
        </a>
        <a className={styles.navLink} href="#my-bookings">
          My Bookings ↗
        </a>
      </header>
      <main>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>MORE SPACE FOR WHAT’S NEXT</p>
            <h1>
              Your campus.
              <br />
              <em>Your possibilities.</em>
            </h1>
            <p>
              Find a quiet corner, bring an idea to life, or make room for
              collaboration. Your next great session starts here.
            </p>
          </div>
          <aside className={styles.student}>
            <p className={styles.eyebrow}>YOUR CAMPUS PASS</p>
            <h2>Welcome, student.</h2>
            <form onSubmit={switchStudent}>
              <label htmlFor="student-id">Student ID</label>
              <div className={styles.studentControls}>
                <input
                  id="student-id"
                  required
                  maxLength={64}
                  value={draft}
                  disabled={busyCount > 0}
                  onChange={(event): void => setDraft(event.target.value)}
                />
                <button type="submit" disabled={busyCount > 0}>
                  Apply
                </button>
              </div>
            </form>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <p className={styles.note}>
              Demo session · No sign-in required.
              <br />
              Current student: <strong>{userId}</strong>
            </p>
          </aside>
        </section>
        <Workspace key={userId} userId={userId} onBusyChange={busy} />
      </main>
      <footer className={styles.footer}>
        <span>CampusHub</span>
        <span>Find your focus. Make your mark.</span>
        <span>CS 5500</span>
      </footer>
    </div>
  );
}

import { useState, type ReactElement } from 'react';
import type { Resource } from '../api/campushubApi';
import { ResourceList } from './ResourceList';
import { BookingForm } from './BookingForm';
import { UserReservations } from './UserReservations';
import styles from '../App.module.css';
interface WorkspaceProps {
  userId: string;
  onBusyChange: (busy: boolean) => void;
}
export function Workspace({
  userId,
  onBusyChange,
}: WorkspaceProps): ReactElement {
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

import { useCallback, useState, type ReactElement } from 'react';
import { fetchResources, type Resource } from '../api/campushubApi';
import { useAsyncList } from '../hooks/useAsyncList';
import styles from '../App.module.css';
interface ResourceListProps {
  selectedId: string | undefined;
  disabled: boolean;
  onSelect: (resource: Resource) => void;
}
const filters = [
  { value: '', label: 'All resources' },
  { value: 'ROOM', label: 'Study rooms' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'LAB', label: 'Labs' },
];
export function ResourceList({
  selectedId,
  disabled,
  onSelect,
}: ResourceListProps): ReactElement {
  const [type, setType] = useState('');
  const [revision, setRevision] = useState(0);
  const load = useCallback(
    (): Promise<Resource[]> => fetchResources(type || undefined),
    [type],
  );
  const { data, isLoading, error } = useAsyncList(load, revision);
  return (
    <section aria-labelledby="directory-title" className={styles.directory}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>01 / EXPLORE</p>
          <h2 id="directory-title">Find your space</h2>
        </div>
        <span className={styles.muted}>Built for your next big idea.</span>
      </div>
      <div className={styles.filters} aria-label="Filter by resource type">
        {filters.map((filter): ReactElement => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={type === filter.value}
            onClick={(): void => setType(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {isLoading && (
        <p role="status" className={styles.empty}>
          Finding campus resources…
        </p>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          {error}{' '}
          <button type="button" onClick={(): void => setRevision(revision + 1)}>
            Try again
          </button>
        </div>
      )}
      {!isLoading && !error && data.length === 0 && (
        <p className={styles.empty}>
          No resources in this category. Try another filter.
        </p>
      )}
      <div className={styles.resourceGrid}>
        {!isLoading &&
          !error &&
          data.map((resource: Resource): ReactElement => (
            <article
              key={resource.id}
              className={`${styles.resourceCard} ${selectedId === resource.id ? styles.selected : ''}`}
            >
              <div
                className={styles.cardArt}
                data-kind={resource.type}
                aria-hidden="true"
              >
                <span>
                  {resource.type === 'ROOM'
                    ? '01'
                    : resource.type === 'EQUIPMENT'
                      ? '02'
                      : '03'}
                </span>
                <div className={styles.geometry} />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span>{resource.type}</span>
                  <span className={styles.available}>Open for booking</span>
                </div>
                <h3>{resource.name}</h3>
                <p className={styles.location}>{resource.location}</p>
                <button
                  type="button"
                  className={styles.selectButton}
                  disabled={disabled}
                  aria-pressed={selectedId === resource.id}
                  onClick={(): void => onSelect(resource)}
                >
                  {selectedId === resource.id ? 'Selected' : 'Reserve resource'}{' '}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          ))}
      </div>
      <p className={styles.note}>
        Open for booking means the resource is in service. Your selected time is
        checked when you reserve.
      </p>
    </section>
  );
}

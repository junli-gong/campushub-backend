import { useEffect, useState } from 'react';
import { errorMessage } from '../api/campushubApi';
interface ListState<T> {
  data: T[];
  isLoading: boolean;
  error: string;
}
export function useAsyncList<T>(
  load: () => Promise<T[]>,
  revision: number,
): ListState<T> {
  const [state, setState] = useState<ListState<T>>({
    data: [],
    isLoading: true,
    error: '',
  });
  useEffect((): (() => void) => {
    let active = true;
    setState({ data: [], isLoading: true, error: '' });
    void load()
      .then((data: T[]): void => {
        if (active) setState({ data, isLoading: false, error: '' });
      })
      .catch((error: unknown): void => {
        if (active)
          setState({ data: [], isLoading: false, error: errorMessage(error) });
      });
    return (): void => {
      active = false;
    };
  }, [load, revision]);
  return state;
}

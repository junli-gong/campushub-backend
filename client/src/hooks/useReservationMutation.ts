import { useRef, useState } from 'react';
import { errorMessage } from '../api/campushubApi';
interface MutationState<T> {
  pending: T | null;
  error: string;
  success: string;
}
interface MutationOptions<T> {
  execute: (input: T) => Promise<unknown>;
  successMessage: string;
  onBusyChange: (busy: boolean) => void;
}
interface ReservationMutation<T> extends MutationState<T> {
  run: (input: T) => Promise<boolean>;
  clearFeedback: () => void;
  reject: (message: string) => void;
}
export function useReservationMutation<T>({
  execute,
  successMessage,
  onBusyChange,
}: MutationOptions<T>): ReservationMutation<T> {
  const locked = useRef(false);
  const [state, setState] = useState<MutationState<T>>({
    pending: null,
    error: '',
    success: '',
  });
  function clearFeedback(): void {
    setState((current: MutationState<T>): MutationState<T> => ({
      ...current,
      error: '',
      success: '',
    }));
  }
  function reject(message: string): void {
    setState((current: MutationState<T>): MutationState<T> => ({
      ...current,
      error: message,
      success: '',
    }));
  }
  async function run(input: T): Promise<boolean> {
    if (locked.current) return false;
    locked.current = true;
    setState({ pending: input, error: '', success: '' });
    onBusyChange(true);
    try {
      await execute(input);
      setState({ pending: null, error: '', success: successMessage });
      return true;
    } catch (failure: unknown) {
      setState({ pending: null, error: errorMessage(failure), success: '' });
      return false;
    } finally {
      locked.current = false;
      onBusyChange(false);
    }
  }
  return { ...state, run, clearFeedback, reject };
}

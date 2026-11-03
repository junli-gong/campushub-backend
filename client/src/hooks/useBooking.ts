import { useState } from 'react';
import { createReservation, type Resource } from '../api/campushubApi';
import { useReservationMutation } from './useReservationMutation';
interface BookingOptions {
  resource: Resource | null;
  userId: string;
  onCreated: () => void;
  onBusyChange: (busy: boolean) => void;
}
interface BookingState {
  start: string;
  end: string;
  isLoading: boolean;
  error: string;
  success: string;
  changeStart: (value: string) => void;
  changeEnd: (value: string) => void;
  submit: () => Promise<void>;
}
export function useBooking({
  resource,
  userId,
  onCreated,
  onBusyChange,
}: BookingOptions): BookingState {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const mutation = useReservationMutation({
    execute: createReservation,
    successMessage: 'Reservation created. You can find it in My Bookings.',
    onBusyChange,
  });
  function changeStart(value: string): void {
    setStart(value);
    mutation.clearFeedback();
  }
  function changeEnd(value: string): void {
    setEnd(value);
    mutation.clearFeedback();
  }
  async function submit(): Promise<void> {
    if (mutation.pending !== null) return;
    mutation.clearFeedback();
    if (!resource) {
      mutation.reject('Choose a resource from the directory first.');
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (
      !start ||
      !end ||
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      endDate <= startDate
    ) {
      mutation.reject('Choose valid times with the end later than the start.');
      return;
    }
    if (
      await mutation.run({
        resourceId: resource.id,
        userId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      })
    )
      onCreated();
  }
  return {
    start,
    end,
    changeStart,
    changeEnd,
    submit,
    isLoading: mutation.pending !== null,
    error: mutation.error,
    success: mutation.success,
  };
}

import { redirect } from 'next/navigation';

export default function Page() {
  // Server-side redirect to canonical game route. This returns a 307 and avoids client-side flicker.
  redirect('/play/game');
}

import type {Request, Send} from '../../desktop';
/** Getter inputs keep helper requests and translated feedback current after prop updates. */
export function createChange(send: () => Send, failure: () => string) {
 let pending = $state(false), error = $state('');
 return {
  get pending() { return pending; }, get error() { return error; },
  async change(request: Request) {
   pending = true; error = '';
   try { await send()(request); return true; }
   catch (e) { console.error('Settings change failed', e); error = failure(); return false; }
   finally { pending = false; }
  },
 };
}

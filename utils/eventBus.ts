// utils/eventBus.ts
const eventBus = {
  on(event: string, callback: (e: CustomEvent) => void) {
    document.addEventListener(event, callback as EventListener);
  },
  dispatch(event: string, data?: any) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  remove(event: string, callback: (e: CustomEvent) => void) {
    document.removeEventListener(event, callback as EventListener);
  },
};
export default eventBus;

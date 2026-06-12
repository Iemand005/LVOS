export {};

declare global {
    interface Window {
        __LVMessengerReceive: (type: MessageType, data: any, source: string) => void;
    }
}
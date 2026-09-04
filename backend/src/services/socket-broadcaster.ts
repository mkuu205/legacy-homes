type BillGeneratedPayload = {
  billId: string;
  billNumber: string;
};

type BillGeneratedBroadcaster = (residentId: string, payload: BillGeneratedPayload) => void;

let broadcaster: BillGeneratedBroadcaster = () => undefined;

export const configureSocketBroadcaster = (nextBroadcaster: BillGeneratedBroadcaster) => {
  broadcaster = nextBroadcaster;
};

export const broadcastBillGenerated = (residentId: string, payload: BillGeneratedPayload) => {
  broadcaster(residentId, payload);
};

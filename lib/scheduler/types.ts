export interface SlotCandidate {
  photographerId: string;
  photographerName: string;
  startAt: Date;
  endAt: Date;
  travelScore: number; // seconds — lower is better; 0 = stub/unknown
}

export interface SlotGeneratorOptions {
  packageId: string;
  address: string;
  windowDays?: number; // default 28
  stepMinutes?: number; // slot generation step, default 15
}

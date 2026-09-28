export type JobPrivateAddress = {
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  postcode: string;
  accessNotes: string;
};

export type JobPrivateDetails = JobPrivateAddress & {
  complete: boolean;
};

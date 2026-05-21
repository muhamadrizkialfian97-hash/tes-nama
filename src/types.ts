export interface NameLog {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  userPhoto?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | Date | any;
}

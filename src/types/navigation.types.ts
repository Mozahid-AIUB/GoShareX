export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
};

export type MainStackParamList = {
  BottomTabs: undefined;
  LiveMap: { destination: string; pickupPoint: string };
  RiderProfile: { riderId: string };
  Chat: { chatId: string; riderId: string };
  RideConfirmed: { rideId: string };
  RideActive: { rideId: string };
  RideComplete: { rideId: string };
  Suspension: undefined;
  Report: { reportedUserId: string };
};

export type BottomTabParamList = {
  Home: undefined;
  Board: undefined;
  Chats: undefined;
  Profile: undefined;
};

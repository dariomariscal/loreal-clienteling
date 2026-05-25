import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href={"/(auth)/sign-in" as never} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

import { Redirect } from "expo-router";

// Root entry: while auth is not wired, send everyone to sign-in.
// When auth lands, this becomes a conditional redirect based on session.
export default function Index() {
  return <Redirect href={"/(auth)/sign-in" as never} />;
}

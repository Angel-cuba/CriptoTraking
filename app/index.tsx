import { useAuth } from "@/src/hooks/useAuth";
import { Redirect } from "expo-router";

export default function IndexScreen() {
  const { session } = useAuth();
  return <Redirect href={session ? "/profile" : "/login"} />;
}

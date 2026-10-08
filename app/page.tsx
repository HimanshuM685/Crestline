import Workspace from "./components/workspace";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Workspace hasServerKey={Boolean(process.env.TINYFISH_API_KEY)} />;
}

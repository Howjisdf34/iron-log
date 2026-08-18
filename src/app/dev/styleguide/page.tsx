import { notFound } from "next/navigation";
import { StyleguideClient } from "./styleguide-client";

export const metadata = { title: "Styleguide — dev" };

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StyleguideClient />;
}

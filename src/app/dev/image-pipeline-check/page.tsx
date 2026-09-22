import { notFound } from "next/navigation";
import { ImagePipelineCheck } from "./test-client";

export const dynamic = "force-dynamic";

export default function ImagePipelineCheckPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ImagePipelineCheck />;
}

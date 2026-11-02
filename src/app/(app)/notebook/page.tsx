"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Notebook has been replaced by Your apps; old links go there.
export default function NotebookMoved() {
  const router = useRouter();
  useEffect(() => { router.replace("/apps"); }, [router]);
  return null;
}

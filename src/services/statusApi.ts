import { apiRequest } from "@/services/api";

export async function getStatus() {
  return apiRequest("/status");
}

export async function getDetections() {
  return apiRequest("/detections");
}

export async function getArmState() {
  return apiRequest("/arm");
}
